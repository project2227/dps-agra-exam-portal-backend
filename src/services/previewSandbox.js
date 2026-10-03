'use strict';
// The IDE runs pupil code inside two opaque sandboxed frames. This document
// supplies a separate CSP so the authenticated application never allows inline
// JavaScript just to support HTML/CSS/JS practice.
const document = `<!doctype html><html><head><meta charset="utf-8"><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}iframe{display:block}</style></head><body><iframe title="Running web preview" sandbox="allow-scripts allow-modals"></iframe><script>
let channel='',frame=document.querySelector('iframe');
window.addEventListener('message',event=>{
 if(event.source===parent&&event.data?.type==='plinth:preview'&&typeof event.data.html==='string'){
  channel=event.data.channel;frame.srcdoc=event.data.html;
 }else if(event.source===frame.contentWindow&&event.data?.channel===channel){
  parent.postMessage({channel,level:String(event.data.level).slice(0,10),text:String(event.data.text).slice(0,100000)},'*');
 }
});
</script></body></html>`;
function previewSandbox(req, res) {
  res.set('Cache-Control', 'no-store');
  res.set('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https:; style-src 'unsafe-inline' https:; img-src https: data: blob:; font-src https: data:; connect-src https:; frame-src 'self'; form-action 'none'; base-uri 'none'; sandbox allow-scripts allow-modals");
  // The response-level sandbox also prevents this document from acquiring the
  // application origin if someone opens the preview URL directly.
  res.type('html').send(document);
}
module.exports = { previewSandbox };
