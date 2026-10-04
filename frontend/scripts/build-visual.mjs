// A separate staging-only bundle. Never emitted by the production build.
if(process.env.UI_VISUAL_QA==='true'){
  const {build}=await import('vite')
  await build({mode:'visual',base:process.env.UI_VISUAL_BASE || '/visual/',build:{outDir:'dist/visual',emptyOutDir:true}})
}else{
  // Also remove a preview left in a reused build directory or cache.
  const {rm}=await import('node:fs/promises')
  await rm(new URL('../dist/visual',import.meta.url),{recursive:true,force:true})
}
