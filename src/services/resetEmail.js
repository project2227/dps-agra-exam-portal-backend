'use strict';
const {env}=require('../config/env');
const {emailReady,sendEmail}=require('./email');
async function sendResetEmail(to,token){
 if(!emailReady())return false;
 const origin=env.ACCOUNT_APP_URL||env.FRONTEND_URL.split(',')[0];
 const link=origin.replace(/\/$/,'')+'/#/student/reset-password?token='+encodeURIComponent(token);
 // No password is ever included in email; the one-use token expires in 30 minutes.
 await sendEmail({name:'DPS Agra',to,subject:'DPS Agra: reset your password',text:`A password reset was requested for your school account. Open this link within 30 minutes to set a new password:\n${link}\n\nIf you did not request this, ignore this message. You can also ask your teacher to reset your password.`});
 return true;
}
module.exports={sendResetEmail};

