import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Hash,
  MessageSquare,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  X,
  Download,
} from 'lucide-react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { usePlatform } from './Context';
import { useQuery, FetchState } from './Shell';
import { request, uploadFile } from './api';
import { useWorkSocket } from './workSocket';
import { PLINTH } from '../config';
export default function Chat() {
  const { user } = usePlatform(),
    channels = useQuery('/api/chat/channels'),
    people = useQuery('/api/chat/people'),
    toast = useToast(),
    { socket, connected } = useWorkSocket(),
    [channel, setChannel] = useState(null),
    [messages, setMessages] = useState([]),
    [members, setMembers] = useState([]),
    [body, setBody] = useState(''),
    [mentions, setMentions] = useState([]),
    [search, setSearch] = useState(''),
    [typing, setTyping] = useState({}),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [progress, setProgress] = useState(null),
    [newOpen, setNewOpen] = useState(false),
    [kind, setKind] = useState(user.role === 'employee' ? 'dm' : 'channel'),
    [name, setName] = useState(''),
    [selected, setSelected] = useState([]),
    [preview, setPreview] = useState(null),
    [pinned, setPinned] = useState(false),
    fileInput = useRef(null),
    bottom = useRef(null),
    active = useRef(null),
    typingTimers = useRef(new Map());
  active.current = channel;
  const load = async (id, text = '') => {
    setLoading(true);
    setError('');
    try {
      const [history, list] = await Promise.all([
        request(
          '/api/chat/channels/' +
            id +
            '/messages?search=' +
            encodeURIComponent(text),
        ),
        request('/api/chat/channels/' + id + '/members'),
      ]);
      if (active.current?.id === id) {
        setMessages(history.messages);
        setMembers(list.members);
        await request('/api/chat/channels/' + id + '/read', {
          method: 'POST',
          body: {},
        });
        channels.refresh();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!channel && channels.data?.channels.length)
      setChannel(channels.data.channels[0]);
  }, [channels.data]);
  useEffect(() => {
    if (!channel) return;
    setMessages([]);
    setTyping({});
    setMentions([]);
    setBody('');
    const t = setTimeout(() => load(channel.id, search), 250);
    return () => clearTimeout(t);
  }, [channel?.id, search]);
  useEffect(() => {
    if (!socket) return;
    const join = () =>
      channels.data?.channels.forEach((c) =>
        socket.emit('chat:join', { channelId: c.id }),
      );
    join();
    socket.on('connect', join);
    return () => socket.off('connect', join);
  }, [socket, channels.data]);
  useEffect(() => {
    if (!socket) return;
    const receive = ({ channelId, message }) => {
      if (active.current?.id === channelId) {
        setMessages((all) =>
          all.some((m) => m.id === message.id) ? all : [...all, message],
        );
        request('/api/chat/channels/' + channelId + '/read', {
          method: 'POST',
          body: {},
        })
          .then(() => channels.refresh())
          .catch(() => {});
      } else channels.refresh();
      if (message.mentions?.includes(user.id))
        toast(message.name + ' mentioned you', 'info');
    };
    const type = (data) => {
      if (data.channelId !== active.current?.id) return;
      setTyping((all) => ({
        ...all,
        [data.userId]: data.typing ? data.name : null,
      }));
      clearTimeout(typingTimers.current.get(data.userId));
      typingTimers.current.set(
        data.userId,
        setTimeout(
          () => setTyping((all) => ({ ...all, [data.userId]: null })),
          3500,
        ),
      );
    };
    const pin = ({ messageId, pinned }) =>
      setMessages((all) =>
        all.map((m) => (m.id === messageId ? { ...m, pinned } : m)),
      );
    socket.on('chat:message', receive);
    socket.on('chat:typing', type);
    socket.on('chat:pinned', pin);
    return () => {
      socket.off('chat:message', receive);
      socket.off('chat:typing', type);
      socket.off('chat:pinned', pin);
      typingTimers.current.forEach(clearTimeout);
    };
  }, [socket, channels.refresh, user.id, toast]);
  useEffect(() => {
    if (!search)
      bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [messages.length]);
  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const attach = async (file) => {
    if (!file || !channel) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Choose a file under 8 MB.');
      return;
    }
    setProgress(0);
    setError('');
    try {
      const q = await uploadFile(
        '/api/chat/channels/' + channel.id + '/files',
        file,
        setProgress,
      );
      setMessages((all) =>
        all.some((m) => m.id === q.message.id) ? all : [...all, q.message],
      );
      channels.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setProgress(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  const openFile = async (file, download = false) => {
    try {
      const link = await request('/api/chat/files/' + file.id + '/link'),
        blob = await request(link.url + (download ? '' : '&preview=1'), {
          blob: true,
        }),
        url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setPreview({ url, mime: file.mimeType, name: file.name });
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <>
      <div className="p-page-heading">
        <div>
          <p className="p-caption">Channels and direct messages</p>
          <h1>Keep it in the conversation.</h1>
        </div>
        <span className={'p-connection ' + (connected ? 'live' : '')}>
          <span />
          {connected ? 'Connected' : 'Reconnecting'}
        </span>
      </div>
      <div className="p-chat-layout">
        <aside className="p-chat-channels">
          <div>
            <h2>Conversations</h2>
            <button
              className="p-icon-button"
              aria-label="New conversation"
              onClick={() => setNewOpen(true)}
            >
              <Plus size={19} />
            </button>
          </div>
          <FetchState query={channels}>
            {channels.data?.channels.map((c) => (
              <button
                type="button"
                key={c.id}
                className={channel?.id === c.id ? 'active' : ''}
                onClick={() => {
                  setChannel(c);
                  setSearch('');
                  setPinned(false);
                }}
              >
                {c.kind === 'dm' ? (
                  <MessageSquare size={16} />
                ) : (
                  <Hash size={16} />
                )}
                <span>{c.name}</span>
                {c.unread > 0 && (
                  <strong aria-label={c.unread + ' unread messages'}>
                    {c.unread}
                  </strong>
                )}
              </button>
            ))}
            {!channels.data?.channels.length && (
              <p className="p-empty">Start a conversation with your team.</p>
            )}
          </FetchState>
        </aside>
        <section
          className="p-chat-main"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            attach(e.dataTransfer.files[0]);
          }}
        >
          {channel ? (
            <>
              <header>
                <h2>
                  {channel.kind === 'channel' ? '# ' : ''}
                  {channel.name}
                </h2>
                <span>{members.length} members</span>
                <button
                  className="p-icon-button"
                  aria-label={
                    pinned ? 'Show all messages' : 'Show pinned messages'
                  }
                  aria-pressed={pinned}
                  onClick={() => setPinned(!pinned)}
                >
                  <Pin size={16} />
                </button>
                <Input
                  label="Search this conversation"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages"
                />
              </header>
              <div
                className="p-chat-history"
                role="log"
                aria-label="Message history"
                aria-live="polite"
              >
                {loading ? (
                  <p className="p-empty">Loading messages…</p>
                ) : (
                  messages
                    .filter(
                      (m) =>
                        !pinned || m.pinned || m.files?.some((f) => f.pinned),
                    )
                    .map((m) => (
                      <article
                        key={m.id}
                        className={
                          'p-message ' + (m.user_id === user.id ? 'mine' : '')
                        }
                      >
                        <div className="p-message-meta">
                          <strong>{m.name}</strong>
                          <time dateTime={m.created_at}>
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                          <button
                            className="p-icon-button"
                            aria-label={
                              m.pinned ? 'Unpin message' : 'Pin message'
                            }
                            onClick={async () => {
                              try {
                                await request(
                                  '/api/chat/messages/' + m.id + '/pin',
                                  {
                                    method: 'PATCH',
                                    body: { pinned: !m.pinned },
                                  },
                                );
                                setMessages((all) =>
                                  all.map((x) =>
                                    x.id === m.id
                                      ? { ...x, pinned: !m.pinned }
                                      : x,
                                  ),
                                );
                              } catch (e) {
                                toast(e.message, 'error');
                              }
                            }}
                          >
                            <Pin
                              size={12}
                              fill={m.pinned ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>
                        {m.body && <p>{m.body}</p>}
                        {m.files?.map((f) => (
                          <div className="p-chat-file" key={f.id}>
                            <FileText size={24} />
                            <div>
                              <button
                                type="button"
                                className="p-text-button"
                                onClick={() =>
                                  /^(image\/|application\/pdf)/.test(f.mimeType)
                                    ? openFile(f)
                                    : openFile(f, true)
                                }
                              >
                                {f.name}
                              </button>
                              <small>
                                {Math.ceil(f.sizeBytes / 1024)} KB ·{' '}
                                {f.mimeType}
                              </small>
                            </div>
                            <button
                              className="p-icon-button"
                              aria-label={'Download ' + f.name}
                              onClick={() => openFile(f, true)}
                            >
                              <Download size={16} />
                            </button>
                            <button
                              className="p-icon-button"
                              aria-label={f.pinned ? 'Unpin file' : 'Pin file'}
                              onClick={async () => {
                                try {
                                  await request(
                                    '/api/chat/files/' + f.id + '/pin',
                                    {
                                      method: 'PATCH',
                                      body: { pinned: !f.pinned },
                                    },
                                  );
                                  load(channel.id, search);
                                } catch (e) {
                                  toast(e.message, 'error');
                                }
                              }}
                            >
                              <Pin
                                size={14}
                                fill={f.pinned ? 'currentColor' : 'none'}
                              />
                            </button>
                          </div>
                        ))}
                      </article>
                    ))
                )}
                {!loading && !messages.length && (
                  <p className="p-empty">
                    {search
                      ? 'No messages match your search.'
                      : 'The conversation starts here.'}
                  </p>
                )}
                <div ref={bottom} />
              </div>
              <p className="p-typing" aria-live="polite">
                {Object.values(typing).filter(Boolean).join(', ')}
                {Object.values(typing).some(Boolean) ? ' is typing…' : ''}
              </p>
              {progress !== null && (
                <div className="p-upload-progress">
                  <progress
                    value={progress}
                    max="100"
                    aria-label="File upload progress"
                  />
                  <span>{progress}% uploaded</span>
                </div>
              )}
              {error && (
                <p className="p-error" role="alert">
                  {error}
                </p>
              )}
              <form
                className="p-chat-compose"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const q = await request(
                      '/api/chat/channels/' + channel.id + '/messages',
                      { method: 'POST', body: { body, mentions } },
                    );
                    setMessages((all) =>
                      all.some((m) => m.id === q.message.id)
                        ? all
                        : [...all, q.message],
                    );
                    setBody('');
                    setMentions([]);
                    socket?.emit('chat:typing', {
                      channelId: channel.id,
                      typing: false,
                    });
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                <input
                  ref={fileInput}
                  type="file"
                  className="sr-only"
                  aria-label="Attach a file"
                  onChange={(e) => attach(e.target.files[0])}
                />
                <button
                  className="p-icon-button"
                  type="button"
                  aria-label="Attach file or drop it here"
                  disabled={progress !== null}
                  onClick={() => fileInput.current?.click()}
                >
                  <Paperclip size={18} />
                </button>
                <label className="sr-only" htmlFor="chat-body">
                  Write a message
                </label>
                <textarea
                  id="chat-body"
                  required
                  maxLength={4000}
                  rows={2}
                  value={body}
                  placeholder="Write a message…"
                  onChange={(e) => {
                    setBody(e.target.value);
                    socket?.emit('chat:typing', {
                      channelId: channel.id,
                      typing: true,
                    });
                  }}
                />
                <label>
                  <span className="sr-only">Mention a member</span>
                  <select
                    aria-label="Mention a member"
                    value=""
                    onChange={(e) => {
                      const person = members.find(
                        (m) => m.id === e.target.value,
                      );
                      if (person) {
                        setBody((b) => b + '@' + person.name + ' ');
                        setMentions((all) => [...new Set([...all, person.id])]);
                      }
                    }}
                  >
                    <option value="">@</option>
                    {members
                      .filter((m) => m.id !== user.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
                <Button
                  type="submit"
                  aria-label="Send message"
                  disabled={!body.trim()}
                >
                  <Send size={17} />
                </Button>
              </form>
            </>
          ) : (
            <p className="p-empty">Choose a conversation.</p>
          )}
        </section>
      </div>
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Start a conversation"
      >
        <form
          className="p-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            try {
              const q = await request('/api/chat/channels', {
                method: 'POST',
                body: {
                  name:
                    kind === 'dm'
                      ? people.data?.people.find((p) => p.id === selected[0])
                          ?.name || 'Direct message'
                      : name,
                  kind,
                  memberIds: selected,
                },
              });
              await channels.refresh();
              setChannel(q.channel);
              setNewOpen(false);
              setSelected([]);
              setName('');
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <label>
            Conversation type
            <select
              className="input"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setSelected([]);
              }}
            >
              <option value="dm">Direct message</option>
              {['admin', 'manager'].includes(user.role) && (
                <option value="channel">Team channel</option>
              )}
            </select>
          </label>
          {kind === 'channel' && (
            <Input
              label="Channel name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <fieldset>
            <legend>
              {kind === 'dm' ? 'Choose one person' : 'Choose members'}
            </legend>
            <FetchState query={people}>
              {people.data?.people
                .filter((p) => p.id !== user.id)
                .map((p) => (
                  <label key={p.id} className="p-checkbox">
                    <input
                      type={kind === 'dm' ? 'radio' : 'checkbox'}
                      name="channel-members"
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected(
                          kind === 'dm'
                            ? [p.id]
                            : e.target.checked
                              ? [...selected, p.id]
                              : selected.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {p.name}
                  </label>
                ))}
            </FetchState>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <Button type="submit" disabled={!selected.length}>
            Start conversation
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name || 'File preview'}
        size="xl"
      >
        {preview?.mime.startsWith('image/') ? (
          <img
            className="p-file-preview"
            src={preview.url}
            alt={preview.name}
          />
        ) : (
          preview && (
            <iframe
              className="p-pdf-preview"
              src={preview.url}
              title={preview.name}
            />
          )
        )}
      </Modal>
    </>
  );
}
