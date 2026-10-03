import {lazy,Suspense} from 'react'
import {PLINTH} from './config'
import Loader from './components/common/Loader'
const InstituteApp=lazy(()=>import('./InstituteApp'))
const PlatformApp=lazy(()=>import('./platform/PlatformApp'))
export default function App(){return <Suspense fallback={<div className="grid min-h-screen place-items-center"><Loader/></div>}>{PLINTH.enabled&&PLINTH.tenant?.path!=='institute'?<PlatformApp/>:<InstituteApp/>}</Suspense>}
