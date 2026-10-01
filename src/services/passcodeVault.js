'use strict';
// Passcodes remain bcrypt-hashed for joins. This additional encrypted copy is
// exclusively for the exam owner to recover after publication. The secret is
// stored only in the backend runtime, never in PostgreSQL or browser bundles.
const crypto=require('node:crypto');
function assertKey(value){
 if(typeof value!=='string'||!/^[a-f0-9]{64}$/i.test(value))throw Error('Passcode encryption key is not configured.');
 return Buffer.from(value,'hex');
}
function encryptPasscode(passcode,keyHex){
 const key=assertKey(keyHex),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(passcode,'utf8'),cipher.final()]);
 return 'v1.'+[iv,encrypted,cipher.getAuthTag()].map(b=>b.toString('base64url')).join('.');
}
function decryptPasscode(encoded,keyHex){
 const key=assertKey(keyHex);
 if(typeof encoded!=='string'||!encoded.startsWith('v1.'))throw Error('Unknown encrypted passcode format.');
 const parts=encoded.split('.');
 if(parts.length!==4)throw Error('Invalid encrypted passcode.');
 const [iv,encrypted,tag]=parts.slice(1).map(x=>Buffer.from(x,'base64url'));
 if(iv.length!==12||tag.length!==16||!encrypted.length)throw Error('Invalid encrypted passcode.');
 const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);
 decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString('utf8');
}
module.exports={encryptPasscode,decryptPasscode};
