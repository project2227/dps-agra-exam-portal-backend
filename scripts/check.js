'use strict';
const fs=require('fs');const path=require('path');const cp=require('child_process');
function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const f=path.join(dir,item.name);if(item.isDirectory())scan(f);
 else if(f.endsWith('.js')){cp.execFileSync(process.execPath,['--check',f],{stdio:'inherit'});console.log('Syntax OK',path.relative(process.cwd(),f));}
}}
scan(path.join(__dirname,'..','src'));scan(path.join(__dirname,'..','scripts'));scan(path.join(__dirname,'..','tests'));
