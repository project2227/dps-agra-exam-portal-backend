'use strict';
const crypto=require('crypto');
const db=require('../config/db');
const {env,origins}=require('../config/env');
const {must,asyncWrap}=require('../utils/http');
const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const COOKIE='__Host-dps-account';
// Partitioning permits this school's separate Render frontend/API to use cookies
// without granting an unrelated embedding site access to the account session.
function cookieOptions(remember=false){const sameOrigin=require('../platform/context').enabled();return {httpOnly:true,secure:env.NODE_ENV!=='test',sameSite:sameOrigin||env.NODE_ENV==='test'?'lax':'none',partitioned:!sameOrigin&&env.NODE_ENV!=='test',path:'/',...(remember?{maxAge:7*86400000}:{})};}
function cookieToken(headers){const raw=String(headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));return raw?.slice(COOKIE.length+1);}
function csrfValue(token){return crypto.createHmac('sha256',env.JWT_SECRET).update('account-csrf:'+token).digest('hex');}
function deviceLabel(ua=''){const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Browser';const os=/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'device';return `${browser} on ${os}`;}
async function createSession(req,res,{studentId=null,teacherId=null,remember=false,syncOrg=true}){
 const previous=cookieToken(req.headers);if(previous)await db.query('UPDATE account_sessions SET revoked_at=now() WHERE token_hash=$1',[digest(previous)]);
 const token=crypto.randomBytes(32).toString('base64url'),csrfToken=csrfValue(token);
 const expiresAt=new Date(Date.now()+(remember?7*86400000:2*3600000));
 const q=await db.query(`INSERT INTO account_sessions(token_hash,csrf_hash,student_id,teacher_id,device_label,expires_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,expires_at`,[digest(token),digest(csrfToken),studentId,teacherId,deviceLabel(req.headers['user-agent']),expiresAt]);
 if(require('../platform/context').enabled()&&syncOrg){const platform=require('../platform/auth');if(teacherId){const t=(await db.query('SELECT * FROM teachers WHERE id=$1',[teacherId])).rows[0];const u=(await db.query("INSERT INTO org_users(name,email,password_hash,role,teacher_id,verified_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(tenant_id,email) DO UPDATE SET name=excluded.name,role=excluded.role,teacher_id=excluded.teacher_id,password_hash=excluded.password_hash RETURNING *",[t.name,t.email,t.password_hash,t.role,teacherId])).rows[0];await platform.create(req,res,u,remember);}else await platform.revoke(req,res);}
 res.cookie(COOKIE,token,cookieOptions(remember));res.set('Cache-Control','no-store');
 return {csrfToken,expiresAt:q.rows[0].expires_at};
}
async function resolveSession(headers){
 const token=cookieToken(headers);if(!token||! /^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const q=await db.query(`SELECT a.*,s.active AS student_active,s.must_change_password,t.active AS teacher_active FROM account_sessions a LEFT JOIN students s ON s.id=a.student_id LEFT JOIN teachers t ON t.id=a.teacher_id WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()`,[digest(token)]);
 const row=q.rows[0];if(!row||!(row.student_id?row.student_active:row.teacher_active))return null;
 row.csrfToken=csrfValue(token);return row;
}
function checkOrigin(req){const origin=req.headers.origin;if(origin)must(require('../platform/context').enabled()?require('../platform/tenancy').trustedOrigin(origin):origins.includes(origin),403,'This request came from an untrusted site.');}
function checkCsrf(req,session){
 if(['GET','HEAD','OPTIONS'].includes(req.method))return;
 checkOrigin(req);const supplied=String(req.headers['x-csrf-token']||'');
 must(supplied.length===64&&digest(supplied)===session.csrf_hash,403,'Refresh this page and try again.');
}
const accountOptional=asyncWrap(async(req,res,next)=>{if(req.accountSession===undefined)req.accountSession=await resolveSession(req.headers);if(req.accountSession)res.set('Cache-Control','no-store');next();});
const studentAccount=(allowTemporary=false)=>asyncWrap(async(req,res,next)=>{
 if(req.accountSession===undefined)req.accountSession=await resolveSession(req.headers);
 const a=req.accountSession;must(a?.student_id,401,'Sign in with your student account.');checkCsrf(req,a);
 const q=await db.query('SELECT * FROM students WHERE id=$1 AND active=true',[a.student_id]);must(q.rowCount,401,'Please sign in again.');
 req.studentAccount=q.rows[0];must(allowTemporary||!req.studentAccount.must_change_password,403,'Set your new password before continuing.');
 res.set('Cache-Control','no-store');next();
});
function disconnectSessions(ids){const io=require('./events').getIo();if(io)for(const socket of io.sockets.sockets.values())if(ids.includes(socket.data.identity?.accountSessionId))socket.disconnect(true);}
async function revokeSessions({studentId=null,teacherId=null,except=null}){const q=await db.query(`UPDATE account_sessions SET revoked_at=now() WHERE ($1::uuid IS NOT NULL AND student_id=$1 OR $2::uuid IS NOT NULL AND teacher_id=$2) AND revoked_at IS NULL AND ($3::uuid IS NULL OR id<>$3) RETURNING id`,[studentId,teacherId,except]);disconnectSessions(q.rows.map(x=>x.id));}
function clearCookie(res){res.clearCookie(COOKIE,cookieOptions());}
module.exports={COOKIE,digest,createSession,resolveSession,csrfValue,checkCsrf,checkOrigin,accountOptional,studentAccount,revokeSessions,clearCookie,deviceLabel,disconnectSessions};
