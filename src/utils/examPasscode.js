'use strict';
// Exam-specific join codes are deliberately forgiving of copied separators and
// casing across browsers. Validation occurs AFTER normalization. Never log them.
function normalizeExamPasscode(value) {
 return String(value ?? '').normalize('NFKC').replace(/[‐‑‒–—−]/g,'-')
   .trim().toUpperCase().replace(/[\s-]/g,'');
}
function isValidExamPasscode(value) {
 return /^[A-Z0-9!@#_]{8,64}$/.test(normalizeExamPasscode(value));
}
module.exports={normalizeExamPasscode,isValidExamPasscode};
