// One-time fresh launch after the administrator-requested reset. Invalidate
// stale browser-only profiles, prior sample test attempts, saved exam sessions,
// and student practice drafts; preserve ONLY a locally stored admin login.
export function applyCleanSlate() {
  const marker='dps.clean-slate.20261001'
  try {
    if(localStorage.getItem(marker)==='yes')return
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i)
      if(key && (
        key.startsWith('dps-practice:') ||
        key.startsWith('dps-exam-backup:') ||
        key.startsWith('dps.arcade.') ||
        key==='dps.test.custom.v1' ||
        key.startsWith('dps.learning.')
      ))localStorage.removeItem(key)
    }
    const admin=localStorage.getItem('dps.teacher.auth')
    if(admin){
      try {
        if(JSON.parse(admin)?.teacher?.role!=='admin')localStorage.removeItem('dps.teacher.auth')
      } catch { localStorage.removeItem('dps.teacher.auth') }
    }
    for(let i=sessionStorage.length-1;i>=0;i--){
      const key=sessionStorage.key(i)
      if(key && (key.startsWith('dps.')||key.startsWith('dps-exam-backup:')))sessionStorage.removeItem(key)
    }
    localStorage.setItem(marker,'yes')
  }catch{ /* Private browsing may disable storage. Server-side reset still applies. */ }
}
