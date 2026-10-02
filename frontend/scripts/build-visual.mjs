// A separate staging-only bundle. Never emitted by the production build.
if(process.env.UI_VISUAL_QA==='true'){
  const {build}=await import('vite')
  await build({mode:'visual',build:{outDir:'dist/visual',emptyOutDir:true}})
}
