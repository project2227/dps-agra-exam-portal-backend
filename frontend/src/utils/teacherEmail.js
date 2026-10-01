// Teacher account records are identified by registered email, not an
// arbitrary username. Validate locally so the API never replies "Invalid request"
// to someone who accidentally uses a period in place of the @ symbol.
export function isValidTeacherEmail(value) {
 const email=String(value??'').trim()
 return email.length<=200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
