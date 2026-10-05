import api,{http} from '../services/api'
import {updateAccount,setStudentSession} from '../services/session'
import {teacherWorkspaceKey,writeExamWorkspace} from '../services/teacherExamWorkspace'
import * as mock from '../services/mockData'
const now=Date.now(),iso=time=>new Date(time).toISOString()
const student={id:'visual-student',name:'Preview Student',displayName:'Preview',username:'PREVIEW1001',rollNumber:'14',className:'IX',section:'A',schoolEmail:'',avatar:'book',theme:'light',mustChangePassword:false,learningImportDecided:true,active:true}
const teacher={id:'visual-teacher',name:'Preview Teacher',email:'preview@example.invalid',role:'admin',classes:['IX','X','XI','XII'],assignedClasses:['IX','X','XI','XII']}
const live={...mock.db.exams[1],id:'visual-exam',class:'IX',section:'A',title:'Computer science assessment',status:'live',startsAt:iso(now-5*60000),endsAt:iso(now+40*60000),settings:{requireWebcam:false,requireScreen:false,tabDetection:true,copyPasteRestriction:true,codeExecution:true},languages:['python']}
const upcoming={...live,id:'visual-upcoming',title:'Python revision quiz',status:'upcoming',startsAt:iso(now+45*60000),endsAt:iso(now+90*60000)}
const draft={...upcoming,id:'visual-draft',title:'Python draft',status:'draft',updated_at:iso(now)}
upcoming.updated_at=iso(now)
const practical={id:'visual-practical',type:'code',title:'Sum function',prompt:'Write a Python function that returns the sum of two numbers.',marks:5,languages:['python'],starterCode:{python:''},visibleTests:[],hiddenTests:[],modelAnswer:'',rubric:'Correct function and arithmetic: 5 marks.',aiMarking:true,rubricApproved:true}
const classes=mock.classSummaries().filter(c=>['IX','X','XI','XII'].includes(c.name))
const questions=[{id:'visual-q1',type:'mcq',title:'Variables and values',prompt:'Which value does len("School") return?',marks:2,options:[{id:'a',text:'5'},{id:'b',text:'6'},{id:'c',text:'7'},{id:'d',text:'It returns the string.'}]},{id:'visual-q2',type:'short',prompt:'Explain the purpose of a variable in a program.',marks:3,maxLength:600},{id:'visual-q3',type:'long',prompt:'Explain the difference between a list and a tuple, with an example.',marks:5}]
const aiQuestion=(type,i=0)=>({type,prompt:type==='mcq'?'Which Python collection is mutable?':type==='code'?'Write a Python function that returns the length of a list.':type==='short'?'What is a Python list?':'Explain lists and tuples with examples.',marks:type==='mcq'?1:5,options:type==='mcq'?['List','Tuple']:[],correctAnswer:type==='mcq'?0:null,modelAnswer:'',rubric:'',language:type==='code'?'python':null,starterCode:'',sourcePages:[],previewId:'visual-preview-'+type+'-'+i,editorId:'visual-editor-'+type+'-'+i,added:false})
const participants=[{sessionId:'visual-session-a',name:'Preview Student A',rollNumber:'1',class:'IX',section:'A',examId:live.id,examTitle:live.title,status:'active',connected:true,answered:2,totalQuestions:3,flags:{tab:1},timeline:[{type:'tab_hidden',severity:'medium',ts:iso(now-60000)}],lastSavedAt:iso(now-5000),device:{browser:'Chrome',os:'School desktop'},joinedAt:iso(now-600000),previewLanguage:'python',preview:'print("Hello")',webcam:false,screen:false},{sessionId:'visual-session-b',name:'Preview Student B',rollNumber:'2',class:'IX',section:'A',examId:live.id,status:'active',connected:true,answered:1,totalQuestions:3,flags:{other:1},timeline:[{type:'screen_share_stopped',severity:'high',ts:iso(now-30000)}],lastSavedAt:iso(now-8000),device:{browser:'Chrome',os:'School desktop'},webcam:false,screen:false},{sessionId:'visual-session-c',name:'Preview Student C',rollNumber:'3',class:'IX',section:'A',examId:live.id,status:'submitted',connected:true,answered:3,totalQuestions:3,flags:{},timeline:[],lastSavedAt:iso(now-3000),device:{browser:'Chrome'},webcam:false,screen:false}]
const courses=[{id:'visual-course',title:'Python loops and logic',language:'python',className:'IX',summary:'Practise loops with small, understandable programs.',lessonCount:2,published:true,lessons:[{id:'one',title:'For loops',body:'Use a for loop to repeat a task for every item in a collection.'},{id:'two',title:'While loops',body:'A while loop repeats while a condition is true.'}],resources:[],quiz:[{prompt:'What does a loop do?',options:['Repeats a task','Deletes variables','Opens a page','Prints a file'],answerIndex:0}]}]
export function installFixtures(params){
 const route=params.get('route') || '/', theme=params.get('theme') || 'light',state=params.get('state') || 'populated'
 const isTeacher=(route==='/teacher' || route.startsWith('/teacher/')) && !['/teacher/login','/teacher/request-access'].includes(route)
 const hasStudent=!route.includes('guest=1') && (route.startsWith('/student/profile') || route.includes('set-password') || route.includes('/student/exam/') || route==='/student/dashboard' || route==='/student/join' || route.startsWith('/learn'))
 const account={ready:true,student:hasStudent?{...student,theme,mustChangePassword:route==='/student/set-password'}:null,teacher:isTeacher?teacher:null,progress:{courses:{python:{completed:[0,1]}},games:{memory:120},mocks:[{score:75}],customTests:[]},csrfToken:null}
 updateAccount(account)
 if(isTeacher){
  const examId=new URLSearchParams(route.split('?')[1]||'').get('edit')||''
  for(const kind of ['builder','assistant','course-designer'])localStorage.removeItem(teacherWorkspaceKey(kind,examId))
  if(state==='ai-preview'&&route.startsWith('/teacher/exams/create'))writeExamWorkspace(teacherWorkspaceKey('assistant',examId),{preview:{title:'Synthetic mixed assessment',questions:['mcq','short','long','code'].map(type=>aiQuestion(type)),warnings:['Synthetic visual preview: no AI inference.']}})
 }
 setStudentSession({sessionId:'visual-session',token:'visual-fixture-only-not-a-credential',student:{name:student.name,rollNumber:student.rollNumber,class:'IX',section:'A'},exam:live,monitoring:{webcam:false,screen:false,recording:false},joinedAt:iso(now)})
 localStorage.setItem('dps.ui.theme',theme);localStorage.setItem('dps.portal.intro.seen.v1','1');document.documentElement.dataset.theme=theme
 document.documentElement.dataset.reduceMotion=params.get('motion')==='reduced'?'true':'false'
 if(params.get('motion')==='reduced'){const original=window.matchMedia.bind(window);window.matchMedia=query=>query.includes('prefers-reduced-motion')?{matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true}}:original(query)}
 // Consent/integrity behavior remains real in the application. The visual fixture
 // represents an already-fullscreen synthetic frame and never captures media.
 Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>document.documentElement})
 document.documentElement.requestFullscreen=async()=>{}
 document.exitFullscreen=async()=>{}
 const list=data=>state==='empty'?[]:data
 const read=(value)=>async()=>{if(state==='error')throw new Error('Preview connection failed. Try again.');return structuredClone(value)}
 Object.assign(api,{
  getActiveExams:read(list([live,upcoming])),getTeacherExams:read(list([live,upcoming])),getClasses:read(list(classes)),getParticipants:read(list(participants)),getHandouts:read(list(mock.db.handouts)),getExamDates:read(list(mock.db.examDates)),
  getTeacherOverview:read({stats:{activeExams:1,upcomingExams:1,totalSubmissions:3,cheatingFlags:2,handouts:6},activeExams:list([live]),upcomingExams:list([upcoming]),classes:list(classes)}),
  getStudentDashboard:read({student:{...student,class:'IX'},currentExam:live,upcomingExams:list([upcoming]),handouts:list(mock.db.handouts.slice(0,2)),examDates:list(mock.db.examDates)}),
  getExamQuestions:read({exam:live,questions,savedAnswers:{'visual-q1':'b'},review:{},serverTime:iso(now),secondsRemaining:2400}),getMonitor:read({exam:live,students:list(participants)}),saveAnswers:async()=>({savedAt:iso(Date.now())}),submitExam:async()=>({submitted:true}),
  getSubmissions:read(list([{id:'visual-submission',sessionId:'visual-session-c',examId:live.id,examTitle:live.title,name:'Preview Student C',rollNumber:'3',class:'IX',section:'A',student:{name:'Preview Student C',rollNumber:'3',class:'IX',section:'A'},status:'submitted',reviewStatus:'reviewed',score:8,totalMarks:10,submittedAt:iso(now-60000),flags:{},answers:[{answerId:'visual-answer',questionId:'visual-practical',prompt:practical.prompt,type:'code',marks:5,awarded:null,language:'python',code:'def add(a, b):\n    return a + b',markingNotes:{modelAnswer:'',rubric:practical.rubric},aiEligible:true}]}])),
  getExamAiStatus:read({configured:true,ready:true,model:'synthetic-visual-fixture',message:'Synthetic visual fixture: no model inference.'}),
  getExamBuilder:async id=>({exam:id==='visual-upcoming'?structuredClone(upcoming):structuredClone(draft),questions:[structuredClone(practical)]}),
  getExamPasscode:read({available:true,passcode:'PREVIEW8888'}),generateExamPasscode:read({passcode:'PREVIEW8888'}),
  saveExamDraft:async p=>({...draft,...p,questions:p.questions}),publishExam:read(upcoming),postponeExam:read(upcoming),
  suggestAnswerMarks:read({verdict:'partially_correct',suggestedMarks:4,explanation:'Synthetic suggestion for visual checks only.',rubricChecks:['Check the function definition.'],needsTeacherReview:true,finalGrade:false}),
  generateExamDraft:async p=>({title:'Synthetic assessment',questions:Array.from({length:p.questionCount||1},(_,i)=>{const q=aiQuestion(p.questionTypes[i%p.questionTypes.length],i);if(q.type==='code')q.language=p.language||'python';if(p.sequence)q.prompt+=' Sample '+p.sequence.position+'.';if(p.purpose==='lesson')q.modelAnswer='Synthetic teaching explanation with an example and a practice task. Teacher review required.';if(p.purpose==='course-quiz')q.options=['List','Tuple','String','Integer'];return q}),warnings:['Synthetic preview: no AI inference.'],needsTeacherReview:true,status:'draft'})
 })
 const history=list([{submission_id:'visual-submission',exam_id:live.id,title:'Previous computer science quiz',date:iso(now-86400000),review_status:'reviewed',score:8,total_marks:10,results_released_at:iso(now)}])
 const reply=path=>{
  if(path.endsWith('/api/accounts/session'))return account
  if(path.endsWith('/student/learning'))return {progress:account.progress}
  if(path.endsWith('/student/profile'))return {student:{...student,theme},history,deletionRequest:null}
  if(path.endsWith('/student/sessions'))return {sessions:list([{id:'device-1',device_label:'Chrome · School desktop',current:true,last_seen_at:iso(now),expires_at:iso(now+3600000)}])}
  if(path.includes('/teacher/students/'))return {student,history,deletionRequest:null}
  if(path.includes('/teacher/students?'))return {students:list([student])}
  if(path.endsWith('/teacher/admin/teachers'))return {teachers:list([teacher]),requests:[]}
  if(path.includes('grade-summary'))return {exam:{title:live.title,className:'IX',section:'A',subject:'Computer science'},summary:{students:3,graded:2,pending:1,averagePercentage:80},students:list([{sessionId:'visual-session-c',rollNumber:'3',name:'Preview Student C',marks:8,maxMarks:10,percentage:80,gradingPending:false,reviewRequired:false}])}
  if(path.includes('/admin/data/tests'))return {tests:list([{id:'visual-ended',title:'Completed revision test',class_name:'IX',section:'A',teacher_name:teacher.name,end_time:iso(now-86400000),sessions:3,status:'closed',deletable:true}])}
  if(path.includes('/teacher/account'))return {teacher,sessions:[],pendingRequests:[]}
  if(path.includes('/teacher/community'))return {messages:list([{id:'message-1',author:'Preview Teacher',body:'The revision handout is ready for Class IX.',created_at:iso(now)}])}
  if(path.includes('/courses/my'))return {courses:list(courses)}
  if(path.includes('/courses/visual-course'))return {course:courses[0],lessons:courses[0].lessons,progress:{completedLessons:[]},enrolled:false}
  if(path.includes('/courses'))return {courses:list(courses)}
  if(path.endsWith('/me'))return {profile:{handle:'Preview',className:'IX'},courses:[],games:[],mockResults:[]}
  if(path.endsWith('/games'))return {games:[]}
  if(path.includes('/student/session'))return {session:{status:'active'}}
  return {}
 }
 http.defaults.adapter=async config=>{if(state==='error')throw new Error('Preview connection failed. Try again.');return {data:reply(config.url),status:200,statusText:'OK',headers:{},config}}
 const originalFetch=window.fetch.bind(window)
 window.fetch=async(input,options)=>{const url=typeof input==='string'?input:input.url;const parsed=new URL(url,location.origin);if(!parsed.pathname.startsWith('/api/'))return originalFetch(input,options);const authRead=parsed.pathname.endsWith('/accounts/session') || parsed.pathname.endsWith('/student/learning');return new Response(JSON.stringify(state==='error'&&!authRead?{error:'Preview connection failed. Try again.'}:reply(parsed.pathname+parsed.search)),{status:state==='error'&&!authRead?503:200,headers:{'Content-Type':'application/json'}})}
}
