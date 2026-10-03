// One browser recording engine. The exam adapter uses zero pre-roll; Workplace
// keeps two overlapping WebM streams so each uploaded clip has its own header.
// Unflagged frames remain bounded in RAM and are discarded, never uploaded.
export const BUFFER_LIMIT = 12 * 1024 * 1024,
  CHUNK_SIZE = 512 * 1024;
export class IncidentCapture {
  constructor({
    screen,
    upload,
    notify = () => {},
    preRollMs = 0,
    createRecorder,
    now = Date.now,
  }) {
    this.screen = screen;
    this.upload = upload;
    this.notify = notify;
    this.preRollMs = preRollMs;
    this.now = now;
    this.createRecorder =
      createRecorder ||
      ((stream, mime) =>
        new MediaRecorder(new MediaStream(stream.getVideoTracks()), {
          mimeType: mime,
          videoBitsPerSecond: 180000,
        }));
    this.mime = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((x) => globalThis.MediaRecorder?.isTypeSupported(x));
    this.candidates = [];
    this.current = null;
    this.closed = false;
    if (preRollMs && this.mime) {
      this.prepare();
      this.timer = setInterval(() => this.prepare(), preRollMs / 2);
    }
  }
  prepare() {
    if (this.closed || this.current) return;
    this.candidates = this.candidates.filter((e) => {
      if (this.now() - e.born >= this.preRollMs) {
        this.discard(e);
        return false;
      }
      return true;
    });
    try {
      this.candidates.push(this.make());
    } catch (e) {
      this.notify({
        status: 'unavailable',
        message:
          'Screen clips are unavailable. Activity flags are still saved.',
      });
    }
  }
  make() {
    const recorder = this.createRecorder(this.screen, this.mime),
      entry = {
        recorder,
        born: this.now(),
        parts: [],
        buffered: 0,
        queued: 0,
        sequence: 0,
        uploaded: 0,
        failed: false,
        error: '',
        reason: 'returned-to-fullscreen',
      };
    entry.finished = new Promise((resolve) => {
      entry.resolve = resolve;
    });
    recorder.ondataavailable = ({ data }) => {
      if (!data?.size || entry.discarded || entry.failed) return;
      if (entry.mode === 'upload') this.queue(entry, data);
      else if (entry.buffered + data.size <= BUFFER_LIMIT) {
        entry.parts.push(data);
        entry.buffered += data.size;
      } else this.discard(entry);
    };
    recorder.onstop = () => {
      if (entry.mode === 'upload') this.complete(entry);
      else entry.resolve();
    };
    recorder.onerror = () =>
      this.fail(
        entry,
        new Error(
          'The browser stopped recording. The activity flag is still saved.',
        ),
        'browser-recording-error',
      );
    recorder.start(2000);
    return entry;
  }
  discard(entry) {
    entry.discarded = true;
    entry.parts = [];
    entry.buffered = 0;
    if (entry.recorder.state !== 'inactive') entry.recorder.stop();
  }
  begin(meta) {
    if (this.closed || this.current) return false;
    if (!this.mime) {
      this.notify({
        status: 'unavailable',
        message:
          'This browser cannot record WebM clips. Activity flags are still saved.',
      });
      return false;
    }
    try {
      const entry =
        this.candidates.find(
          (e) => !e.discarded && e.recorder.state === 'recording',
        ) || this.make();
      for (const e of this.candidates) if (e !== entry) this.discard(e);
      this.candidates = [];
      this.current = entry;
      entry.mode = 'upload';
      entry.chain = Promise.resolve()
        .then(() =>
          this.upload.open({
            ...meta,
            mimeType: this.mime,
            clientId: crypto.randomUUID(),
          }),
        )
        .catch((e) => {
          this.fail(entry, e, 'recording-start-failed');
          return null;
        });
      const parts = entry.parts;
      entry.parts = [];
      entry.buffered = 0;
      parts.forEach((part) => this.queue(entry, part));
      this.notify({
        status: 'recording',
        message: this.preRollMs
          ? 'Recording the context around this flag.'
          : 'Screen incident recording is on. Return to the exam, focus this window and enter fullscreen to stop it.',
      });
      return true;
    } catch (e) {
      this.notify({
        status: 'error',
        message: e.message || 'Could not record this screen incident.',
      });
      return false;
    }
  }
  queue(entry, data) {
    if (entry.queued + data.size > BUFFER_LIMIT) {
      this.fail(
        entry,
        new Error('Recording buffer is full. Check the connection.'),
        'network-buffer-full',
      );
      return;
    }
    for (let offset = 0; offset < data.size; offset += CHUNK_SIZE) {
      const part = data.slice(offset, offset + CHUNK_SIZE),
        sequence = entry.sequence++;
      entry.queued += part.size;
      entry.chain = entry.chain
        .then(async (record) => {
          if (!record || entry.failed) {
            entry.queued -= part.size;
            return record;
          }
          let problem;
          for (let retry = 0; retry < 3; retry++) {
            try {
              await this.upload.chunk(record.recordingId, sequence, part);
              problem = null;
              break;
            } catch (e) {
              problem = e;
              if (e.status && e.status < 500) break;
              await new Promise((r) => setTimeout(r, 500 * (retry + 1)));
            }
          }
          entry.queued -= part.size;
          if (problem) this.fail(entry, problem, 'upload-incomplete');
          else entry.uploaded += part.size;
          return record;
        })
        .catch((e) => {
          this.fail(entry, e, 'upload-incomplete');
          return null;
        });
    }
  }
  fail(entry, error, reason) {
    entry.failed = true;
    entry.error = error.message || String(error);
    this.notify({ status: 'error', message: entry.error });
    if (entry === this.current) this.finish(reason);
    else this.discard(entry);
  }
  finish(reason = 'returned-to-fullscreen') {
    const entry = this.current;
    if (!entry) return Promise.resolve();
    entry.reason = reason;
    if (entry.recorder.state !== 'inactive') entry.recorder.stop();
    return entry.finished;
  }
  async complete(entry) {
    if (!entry.failed)
      this.notify({ status: 'saving', message: 'Saving the screen incident…' });
    try {
      const record = await entry.chain;
      if (record) await this.upload.finish(record.recordingId, entry.reason);
    } catch (e) {
      entry.failed = true;
      entry.error = e.message;
    }
    if (this.current === entry) this.current = null;
    this.notify(
      entry.failed
        ? {
            status: 'error',
            message:
              entry.error ||
              'The clip upload was interrupted; the flag is still saved.',
          }
        : entry.uploaded
          ? {
              status: 'saved',
              message: 'Incident saved. Recording has stopped.',
            }
          : {
              status: 'unavailable',
              message:
                'The browser produced no frames for this short incident. The activity flag is still saved.',
            },
    );
    entry.resolve();
    if (!this.closed && this.preRollMs) this.prepare();
  }
  async close(reason = 'page-left') {
    this.closed = true;
    clearInterval(this.timer);
    this.candidates.forEach((e) => this.discard(e));
    this.candidates = [];
    await this.finish(reason);
  }
}
