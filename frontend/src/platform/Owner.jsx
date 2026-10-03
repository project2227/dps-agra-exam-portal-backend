import { useEffect, useState } from 'react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { request, setPlatformCsrf } from './api';
import { SimpleHeader } from './Shell';
export default function Owner() {
  const [user, setUser] = useState(null),
    [tenants, setTenants] = useState([]),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [v, setV] = useState({ email: '', password: '' }),
    [deleting, setDeleting] = useState(null),
    [name, setName] = useState('');
  const refresh = () =>
    request('/api/platform/owner/tenants')
      .then((q) => setTenants(q.tenants))
      .catch((e) => setError(e.message));
  useEffect(() => {
    request('/api/platform/owner/session')
      .then((q) => {
        setUser(q.user);
        setPlatformCsrf(q.csrfToken);
        refresh();
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  return (
    <>
      <SimpleHeader />
      <main className="p-owner">
        <p className="p-caption">Platform owner</p>
        <h1>Organisations, at a glance.</h1>
        {!ready ? (
          <p>Checking your session…</p>
        ) : !user ? (
          <form
            className="p-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              try {
                const q = await request('/api/platform/owner/login', {
                  method: 'POST',
                  body: v,
                });
                setUser(q.user);
                setPlatformCsrf(q.csrfToken);
                setV({ ...v, password: '' });
                refresh();
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <Input
              label="Owner email"
              type="email"
              autoComplete="username"
              required
              value={v.email}
              onChange={(e) => setV({ ...v, email: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={v.password}
              onChange={(e) => setV({ ...v, password: e.target.value })}
            />
            <Button type="submit">Sign in</Button>
          </form>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={async () => {
                await request('/api/platform/owner/logout', {
                  method: 'POST',
                  body: {},
                });
                setUser(null);
                setPlatformCsrf(null);
              }}
            >
              Sign out
            </Button>
            <div className="p-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Storage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.name}
                        <small>{t.slug}</small>
                      </td>
                      <td>{t.path}</td>
                      <td>{t.status}</td>
                      <td>
                        {Math.round(t.storage_used / 1048576)} /{' '}
                        {Math.round(t.storage_quota / 1048576)} MB
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          disabled={!['ready', 'suspended'].includes(t.status)}
                          onClick={async () => {
                            try {
                              await request(
                                '/api/platform/owner/tenants/' + t.id,
                                {
                                  method: 'PATCH',
                                  body: {
                                    status:
                                      t.status === 'suspended'
                                        ? 'ready'
                                        : 'suspended',
                                  },
                                },
                              );
                              refresh();
                            } catch (e) {
                              setError(e.message);
                            }
                          }}
                        >
                          {t.status === 'suspended' ? 'Resume' : 'Suspend'}
                        </Button>
                        <button
                          className="p-danger-link"
                          onClick={() => {
                            setDeleting(t);
                            setName('');
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {error && (
          <p className="p-error" role="alert">
            {error}
          </p>
        )}
      </main>
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Permanently delete an organisation"
      >
        <p>
          Every record and stored file will be deleted. Enter the organisation
          name to continue.
        </p>
        <form
          className="p-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await request('/api/platform/owner/tenants/' + deleting.id, {
                method: 'DELETE',
                body: { confirmName: name },
              });
              setDeleting(null);
              refresh();
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Input
            label={'Type ' + (deleting?.name || 'the organisation name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={name !== deleting?.name}>
            Delete organisation
          </Button>
          {error && <p role="alert">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
