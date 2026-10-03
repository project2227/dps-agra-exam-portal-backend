import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { useQuery, FetchState, SimpleHeader } from './Shell';
import { request } from './api';
import { usePlatform } from './Context';
const TITLES = {
  attendance: ['Attendance', 'Keep a clear register.'],
  timetable: ['Timetable', 'Plan the school day.'],
  announcements: ['Announcements', 'Keep everyone informed.'],
  fees: ['Fee records', 'A record of fee status.'],
  profiles: ['Profiles', 'Know your school community.'],
};
export default function ERP() {
  const { kind } = useParams(),
    { user, tenant } = usePlatform(),
    q = useQuery('/api/erp/' + kind),
    [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [v, setV] = useState({
      studentId: '',
      className: '',
      section: '',
      date: new Date().toISOString().slice(0, 10),
      data: { title: '', body: '' },
    });
  const students = useQuery('/api/erp/students');
  const names = TITLES[kind] || ['School records', 'Your school day.'];
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        ...v,
        studentId: v.studentId || null,
        className: v.className || null,
        section: v.section || null,
      };
      await request('/api/erp/' + kind, { method: 'POST', body });
      setOpen(false);
      q.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SimpleHeader />
      <main className="p-page p-erp-page">
        <nav className="p-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">{tenant.name}</Link>
          <span>/</span>
          <span>{names[0]}</span>
        </nav>
        <div className="p-page-heading">
          <div>
            <p className="p-caption">{names[0]}</p>
            <h1>{names[1]}</h1>
          </div>
          {q.data?.canEdit && (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              {kind === 'announcements' ? 'Publish announcement' : 'Add record'}
            </Button>
          )}
        </div>
        <nav className="p-home-links" aria-label="School tools">
          {Object.entries(TITLES)
            .filter(([k]) => tenant.features.includes(k))
            .map(([k, [title]]) => (
              <Link key={k} to={'/school/' + k}>
                {title}
              </Link>
            ))}
        </nav>
        {kind === 'fees' && (
          <p>Record keeping only. This site does not process payments.</p>
        )}
        {kind === 'profiles' && (
          <div className="p-actions">
            <Link
              className="btn btn-secondary"
              to={user ? '/teacher/classes' : '/student/profile'}
            >
              {user ? 'Manage student profiles' : 'My profile'}
            </Link>
            {user && (
              <Link className="btn btn-secondary" to="/teacher/account">
                My staff profile
              </Link>
            )}
          </div>
        )}
        <FetchState query={q}>
          <div className="p-erp-list">
            {q.data?.records.map((r) => (
              <article className="p-card" key={r.id}>
                <div>
                  <h2>{r.data.title}</h2>
                  <span className="p-badge">{r.data.status || r.kind}</span>
                </div>
                <p>{r.data.body}</p>
                <small>
                  {[
                    r.class_name,
                    r.section,
                    r.record_date &&
                      new Date(r.record_date).toLocaleDateString(),
                    r.data.subject,
                    r.data.period,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
                {r.data.amount !== undefined && (
                  <p>
                    Amount recorded: ₹
                    {Number(r.data.amount).toLocaleString('en-IN')}
                  </p>
                )}
                {q.data.canEdit &&
                  (user.role === 'admin' ||
                    r.created_by === user.teacherId) && (
                    <button
                      className="p-text-button"
                      onClick={async () => {
                        try {
                          await request('/api/erp/' + kind + '/' + r.id, {
                            method: 'DELETE',
                          });
                          q.refresh();
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      Delete record
                    </button>
                  )}
              </article>
            ))}
          </div>
          {!q.data?.records.length && (
            <p className="p-empty">
              {q.data?.canEdit
                ? 'No records yet. Add the first one for your school.'
                : 'No records available for you yet. Ask your teacher if something is missing.'}
            </p>
          )}
        </FetchState>
        {q.error?.includes('Sign in') && (
          <Link className="btn btn-primary" to="/student/login">
            Sign in
          </Link>
        )}
        {error && (
          <p className="p-error" role="alert">
            {error}
          </p>
        )}
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={
            kind === 'announcements'
              ? 'Publish an announcement'
              : 'Add ' + names[0].toLowerCase() + ' record'
          }
        >
          <form className="p-form" onSubmit={save}>
            <Input
              label="Title"
              required
              value={v.data.title}
              onChange={(e) =>
                setV({ ...v, data: { ...v.data, title: e.target.value } })
              }
            />
            <label>
              Details
              <textarea
                className="input"
                value={v.data.body}
                onChange={(e) =>
                  setV({ ...v, data: { ...v.data, body: e.target.value } })
                }
              />
            </label>
            {['attendance', 'fees'].includes(kind) && (
              <label>
                Student
                <select
                  className="input"
                  required
                  value={v.studentId}
                  onChange={(e) => setV({ ...v, studentId: e.target.value })}
                >
                  <option value="">Choose a student</option>
                  {students.data?.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.class_name} {s.section} · Roll{' '}
                      {s.roll_number}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="p-form-pair">
              <Input
                label="Class"
                value={v.className}
                onChange={(e) => setV({ ...v, className: e.target.value })}
              />
              <Input
                label="Section"
                value={v.section}
                onChange={(e) => setV({ ...v, section: e.target.value })}
              />
            </div>
            <Input
              label="Date"
              type="date"
              value={v.date}
              onChange={(e) => setV({ ...v, date: e.target.value })}
            />
            {['attendance', 'fees'].includes(kind) && (
              <label>
                Status
                <select
                  className="input"
                  required
                  value={v.data.status || ''}
                  onChange={(e) =>
                    setV({ ...v, data: { ...v.data, status: e.target.value } })
                  }
                >
                  <option value="">Choose status</option>
                  {(kind === 'fees'
                    ? ['paid', 'pending', 'partial']
                    : ['present', 'absent', 'late']
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            {kind === 'fees' && (
              <Input
                label="Amount recorded"
                type="number"
                min={0}
                value={v.data.amount || ''}
                onChange={(e) =>
                  setV({
                    ...v,
                    data: { ...v.data, amount: Number(e.target.value) },
                  })
                }
              />
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save record'}
            </Button>
            {error && <p role="alert">{error}</p>}
          </form>
        </Modal>
      </main>
    </>
  );
}
