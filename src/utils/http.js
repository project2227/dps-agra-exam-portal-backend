'use strict';
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const asyncWrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const must=(test,status,message)=>{if(!test)throw new HttpError(status,message)};
const id = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
const safeCsv=v=>{const str=String(v??'').replace(/\r|\n/g,' '); const safe=/^\s*[=+@\-\t]/.test(str)?`'${str}`:str;return `"${safe.replace(/"/g,'""')}"`;};
const publicError=(err,req,res,next)=>{
 if(res.headersSent)return next(err);
 if(err.name==='ZodError')return res.status(400).json({error:'Invalid request',details:err.issues.map(x=>({path:x.path.join('.'),message:x.message}))});
 if(err.code==='22P02'||err.code==='23514')return res.status(400).json({error:'Invalid identifier or database constraint.'});
 if(err.code==='23505')return res.status(409).json({error:'Conflict: a matching record already exists.'});
 if(err.code==='23503')return res.status(400).json({error:'Referenced record does not exist.'});
 if(err.status)return res.status(err.status).json({error:err.message});
 console.error('[error]',{method:req.method,path:/\/files\//.test(req.path)?'[signed file route]':req.path,code:err.code,message:err.message});
 res.status(500).json({error:'Internal server error.'});
};
module.exports={HttpError,asyncWrap,must,id,safeCsv,publicError};
