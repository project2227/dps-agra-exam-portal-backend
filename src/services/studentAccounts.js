'use strict';
const {z}=require('zod');const crypto=require('crypto');const bcrypt=require('bcryptjs');
const db=require('../config/db');const {env}=require('../config/env');const {must}=require('../utils/http');
const DUMMY='$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36nYkJxb1ylKwJ6/hZJWh2i';
const password=z.string().min(12,'Use at least 12 characters.').max(72,'Use at most 72 characters.').refine(v=>Buffer.byteLength(v)<=72,'Use at most 72 bytes.');
const avatars=['book','leaf','star','rocket','fox','owl','planet','robot'];
const studentFields=z.object({admissionNumber:z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/,'Use letters, numbers, underscores or hyphens.'),name:z.string().trim().min(2).max(120),rollNumber:z.string().trim().min(1).max(32),className:z.string().trim().min(1).max(40),section:z.string().trim().min(1).max(12).refine(x=>x.toLowerCase()!=='all','Choose one section.'),schoolEmail:z.string().trim().email().max(200).or(z.literal('')).optional()}).strict();
const publicStudent=s=>({id:s.id,username:s.admission_number,name:s.name,rollNumber:s.roll_number,className:s.class_name,section:s.section,schoolEmail:s.school_email||'',displayName:s.display_name,avatar:s.avatar,theme:s.theme,active:s.active,mustChangePassword:s.must_change_password,learningImportDecided:!!s.learning_import_decided_at});
const temporaryPassword=()=>crypto.randomBytes(15).toString('base64url');
const limitKey=(kind,value)=>crypto.createHmac('sha256',env.FINGERPRINT_PEPPER).update(kind+':'+value).digest('hex');
function loginKeys(req,kind,username){return [limitKey('ip',req.ip),limitKey(kind,String(username).toLowerCase())];}
async function locked(keys){const q=await db.query('SELECT 1 FROM account_login_limits WHERE key_hash=ANY($1::text[]) AND locked_until>now()',[keys]);return !!q.rowCount;}
async function failure(keys){for(const [i,key] of keys.entries())await db.query(`INSERT INTO account_login_limits(key_hash,failures) VALUES($1,1) ON CONFLICT(key_hash) DO UPDATE SET failures=CASE WHEN account_login_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE account_login_limits.failures+1 END, window_start=CASE WHEN account_login_limits.window_start<now()-interval '15 minutes' THEN now() ELSE account_login_limits.window_start END,locked_until=CASE WHEN account_login_limits.window_start>=now()-interval '15 minutes' AND account_login_limits.failures+1>=$2 THEN now()+interval '15 minutes' ELSE account_login_limits.locked_until END`,[key,i===0?30:5]);}
async function success(keys){await db.query('DELETE FROM account_login_limits WHERE key_hash=$1',[keys[1]]);}
async function addStudent(c,data,teacherId){const raw=temporaryPassword(),hash=await bcrypt.hash(raw,12);const q=await c.query(`INSERT INTO students(admission_number,name,roll_number,class_name,section,school_email,password_hash,temporary_password_expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '7 days',$8) RETURNING *`,[data.admissionNumber,data.name,data.rollNumber,data.className,data.section,data.schoolEmail||null,hash,teacherId]);return {student:publicStudent(q.rows[0]),temporaryPassword:raw};}
// RFC-style quoted CSV parsing: reject malformed rows rather than guessing.
function parseCsv(text){must(typeof text==='string'&&Buffer.byteLength(text)<=80000,400,'CSV must be at most 80 KB.');const rows=[];let row=[],value='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=ch;continue;}
 if(ch==='"'){must(!value&&!closed,400,'Invalid CSV quoting.');quoted=true;}else if(ch===','){row.push(value);value='';closed=false;}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value='';closed=false;}else{must(!closed||/\s/.test(ch),400,'Unexpected text after a quoted CSV field.');if(!closed)value+=ch;}}
 must(!quoted,400,'Unclosed quote in CSV.');row.push(value);if(row.some(x=>x.trim()))rows.push(row);must(rows.length>1&&rows.length<=301,400,'Include a header and 1–300 students.');
 const aliases={admissionnumber:'admissionNumber',admission_number:'admissionNumber',username:'admissionNumber',name:'name',fullname:'name',rollnumber:'rollNumber',roll_number:'rollNumber',class:'className',classname:'className',class_name:'className',section:'section',schoolemail:'schoolEmail',school_email:'schoolEmail',email:'schoolEmail'};
 const headers=rows.shift().map(x=>aliases[x.trim().replace(/^\uFEFF/,'').replace(/\s+/g,'').toLowerCase()]);must(headers.every(Boolean)&&new Set(headers).size===headers.length,400,'CSV headers must be admission number, name, roll number, class, section and optional school email.');must(['admissionNumber','name','rollNumber','className','section'].every(x=>headers.includes(x)),400,'Include the admission number as the username.');
 return rows.map((r,i)=>({line:i+2,...(r.length===headers.length?{data:Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]))}:{error:'Column count does not match the header.'})}));
}
async function examHistory(studentId,releasedOnly=true){const q=await db.query(`SELECT s.id AS submission_id,e.id AS exam_id,e.title,e.subject,s.submitted_at AS date,s.status,
 CASE WHEN e.results_released_at IS NOT NULL AND count(a.id)>0 AND count(a.id) FILTER(WHERE a.marks_awarded IS NULL)=0 THEN 'reviewed' ELSE 'submitted' END AS review_status,
 CASE WHEN e.results_released_at IS NOT NULL AND count(a.id)>0 AND count(a.id) FILTER(WHERE a.marks_awarded IS NULL)=0 THEN coalesce(sum(a.marks_awarded),0) ELSE NULL END AS score,
 (SELECT coalesce(sum(marks),0) FROM questions WHERE exam_id=e.id) AS total_marks,e.results_released_at
 FROM exam_sessions s JOIN exams e ON e.id=s.exam_id LEFT JOIN answers a ON a.session_id=s.id
 WHERE s.student_id=$1 AND s.status='submitted' AND ($2=false OR e.results_released_at IS NOT NULL) GROUP BY s.id,e.id ORDER BY s.submitted_at DESC LIMIT 300`,[studentId,releasedOnly]);return q.rows;}
module.exports={DUMMY,password,avatars,studentFields,publicStudent,temporaryPassword,loginKeys,locked,failure,success,addStudent,parseCsv,examHistory};
