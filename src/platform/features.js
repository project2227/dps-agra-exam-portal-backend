'use strict';
function featureFor(path) {
  if (/^\/api\/(?:teacher\/)?exams(?:\/|$)|^\/api\/student\/exams\//.test(path))
    return path.includes('/monitor') ? 'monitoring' : 'exams';
  if (/^\/api\/accounts\/teacher\/students/.test(path)) return 'students';
  if (/^\/api\/teacher\/classes/.test(path)) return 'classes';
  if (/^\/api\/handouts|^\/api\/teacher\/handouts/.test(path))
    return 'handouts';
  if (/^\/api\/learning|^\/api\/teacher\/courses/.test(path)) return 'learning';
  if (/^\/api\/teacher\/community/.test(path)) return 'community';
  if (/^\/api\/code/.test(path)) return 'ide';
  if (/^\/api\/erp\//.test(path)) return path.split('/')[3];
  if (/^\/api\/chat\//.test(path)) return 'chat';
  if (/^\/api\/workplace\/(?:teams|team-members)/.test(path)) return 'teams';
  if (/^\/api\/workplace\/tasks/.test(path)) return 'tasks';
  if (/^\/api\/workplace\/attendance/.test(path)) return 'attendance';
  if (
    /^\/api\/workplace\/(?:sessions|consent|flags|incidents|desktop-permit|capture-permit)/.test(
      path,
    )
  )
    return 'monitoring';
  return null;
}
function middleware(req, res, next) {
  const feature = featureFor(req.path);
  if (req.tenant && feature && !req.tenant.features.includes(feature)) {
    const reject = () =>
      res
        .status(403)
        .json({
          error:
            'Your administrator has turned off this feature. Ask them to enable it in site settings.',
        });
    // Keep the original sign-in/CSRF failures ahead of feature availability.
    const gate = (done) => (error) => (error ? next(error) : done());
    if (/^\/api\/(?:teacher|accounts\/teacher)\//.test(req.path))
      return require('../middleware/auth').teacher(req, res, gate(reject));
    if (/^\/api\/student\/exams\//.test(req.path))
      return require('../middleware/auth').student(req, res, gate(reject));
    if (/^\/api\/(?:workplace|chat)\//.test(req.path))
      return require('./auth').requireUser()(req, res, gate(reject));
    return reject();
  }
  next();
}
module.exports = { featureFor, middleware };
