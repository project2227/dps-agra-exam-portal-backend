'use strict';
const express = require('express'),
  multer = require('multer');
const { z } = require('zod');
const db = require('../config/db');
const { asyncWrap, must } = require('../utils/http');
const auth = require('../platform/auth'),
  storage = require('../platform/storage');
const { currentTenant } = require('../platform/context');
const router = express.Router();
const id = z.string().uuid();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: storage.MAX_FILE, files: 1, fields: 2 },
});
async function member(actor, channelId) {
  const q = await db.query(
    'SELECT 1 FROM chat_members WHERE channel_id=$1 AND user_id=$2',
    [channelId, actor.id],
  );
  must(q.rowCount, 404, 'Channel not found.');
}
const room = (channelId) =>
  'tenant:' + currentTenant().id + ':chat:' + channelId;
let io;
function attachChat(instance) {
  io = instance;
}
router.use(auth.requireUser());
router.use((req, res, next) => {
  if (
    currentTenant().path !== 'workplace' ||
    !currentTenant().features.includes('chat')
  )
    return res.status(403).json({ error: 'Chat is not enabled on this site.' });
  next();
});
router.get(
  '/people',
  asyncWrap(async (req, res) => {
    res.json({
      people: (
        await db.query(
          'SELECT id,name FROM org_users WHERE active=true ORDER BY name LIMIT 1000',
        )
      ).rows,
    });
  }),
);
router.get(
  '/channels',
  asyncWrap(async (req, res) => {
    const q = await db.query(
      `SELECT c.*,count(msg.id) FILTER(WHERE msg.created_at>m.last_read_at AND msg.user_id<>$1)::int AS unread FROM chat_channels c JOIN chat_members m ON m.channel_id=c.id AND m.user_id=$1 LEFT JOIN chat_messages msg ON msg.channel_id=c.id GROUP BY c.id,m.last_read_at ORDER BY c.name`,
      [req.actor.id],
    );
    res.json({ channels: q.rows });
  }),
);
router.post(
  '/channels',
  asyncWrap(async (req, res) => {
    const v = z
      .object({
        name: z.string().trim().min(2).max(90),
        kind: z.enum(['channel', 'dm']).default('channel'),
        memberIds: z.array(id).min(1).max(100),
      })
      .strict()
      .parse(req.body);
    const members = [...new Set([req.actor.id, ...v.memberIds])];
    if (v.kind === 'dm')
      must(
        members.length === 2,
        400,
        'Choose one person for a direct message.',
      );
    else
      must(
        ['admin', 'manager'].includes(req.actor.role),
        403,
        'Ask a manager to create a team channel.',
      );
    must(
      (
        await db.query(
          'SELECT id FROM org_users WHERE id=ANY($1::uuid[]) AND active=true',
          [members],
        )
      ).rowCount === members.length,
      400,
      'Choose people in your organisation.',
    );
    const key = v.kind === 'dm' ? members.sort().join(':') : null;
    const channel = await db.transaction(async (c) => {
      const q = await c.query(
        'INSERT INTO chat_channels(name,kind,dm_key) VALUES($1,$2,$3) ON CONFLICT(tenant_id,dm_key) DO UPDATE SET dm_key=excluded.dm_key RETURNING *',
        [v.name, v.kind, key],
      );
      for (const user of members)
        await c.query(
          'INSERT INTO chat_members(channel_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [q.rows[0].id, user],
        );
      return q.rows[0];
    });
    res.status(201).json({ channel });
  }),
);
router.get(
  '/channels/:id/members',
  asyncWrap(async (req, res) => {
    const channel = id.parse(req.params.id);
    await member(req.actor, channel);
    res.json({
      members: (
        await db.query(
          'SELECT u.id,u.name,u.email FROM chat_members m JOIN org_users u ON u.id=m.user_id WHERE m.channel_id=$1 ORDER BY name',
          [channel],
        )
      ).rows,
    });
  }),
);
router.get(
  '/channels/:id/messages',
  asyncWrap(async (req, res) => {
    const channel = id.parse(req.params.id);
    await member(req.actor, channel);
    const search = String(req.query.search || '').slice(0, 200);
    const q = await db.query(
      `SELECT m.*,u.name,coalesce((SELECT jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'mimeType',f.mime_type,'sizeBytes',f.size_bytes,'pinned',f.pinned)) FROM tenant_files f WHERE f.message_id=m.id),'[]') AS files FROM chat_messages m JOIN org_users u ON u.id=m.user_id WHERE m.channel_id=$1 AND ($2='' OR m.body ILIKE '%'||$2||'%') ORDER BY m.created_at DESC LIMIT 100`,
      [channel, search],
    );
    res.json({ messages: q.rows.reverse() });
  }),
);
router.post(
  '/channels/:id/messages',
  asyncWrap(async (req, res) => {
    const channel = id.parse(req.params.id);
    await member(req.actor, channel);
    const v = z
      .object({
        body: z.string().trim().min(1).max(4000),
        mentions: z.array(id).max(30).default([]),
      })
      .strict()
      .parse(req.body);
    if (v.mentions.length)
      must(
        (
          await db.query(
            'SELECT user_id FROM chat_members WHERE channel_id=$1 AND user_id=ANY($2::uuid[])',
            [channel, v.mentions],
          )
        ).rowCount === new Set(v.mentions).size,
        400,
        'Mentions must belong to this channel.',
      );
    const q = await db.query(
      'INSERT INTO chat_messages(channel_id,user_id,body,mentions) VALUES($1,$2,$3,$4) RETURNING *',
      [channel, req.actor.id, v.body, JSON.stringify(v.mentions)],
    );
    const message = { ...q.rows[0], name: req.actor.name, files: [] };
    io?.to(room(channel)).emit('chat:message', { channelId: channel, message });
    res.status(201).json({ message });
  }),
);
router.post(
  '/channels/:id/read',
  asyncWrap(async (req, res) => {
    const channel = id.parse(req.params.id);
    await member(req.actor, channel);
    await db.query(
      'UPDATE chat_members SET last_read_at=now() WHERE channel_id=$1 AND user_id=$2',
      [channel, req.actor.id],
    );
    res.json({ read: true });
  }),
);
router.post(
  '/channels/:id/files',
  upload.single('file'),
  asyncWrap(async (req, res) => {
    const channel = id.parse(req.params.id);
    await member(req.actor, channel);
    must(req.file, 400, 'Choose a file to share.');
    const { name, type } = storage.allowedFile(req.file);
    const result = await db.transaction(async (c) => {
      await storage.reserve(c, req.file.buffer.length);
      const message = (
        await c.query(
          "INSERT INTO chat_messages(channel_id,user_id,body) VALUES($1,$2,'') RETURNING *",
          [channel, req.actor.id],
        )
      ).rows[0];
      const file = (
        await c.query(
          'INSERT INTO tenant_files(channel_id,message_id,uploaded_by,name,mime_type,size_bytes,file_bytes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,mime_type,size_bytes,pinned',
          [
            channel,
            message.id,
            req.actor.id,
            name,
            type,
            req.file.buffer.length,
            req.file.buffer,
          ],
        )
      ).rows[0];
      return {
        ...message,
        name: req.actor.name,
        files: [
          {
            id: file.id,
            name: file.name,
            mimeType: file.mime_type,
            sizeBytes: file.size_bytes,
            pinned: file.pinned,
          },
        ],
      };
    });
    io?.to(room(channel)).emit('chat:message', {
      channelId: channel,
      message: result,
    });
    res.status(201).json({ message: result });
  }),
);
router.patch(
  '/messages/:id/pin',
  asyncWrap(async (req, res) => {
    const msg = (
      await db.query('SELECT * FROM chat_messages WHERE id=$1', [
        id.parse(req.params.id),
      ])
    ).rows[0];
    must(msg, 404, 'Message not found.');
    await member(req.actor, msg.channel_id);
    const pinned = z.boolean().parse(req.body.pinned);
    await db.query('UPDATE chat_messages SET pinned=$2 WHERE id=$1', [
      msg.id,
      pinned,
    ]);
    io?.to(room(msg.channel_id)).emit('chat:pinned', {
      messageId: msg.id,
      pinned,
    });
    res.json({ updated: true });
  }),
);
async function fileAccess(req) {
  const file = (
    await db.query('SELECT * FROM tenant_files WHERE id=$1', [
      id.parse(req.params.id),
    ])
  ).rows[0];
  must(file?.channel_id, 404, 'File not found.');
  await member(req.actor, file.channel_id);
  return file;
}
router.patch(
  '/files/:id/pin',
  asyncWrap(async (req, res) => {
    const f = await fileAccess(req);
    await db.query('UPDATE tenant_files SET pinned=$2 WHERE id=$1', [
      f.id,
      z.boolean().parse(req.body.pinned),
    ]);
    res.json({ updated: true });
  }),
);
router.get(
  '/files/:id/link',
  asyncWrap(async (req, res) => {
    const f = await fileAccess(req);
    res.json({
      url:
        '/api/chat/files/' +
        f.id +
        '/download?signature=' +
        storage.downloadToken(req.actor, 'file', f.id),
      mimeType: f.mime_type,
      expiresIn: 60,
    });
  }),
);
router.get(
  '/files/:id/download',
  asyncWrap(async (req, res) => {
    const f = await fileAccess(req);
    must(
      storage.verifySignature(req.query.signature, req.actor, 'file', f.id),
      403,
      'This file link expired. Open it again.',
    );
    res
      .type(f.mime_type)
      .set('X-Content-Type-Options', 'nosniff')
      .set(
        'Content-Disposition',
        (req.query.preview === '1' &&
        /^(image\/|application\/pdf)/.test(f.mime_type)
          ? 'inline'
          : 'attachment') +
          '; filename="' +
          f.name.replace(/["\r\n]/g, '_') +
          '"',
      )
      .set('Cache-Control', 'private, no-store')
      .send(f.file_bytes);
  }),
);
module.exports = router;
module.exports.member = member;
module.exports.room = room;
module.exports.attachChat = attachChat;
