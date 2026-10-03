import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { PLINTH } from '../config';
export function useWorkSocket() {
  const [socket, setSocket] = useState(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const s = io('/workplace', {
      forceNew: true,
      withCredentials: true,
      auth: { site: PLINTH.tenant?.slug },
      transports: ['websocket', 'polling'],
    });
    setSocket(s);
    s.on('connect', () => {
      setConnected(true);
      setError('');
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (e) => {
      setConnected(false);
      setError(e.message);
    });
    s.on('work:error', (e) => setError(e.message));
    return () => s.disconnect();
  }, []);
  return { socket, connected, error };
}
