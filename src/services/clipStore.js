'use strict';
const db = require('../config/db');
const { must } = require('../utils/http');
const storage = require('../platform/storage');
// Both clients use the original ordered WebM chunk contract. Table names are
// compile-time adapters, never user input.
async function saveWorkChunk({ recordingId, sessionId, sequence, bytes }) {
  return db.transaction(async (c) => {
    const q = await c.query(
      'SELECT * FROM work_recordings WHERE id=$1 AND session_id=$2 AND expires_at>now() FOR UPDATE',
      [recordingId, sessionId],
    );
    must(q.rowCount, 404, 'Recording unavailable.');
    const row = q.rows[0];
    must(!row.ended_at, 409, 'Recording already finished.');
    if (
      (
        await c.query(
          'SELECT 1 FROM work_recording_chunks WHERE recording_id=$1 AND sequence=$2',
          [row.id, sequence],
        )
      ).rowCount
    )
      return row;
    const next = Number(
      (
        await c.query(
          'SELECT count(*)::int AS n FROM work_recording_chunks WHERE recording_id=$1',
          [row.id],
        )
      ).rows[0].n,
    );
    must(sequence === next, 409, 'Recording chunks must arrive in order.');
    if (sequence === 0)
      must(
        bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
        415,
        'Expected a WebM screen recording.',
      );
    must(
      Number(row.size_bytes) + bytes.length <= storage.MAX_CLIP,
      507,
      'This clip reached its size limit. The flag remains available.',
    );
    await storage.reserve(c, bytes.length);
    await c.query(
      'INSERT INTO work_recording_chunks(recording_id,sequence,file_bytes) VALUES($1,$2,$3)',
      [row.id, sequence, bytes],
    );
    return (
      await c.query(
        'UPDATE work_recordings SET size_bytes=size_bytes+$2 WHERE id=$1 RETURNING *',
        [row.id, bytes.length],
      )
    ).rows[0];
  });
}
module.exports = { saveWorkChunk };
