import { useEffect, useState } from 'react';
import { Download, Mail, Plus, Trash2 } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { usePlatform } from './Context';
import { useQuery, FetchState } from './Shell';
import { request } from './api';
import { presets } from './theme';
import { ProductPreview } from './ProductUI';
export default function Settings({ teams: teamPage = false }) {
  const { tenant, user, setTenant } = usePlatform(),
    toast = useToast(),
    q = useQuery('/api/site/settings'),
    people = useQuery('/api/site/users'),
    teams = useQuery('/api/workplace/teams'),
    [branding, setBranding] = useState({
      name: tenant.name,
      theme: tenant.theme,
    }),
    [features, setFeatures] = useState(tenant.features),
    [policy, setPolicy] = useState(null),
    [invite, setInvite] = useState({
      email: '',
      role: tenant.path === 'institute' ? 'teacher' : 'employee',
      teamId: '',
    }),
    [team, setTeam] = useState({ name: '', managerId: '' }),
    [membership, setMembership] = useState({ teamId: '', userId: '' }),
    [confirm, setConfirm] = useState(false),
    [deletion, setDeletion] = useState({ confirmName: '', password: '' }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (q.data)
      setPolicy({
        ...q.data.monitoringPolicy,
        retentionDays: q.data.retentionDays,
        allowlist: q.data.monitoringPolicy.allowlist || [],
      });
  }, [q.data]);
  const mutate = async (path, body, method = 'PATCH') => {
    setBusy(true);
    setError('');
    try {
      const r = await request(path, { method, body });
      if (r.tenant) setTenant(r.tenant);
      toast(r.message || 'Saved.');
      q.refresh();
      return r;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  if (user?.role !== 'admin')
    return (
      <p className="p-empty">Ask your administrator to manage site settings.</p>
    );
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-caption">
            {teamPage
              ? 'Your organisation’s people'
              : 'Your organisation’s site'}
          </p>
          <h1>{teamPage ? 'A place for the whole team.' : 'Make it yours.'}</h1>
        </div>
      </div>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
      <FetchState query={q}>
        <div className="p-settings-grid">
          {!teamPage && (
            <>
              <section className="p-card">
                <h2>Name and theme</h2>
                <form
                  className="p-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutate('/api/site/branding', branding);
                  }}
                >
                  <Input
                    label="Organisation name"
                    required
                    value={branding.name}
                    onChange={(e) =>
                      setBranding({ ...branding, name: e.target.value })
                    }
                  />
                  <label>
                    Theme
                    <select
                      className="input"
                      value={branding.theme.preset}
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          theme: { preset: e.target.value },
                        })
                      }
                    >
                      {Object.entries(presets)
                        .filter(([, p]) => p.path === tenant.path)
                        .map(([key, p]) => (
                          <option key={key} value={key}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="p-custom-colours">
                    <label>
                      Primary
                      <input
                        type="color"
                        value={
                          branding.theme.primary ||
                          presets[branding.theme.preset].primary
                        }
                        onChange={(e) =>
                          setBranding({
                            ...branding,
                            theme: {
                              ...branding.theme,
                              primary: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Accent
                      <input
                        type="color"
                        value={
                          branding.theme.accent ||
                          presets[branding.theme.preset].accent
                        }
                        onChange={(e) =>
                          setBranding({
                            ...branding,
                            theme: {
                              ...branding.theme,
                              accent: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <Button type="submit" disabled={busy}>
                    Save branding
                  </Button>
                </form>
                <label className="p-logo-setting">
                  Organisation logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={async (e) => {
                      const logo = e.target.files[0];
                      if (!logo) return;
                      const body = new FormData();
                      body.append('logo', logo);
                      const r = await mutate('/api/site/logo', body, 'POST');
                      if (r) location.reload();
                    }}
                  />
                </label>
              </section>
              <section className="p-brand-preview">
                <ProductPreview
                  name={branding.name}
                  path={tenant.path}
                  theme={branding.theme}
                  logo={tenant.logoUrl}
                />
                <p>Preview · Your theme applies in light and dark mode.</p>
              </section>
              <section className="p-card">
                <h2>Included features</h2>
                <p>
                  Every feature is free. Show the tools your organisation needs.
                </p>
                <form
                  className="p-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutate('/api/site/features', { features }).then((r) => {
                      if (r) setTenant({ ...tenant, features });
                    });
                  }}
                >
                  {q.data?.availableFeatures?.map((f) => (
                    <label className="p-checkbox" key={f}>
                      <input
                        type="checkbox"
                        checked={features.includes(f)}
                        onChange={(e) =>
                          setFeatures(
                            e.target.checked
                              ? [...features, f]
                              : features.filter((v) => v !== f),
                          )
                        }
                      />
                      {f.replaceAll('-', ' ')}
                    </label>
                  ))}
                  <Button type="submit" disabled={busy}>
                    Save features
                  </Button>
                </form>
              </section>
              <section className="p-card">
                <h2>Storage and retention</h2>
                <p>
                  {(q.data.storage.used / 1048576).toFixed(1)} MB used of{' '}
                  {Math.round(q.data.storage.quota / 1048576)} MB per
                  organisation.
                </p>
                <progress
                  value={q.data.storage.used}
                  max={q.data.storage.quota}
                  aria-label="Organisation storage used"
                />
                <p>
                  Clip retention is bounded at {q.data.maximumRetention} days.
                  Expired clips are deleted automatically.
                </p>
                {tenant.path === 'institute' && (
                  <form
                    className="p-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      mutate('/api/site/retention', {
                        retentionDays: Number(policy.retentionDays),
                      });
                    }}
                  >
                    <Input
                      label="Recording retention in days"
                      type="number"
                      min={1}
                      max={q.data.maximumRetention}
                      value={policy?.retentionDays || 30}
                      onChange={(e) =>
                        setPolicy({ ...policy, retentionDays: e.target.value })
                      }
                    />
                    <Button type="submit">Save retention</Button>
                  </form>
                )}
              </section>
              {tenant.path === 'workplace' && policy && (
                <section className="p-card p-policy-card">
                  <h2>Monitoring notice and work hours</h2>
                  <p>
                    Sharing requires both this administrator acknowledgement and
                    each employee’s consent. Changing this policy pauses all
                    sharing and asks employees to read it again.
                  </p>
                  <form
                    className="p-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const { version, acceptedAt, acceptedBy, ...body } =
                        policy;
                      mutate('/api/site/policy', {
                        ...body,
                        retentionDays: Number(body.retentionDays),
                      });
                    }}
                  >
                    <label className="p-checkbox">
                      <input
                        type="checkbox"
                        checked={policy.noticeAccepted}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            noticeAccepted: e.target.checked,
                          })
                        }
                      />
                      Our organisation has provided a clear written notice, a
                      lawful basis and a contact for privacy requests.
                    </label>
                    <label className="p-checkbox">
                      <input
                        type="checkbox"
                        checked={policy.enabled}
                        onChange={(e) =>
                          setPolicy({ ...policy, enabled: e.target.checked })
                        }
                      />
                      Enable consented monitoring during these hours
                    </label>
                    <Input
                      label="Timezone"
                      value={policy.timezone}
                      onChange={(e) =>
                        setPolicy({ ...policy, timezone: e.target.value })
                      }
                      hint="For example, Asia/Kolkata"
                    />
                    <div className="p-form-pair">
                      <Input
                        label="Start time"
                        type="time"
                        required
                        value={policy.start}
                        onChange={(e) =>
                          setPolicy({ ...policy, start: e.target.value })
                        }
                      />
                      <Input
                        label="End time"
                        type="time"
                        required
                        value={policy.end}
                        onChange={(e) =>
                          setPolicy({ ...policy, end: e.target.value })
                        }
                      />
                    </div>
                    <fieldset>
                      <legend>Work days</legend>
                      <div className="p-day-options">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                          (d, i) => (
                            <label key={d}>
                              <input
                                type="checkbox"
                                checked={policy.days.includes(i)}
                                onChange={(e) =>
                                  setPolicy({
                                    ...policy,
                                    days: e.target.checked
                                      ? [...policy.days, i]
                                      : policy.days.filter((v) => v !== i),
                                  })
                                }
                              />
                              {d}
                            </label>
                          ),
                        )}
                      </div>
                    </fieldset>
                    <Input
                      label="App allowlist"
                      value={policy.allowlist.join(', ')}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          allowlist: e.target.value
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                      hint="Exact app names, separated by commas. Leave empty to disable app flags."
                    />
                    <Input
                      label="Clip retention in days"
                      type="number"
                      min={1}
                      max={q.data.maximumRetention}
                      value={policy.retentionDays}
                      onChange={(e) =>
                        setPolicy({ ...policy, retentionDays: e.target.value })
                      }
                    />
                    <Button type="submit" disabled={busy}>
                      Save notice and hours
                    </Button>
                  </form>
                </section>
              )}
              <section className="p-card">
                <h2>Your data</h2>
                <p>
                  Download the organisation’s records and stored files. Account
                  secrets are excluded.
                </p>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const blob = await request('/api/site/export', {
                          blob: true,
                        }),
                        url = URL.createObjectURL(blob),
                        a = document.createElement('a');
                      a.href = url;
                      a.download = tenant.slug + '-export.json';
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Download size={16} />
                  Download organisation data
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => mutate('/api/site/sample-data', {}, 'DELETE')}
                >
                  <Trash2 size={16} />
                  Remove sample records
                </Button>
                <p>
                  Deleting an organisation permanently removes its records and
                  files.
                </p>
                <button
                  type="button"
                  className="p-danger-link"
                  onClick={() => setConfirm(true)}
                >
                  Delete this organisation
                </button>
              </section>
            </>
          )}
          <section className="p-card">
            <h2>Invite a colleague</h2>
            <form
              className="p-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const values = { ...invite };
                if (!values.teamId) delete values.teamId;
                const r = await mutate('/api/site/invites', values, 'POST');
                if (r) {
                  setInvite({ ...invite, email: '' });
                  toast(
                    'Invitation sent. Your colleague sets their own password.',
                  );
                }
              }}
            >
              <Input
                label="Email"
                required
                type="email"
                value={invite.email}
                onChange={(e) =>
                  setInvite({ ...invite, email: e.target.value })
                }
              />
              <label>
                Role
                <select
                  className="input"
                  value={invite.role}
                  onChange={(e) =>
                    setInvite({ ...invite, role: e.target.value })
                  }
                >
                  {(tenant.path === 'institute'
                    ? ['teacher', 'admin']
                    : ['employee', 'manager', 'admin']
                  ).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              {tenant.path === 'workplace' && (
                <label>
                  Team
                  <select
                    className="input"
                    value={invite.teamId}
                    onChange={(e) =>
                      setInvite({ ...invite, teamId: e.target.value })
                    }
                  >
                    <option value="">General team</option>
                    {teams.data?.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Button type="submit" disabled={busy}>
                <Mail size={16} />
                Send invitation
              </Button>
            </form>
          </section>
          {teamPage && (
            <>
              <section className="p-card">
                <h2>Create a team</h2>
                <form
                  className="p-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const r = await mutate(
                      '/api/workplace/teams',
                      team,
                      'POST',
                    );
                    if (r) {
                      teams.refresh();
                      setTeam({ ...team, name: '' });
                    }
                  }}
                >
                  <Input
                    label="Team name"
                    required
                    value={team.name}
                    onChange={(e) => setTeam({ ...team, name: e.target.value })}
                  />
                  <label>
                    Manager
                    <select
                      className="input"
                      required
                      value={team.managerId}
                      onChange={(e) =>
                        setTeam({ ...team, managerId: e.target.value })
                      }
                    >
                      <option value="">Choose a manager</option>
                      {people.data?.users
                        .filter(
                          (u) =>
                            ['admin', 'manager'].includes(u.role) && u.active,
                        )
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Button type="submit" disabled={busy}>
                    <Plus size={16} />
                    Create team
                  </Button>
                </form>
              </section>
              <section className="p-card">
                <h2>Add a team member</h2>
                <form
                  className="p-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutate(
                      '/api/workplace/teams/' + membership.teamId + '/members',
                      { userId: membership.userId },
                      'POST',
                    ).then(() => teams.refresh());
                  }}
                >
                  <label>
                    Team
                    <select
                      className="input"
                      required
                      value={membership.teamId}
                      onChange={(e) =>
                        setMembership({ ...membership, teamId: e.target.value })
                      }
                    >
                      <option value="">Choose a team</option>
                      {teams.data?.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.members} members
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Person
                    <select
                      className="input"
                      required
                      value={membership.userId}
                      onChange={(e) =>
                        setMembership({ ...membership, userId: e.target.value })
                      }
                    >
                      <option value="">Choose a person</option>
                      {people.data?.users
                        .filter((u) => u.active)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Button type="submit" disabled={busy}>
                    Add member
                  </Button>
                </form>
              </section>
            </>
          )}
          <section className="p-card p-people-list">
            <h2>People</h2>
            <FetchState query={people}>
              {people.data?.users.map((u) => (
                <div className="p-person-row" key={u.id}>
                  <span>
                    <strong>{u.name}</strong>
                    <small>
                      {u.email} · {u.role} ·{' '}
                      {u.active ? 'Active' : 'Deactivated'}
                    </small>
                  </span>
                  {u.id !== user.id && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        mutate('/api/site/users/' + u.id, {
                          active: !u.active,
                        }).then(() => people.refresh())
                      }
                    >
                      {u.active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  )}
                </div>
              ))}
            </FetchState>
          </section>
        </div>
      </FetchState>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this organisation"
      >
        <p>
          This permanently removes {tenant.name} and all its records. Download
          your data first.
        </p>
        <form
          className="p-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await mutate('/api/site/data', deletion, 'DELETE');
            if (r) location.href = '/';
          }}
        >
          <Input
            label={'Type ' + tenant.name + ' to confirm'}
            required
            value={deletion.confirmName}
            onChange={(e) =>
              setDeletion({ ...deletion, confirmName: e.target.value })
            }
          />
          <Input
            label="Your current password"
            type="password"
            autoComplete="current-password"
            required
            value={deletion.password}
            onChange={(e) =>
              setDeletion({ ...deletion, password: e.target.value })
            }
          />
          {error && <p role="alert">{error}</p>}
          <Button
            type="submit"
            disabled={busy || deletion.confirmName !== tenant.name}
          >
            Permanently delete organisation
          </Button>
        </form>
      </Modal>
    </>
  );
}
