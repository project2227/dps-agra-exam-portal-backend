'use strict';
const express = require('express');
const { z } = require('zod');
const db = require('../config/db');
const { asyncWrap, must } = require('../utils/http');
const auth = require('../platform/auth');
const { currentTenant } = require('../platform/context');
const router = express.Router();
const kinds = z.enum([
  'attendance',
  'timetable',
  'announcements',
  'fees',
  'profiles',
]);
router.use((req, res, next) => {
  if (currentTenant().path !== 'institute')
    return res.status(403).json({ error: 'Open your institute site.' });
  next();
});
async function staff(actor) {
  const q = await db.query(
    'SELECT id,role,assigned_classes FROM teachers WHERE id=$1',
    [actor.teacher_id],
  );
  must(q.rowCount, 403, 'Teacher access required.');
  return q.rows[0];
}
router.get(
  '/students',
  auth.requireUser(['admin', 'teacher']),
  asyncWrap(async (req, res) => {
    const t = await staff(req.actor);
    res.json({
      students: (
        await db.query(
          "SELECT id,name,roll_number,class_name,section FROM students WHERE active=true AND ($1='admin' OR class_name=ANY($2::text[])) ORDER BY class_name,section,roll_number",
          [t.role, t.assigned_classes],
        )
      ).rows,
    });
  }),
);
router.get(
  '/:kind',
  asyncWrap(async (req, res) => {
    const kind = kinds.parse(req.params.kind);
    must(
      currentTenant().features.includes(kind),
      404,
      'This feature is not enabled.',
    );
    const actor = await auth.resolve(req.headers);
    if (actor) {
      const t = await staff(actor);
      const q = await db.query(
        "SELECT * FROM erp_records WHERE kind=$1 AND ($2='admin' OR class_name=ANY($3::text[]) OR class_name IS NULL AND kind IN('announcements','timetable')) ORDER BY record_date DESC NULLS LAST,created_at DESC LIMIT 500",
        [kind, t.role, t.assigned_classes],
      );
      return res.json({
        records: q.rows,
        canEdit: ['admin', 'teacher'].includes(actor.role),
      });
    }
    const session = await require('../services/accountSessions').resolveSession(
      req.headers,
    );
    must(
      session?.student_id && !session.must_change_password,
      401,
      'Sign in to view this page.',
    );
    const s = (
      await db.query('SELECT * FROM students WHERE id=$1', [session.student_id])
    ).rows[0];
    const q = await db.query(
      `SELECT * FROM erp_records WHERE kind=$1 AND (student_id=$2 OR student_id IS NULL AND $1 IN('timetable','announcements') AND (class_name IS NULL OR class_name=$3) AND (section IS NULL OR section=$4)) ORDER BY record_date DESC NULLS LAST,created_at DESC LIMIT 500`,
      [kind, s.id, s.class_name, s.section],
    );
    res.json({ records: q.rows, canEdit: false });
  }),
);
router.post(
  '/:kind',
  auth.requireUser(['admin', 'teacher']),
  asyncWrap(async (req, res) => {
    const kind = kinds.parse(req.params.kind);
    must(
      currentTenant().features.includes(kind),
      404,
      'This feature is not enabled.',
    );
    const shape = {
      title: z.string().trim().min(1).max(180),
      body: z.string().max(3000).default(''),
    };
    const v = z
      .object({
        studentId: z.string().uuid().nullable().optional(),
        className: z.string().max(40).nullable().optional(),
        section: z.string().max(12).nullable().optional(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        data: z
          .object({
            ...shape,
            status: z
              .enum(['present', 'absent', 'late', 'paid', 'pending', 'partial'])
              .optional(),
            amount: z.number().min(0).max(10000000).optional(),
            period: z.string().max(40).optional(),
            subject: z.string().max(90).optional(),
          })
          .strict(),
      })
      .strict()
      .parse(req.body);
    if (['fees', 'attendance'].includes(kind))
      must(v.studentId, 400, 'Select a student for this record.');
    const teacher = await staff(req.actor);
    if (v.studentId) {
      const s = (
        await db.query('SELECT class_name,section FROM students WHERE id=$1', [
          v.studentId,
        ])
      ).rows[0];
      must(s, 404, 'Student not found.');
      await require('../services/permissions').assertAssignedClass(
        teacher,
        s.class_name,
        s.section,
      );
      v.className = s.class_name;
      v.section = s.section;
    } else if (v.className)
      await require('../services/permissions').assertAssignedClass(
        teacher,
        v.className,
        v.section || 'All',
      );
    else must(teacher.role === 'admin', 403, 'Choose a class assigned to you.');
    const q = await db.query(
      'INSERT INTO erp_records(kind,student_id,class_name,section,record_date,data,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [
        kind,
        v.studentId || null,
        v.className || null,
        v.section || null,
        v.date || null,
        JSON.stringify(v.data),
        req.actor.teacher_id,
      ],
    );
    res.status(201).json({ record: q.rows[0] });
  }),
);
router.delete(
  '/:kind/:id',
  auth.requireUser(['admin', 'teacher']),
  asyncWrap(async (req, res) => {
    const q = await db.query(
      "DELETE FROM erp_records WHERE id=$1 AND kind=$2 AND ($3='admin' OR created_by=$4) RETURNING id",
      [
        z.string().uuid().parse(req.params.id),
        kinds.parse(req.params.kind),
        req.actor.role,
        req.actor.teacher_id,
      ],
    );
    must(q.rowCount, 404, 'Record not found.');
    res.json({ deleted: true });
  }),
);
module.exports = router;
