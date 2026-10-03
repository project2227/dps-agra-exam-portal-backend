import { PLINTH, API_BASE_URL } from '../config';
let csrf = null;
export const setPlatformCsrf = (value) => {
  csrf = value;
};
export async function request(
  path,
  { method = 'GET', body, signal, blob = false } = {},
) {
  const base = path.startsWith('/api/platform/')
    ? ''
    : PLINTH.base || API_BASE_URL;
  const headers = {};
  if (body && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  let res;
  try {
    res = await fetch(base + path, {
      method,
      credentials: 'include',
      headers,
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
      signal: signal || AbortSignal.timeout(65000),
      cache: 'no-store',
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(
      'We could not reach the server. Check your connection and try again. The first visit can take up to a minute.',
    );
  }
  const payload =
    blob && res.ok
      ? await res.blob()
      : await res.json().catch(() => ({
          error: 'The server could not complete this request. Try again.',
        }));
  if (!res.ok)
    throw Object.assign(new Error(payload.error || 'Please try again.'), {
      status: res.status,
    });
  return payload;
}
export function uploadFile(path, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', (PLINTH.base || API_BASE_URL) + path);
    xhr.withCredentials = true;
    if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable &&
      onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let value;
      try {
        value = JSON.parse(xhr.responseText);
      } catch {
        value = { error: 'Upload failed. Try again.' };
      }
      xhr.status < 300
        ? resolve(value)
        : reject(new Error(value.error || 'Upload failed.'));
    };
    xhr.onerror = () =>
      reject(new Error('The upload lost its connection. Try again.'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}
