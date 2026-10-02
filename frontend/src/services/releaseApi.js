import {API_BASE_URL} from '../config'
import {getStudentSession,getTeacherToken,getCsrfToken} from './session'
export async function releaseRequest(path,{role='teacher',method='GET',body,blob=false,signal}={}) {
 const token=role==='student'?getStudentSession()?.token:getTeacherToken()
 const form=body instanceof FormData
 const response=await fetch(API_BASE_URL+'/api'+path,{method,credentials:'include',signal:signal||AbortSignal.timeout(15000),
  headers:{...(token?{Authorization:'Bearer '+token}:{}),...(getCsrfToken()?{'X-CSRF-Token':getCsrfToken()}:{}),...(!form&&body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:form?body:JSON.stringify(body)}:{})})
 if(!response.ok){const problem=await response.json().catch(()=>({}));throw Object.assign(new Error(problem.error||'This request could not be completed.'),{status:response.status})}
 return blob?response.blob():response.json()
}
