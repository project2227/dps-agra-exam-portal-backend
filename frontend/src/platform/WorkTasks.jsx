import { useState } from 'react';
import { Plus, MessageSquare, ArrowRight } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { usePlatform } from './Context';
import { request } from './api';
import { useQuery, FetchState } from './Shell';
export default function WorkTasks() {
  const { user } = usePlatform(),
    q = useQuery('/api/workplace/tasks'),
    teams = useQuery('/api/workplace/teams'),
    toast = useToast(),
    [open, setOpen] = useState(false),
    [task, setTask] = useState(null),
    [comments, setComments] = useState([]),
    [body, setBody] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [values, setValues] = useState({
      title: '',
      description: '',
      teamId: '',
      assigneeId: '',
      dueAt: '',
    });
  const manager = ['admin', 'manager'].includes(user.role);
  const members = useQuery('/api/workplace/team-members');
  const labels = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-caption">Tasks and comments</p>
          <h1>Keep the next step clear.</h1>
        </div>
        {manager && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} />
            Create task
          </Button>
        )}
      </div>
      <FetchState query={q}>
        <div className="p-task-board">
          {Object.entries(labels).map(([status, label]) => (
            <section key={status}>
              <h2>
                {label}
                <span>
                  {q.data?.tasks.filter((t) => t.status === status).length || 0}
                </span>
              </h2>
              {q.data?.tasks
                .filter((t) => t.status === status)
                .map((t) => (
                  <article className="p-card" key={t.id}>
                    <h3>{t.title}</h3>
                    <p>{t.description}</p>
                    <small>
                      {t.assignee_name || 'Unassigned'}
                      {t.due_at
                        ? ' · Due ' + new Date(t.due_at).toLocaleDateString()
                        : ''}
                    </small>
                    <div className="p-task-actions">
                      <label>
                        <span className="sr-only">Status for {t.title}</span>
                        <select
                          className="input"
                          value={t.status}
                          disabled={!manager && t.assignee_id !== user.id}
                          onChange={async (e) => {
                            try {
                              await request('/api/workplace/tasks/' + t.id, {
                                method: 'PATCH',
                                body: { status: e.target.value },
                              });
                              q.refresh();
                            } catch (e) {
                              toast(e.message, 'error');
                            }
                          }}
                        >
                          {Object.entries(labels).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="p-icon-button"
                        aria-label={'Comments for ' + t.title}
                        onClick={async () => {
                          setTask(t);
                          setError('');
                          try {
                            setComments(
                              (
                                await request(
                                  '/api/workplace/tasks/' + t.id + '/comments',
                                )
                              ).comments,
                            );
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      >
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </article>
                ))}
            </section>
          ))}
        </div>
        {!q.data?.tasks.length && (
          <p className="p-empty">
            No tasks yet. Your manager can add the next piece of work here.
          </p>
        )}
      </FetchState>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a task">
        <form
          className="p-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await request('/api/workplace/tasks', {
                method: 'POST',
                body: {
                  ...values,
                  assigneeId: values.assigneeId || null,
                  dueAt: values.dueAt
                    ? new Date(values.dueAt).toISOString()
                    : null,
                },
              });
              setOpen(false);
              q.refresh();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input
            label="Task title"
            required
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
          <label>
            Description
            <textarea
              className="input"
              value={values.description}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
            />
          </label>
          <label>
            Team
            <select
              className="input"
              required
              value={values.teamId}
              onChange={(e) =>
                setValues({ ...values, teamId: e.target.value, assigneeId: '' })
              }
            >
              <option value="">Choose a team</option>
              {teams.data?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select
              className="input"
              value={values.assigneeId}
              onChange={(e) =>
                setValues({ ...values, assigneeId: e.target.value })
              }
            >
              <option value="">Unassigned</option>
              {members.data?.members
                .filter((m) => m.team_id === values.teamId)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <Input
            label="Due date and time"
            type="datetime-local"
            value={values.dueAt}
            onChange={(e) => setValues({ ...values, dueAt: e.target.value })}
          />
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={busy}>
            Create task
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!task}
        onClose={() => {
          setTask(null);
          setComments([]);
        }}
        title={task?.title || 'Task comments'}
      >
        <div className="p-comments">
          {comments.map((c) => (
            <p key={c.id}>
              <strong>{c.name}</strong>
              <br />
              {c.body}
            </p>
          ))}
          {!comments.length && <p>No comments yet.</p>}
        </div>
        <form
          className="p-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await request('/api/workplace/tasks/' + task.id + '/comments', {
                method: 'POST',
                body: { body },
              });
              setComments(
                (await request('/api/workplace/tasks/' + task.id + '/comments'))
                  .comments,
              );
              setBody('');
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Input
            label="Add a comment"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <Button type="submit">
            Post comment
            <ArrowRight size={15} />
          </Button>
        </form>
      </Modal>
    </>
  );
}
