import test,{after,afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {mkdir,rm} from 'node:fs/promises'
import {fileURLToPath,pathToFileURL} from 'node:url'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {build} from 'esbuild'
process.env.NODE_ENV='test'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test',pretendToBeVisual:true})
for(const key of ['window','document','HTMLElement','SVGElement','Element','Node','Event','MutationObserver','localStorage','sessionStorage','getComputedStyle'])globalThis[key]=key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key]
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true})
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window)
globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}})
window.scrollTo=()=>{};Element.prototype.scrollIntoView=()=>{}
const cache=path.join(root,'.test-cache','exam-'+process.pid);await mkdir(cache,{recursive:true})
await build({stdin:{contents:`export {default as Builder,newQuestion,validateQuestions} from './src/components/teacher/TeacherExamBuilder';export {default as Assistant} from './src/components/teacher/ExamAiAssistant';export {default as CourseDesigner} from './src/components/teacher/CourseAiDesigner';export {default as TeacherCourses} from './src/pages/TeacherCourses';export {default as CreateExam} from './src/pages/CreateExam';export {default as ManageExams} from './src/pages/ManageHostedExams';export {default as api} from './src/services/api';export {aiQuestionToEditor} from './src/services/examAiDraft';export {toBackendQuestion,normalizeTeacherQuestion} from './src/services/liveApi';export {updateAccount} from './src/services/session';export {teacherWorkspaceKey,readExamWorkspace,writeExamWorkspace} from './src/services/teacherExamWorkspace';export {default as MotionProvider} from './src/components/common/Motion';export {ToastProvider} from './src/components/common/Toast';`,resolveDir:root,loader:'jsx'},outfile:path.join(cache,'ui.mjs'),bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',define:{'import.meta.env':'{"BASE_URL":"/","VITE_API_BASE_URL":"https://api.example.test","VITE_DEMO_MODE":"false"}'}})
const React=await import('react'),{MemoryRouter}=await import('react-router-dom')
const {render,screen,within,cleanup,waitFor,act}=await import('@testing-library/react'),{default:userEvent}=await import('@testing-library/user-event')
const ui=await import(pathToFileURL(path.join(cache,'ui.mjs'))),h=React.createElement
const originalFetch=globalThis.fetch
const methods={...ui.api},wrap=child=>h(ui.MotionProvider,null,h(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},h(ui.ToastProvider,null,child)))
afterEach(()=>{cleanup();globalThis.fetch=originalFetch;Object.assign(ui.api,methods);localStorage.clear();ui.updateAccount({teacher:null})})
after(async()=>{dom.window.close();await rm(cache,{recursive:true,force:true})})
const q={type:'mcq',prompt:'What is 1 + 1?',marks:1,options:['2','3'],correctAnswer:0,modelAnswer:'',rubric:'',language:null,starterCode:'',sourcePages:[1]}
const exam={id:'11111111-1111-4111-8111-111111111111',title:'Assessment',class:'IX',section:'A',subject:'Computers',type:'Mixed',status:'upcoming',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+86400000+45*60000).toISOString(),durationMin:45,updated_at:'2026-10-05T01:00:00.000Z',settings:{}}
test('practicals need no answer key or test outputs; incomplete optional tests still get useful validation',()=>{
 const practical={...ui.newQuestion('code','IX'),prompt:'Write an addition function.'};assert.deepEqual(ui.validateQuestions([practical]),{});assert.deepEqual(practical.visibleTests,[])
 assert.match(ui.validateQuestions([{...practical,visibleTests:[{input:'1 2',expected:''}]}])[practical.id],/optional test/)
})
test('AI MCQ index zero becomes the correct option text and rubric approval starts off',()=>{
 const editor=ui.aiQuestionToEditor(q),saved=ui.toBackendQuestion(editor)
 assert.equal(saved.correctAnswer,'2');assert.equal(editor.aiMarking,false);assert.equal(editor.rubricApproved,false)
 const loaded=ui.normalizeTeacherQuestion({id:'q',type:'mcq',description:q.prompt,marks:1,options:q.options,correct_answer:'2'})
 assert.equal(loaded.correct,'0');assert.deepEqual(ui.validateQuestions([loaded]),{})
})
test('every AI practical language renders in the exam editor, including JavaScript',()=>{
 const languages=['python','java','cpp','c','javascript'],items=languages.map(language=>ui.aiQuestionToEditor({...q,type:'code',prompt:'Practical in '+language,options:[],correctAnswer:null,language}))
 render(wrap(h(ui.Builder,{questions:items,onChange:()=>{},examClass:'IX'})))
 assert.equal(screen.getAllByLabelText('Question').length,5);assert.equal(screen.getAllByLabelText('Programming language')[4].value,'javascript');assert.ok(screen.getByPlaceholderText('Optional JavaScript code students start with'))
 assert.ok(items.every(item=>Object.keys(ui.validateQuestions([item])).length===0));assert.deepEqual(items.map(item=>ui.toBackendQuestion(item).language),languages)
})
test('AI preview requires teacher review before questions can be added',async()=>{
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'});ui.api.getHandouts=async()=>[]
 let added=null;ui.api.generateExamDraft=async()=>({title:'Addition test',questions:[q],warnings:[],status:'draft',needsTeacherReview:true})
 render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',onApply:v=>{added=v}})))
 const user=userEvent.setup();await screen.findByText('Local AI is connected.');await user.type(screen.getByLabelText('What is the exam about?'),'Addition')
 await user.clear(screen.getByLabelText('Number of questions'));await user.type(screen.getByLabelText('Number of questions'),'1')
 await user.click(screen.getByRole('button',{name:'Generate question preview'}));const button=await screen.findByRole('button',{name:'Add reviewed questions'});assert.ok(button.disabled);assert.equal(added,null)
 await user.click(screen.getByLabelText('I checked these questions and answer keys against the source.'));assert.equal(button.disabled,false);await user.click(button)
 assert.equal(added.length,1);assert.equal(added[0].correct,'0');assert.equal(added[0].aiMarking,false)
 assert.ok(screen.getByRole('region',{name:'AI question preview'}));assert.match(screen.getByRole('region',{name:'AI question preview'}).textContent,/Added to exam/)
 assert.ok(button.disabled);await user.click(button);assert.equal(added.length,1)
})
test('mixed MCQ and practical generation has no five-question cap and creates each question separately',async()=>{
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'});ui.api.getHandouts=async()=>[]
 const calls=[];ui.api.generateExamDraft=async p=>{calls.push(p);return {title:'Mixed assessment',questions:[p.questionTypes[0]==='mcq'?{...q,prompt:'MCQ '+p.sequence.position}:{...q,type:'code',prompt:'Practical '+p.sequence.position,options:[],correctAnswer:null,language:'python'}],warnings:[]}}
 render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',onApply:()=>{}})));const user=userEvent.setup();await screen.findByText('Local AI is connected.')
 await user.type(screen.getByLabelText('What is the exam about?'),'Python functions');await user.click(screen.getByLabelText('Practical'))
 const count=screen.getByLabelText('Number of questions');assert.equal(count.max,'');await user.clear(count);await user.type(count,'8')
 await user.click(screen.getByRole('button',{name:'Generate question preview'}));await waitFor(()=>assert.equal(calls.length,8))
 assert.ok(calls.every(p=>p.questionCount===1));assert.deepEqual(calls.slice(0,4).map(p=>p.questionTypes),[['mcq'],['code'],['mcq'],['code']])
 await waitFor(()=>assert.equal(within(screen.getByRole('region',{name:'AI question preview'})).getAllByRole('article').length,8))
 await user.clear(count);await user.type(count,'6');await user.click(screen.getByRole('button',{name:'Generate question preview'}));await waitFor(()=>assert.equal(calls.length,14))
 assert.equal(within(screen.getByRole('region',{name:'AI question preview'})).getAllByRole('article').length,14)
 assert.ok(screen.getByText('Finished. 6 new questions kept in your preview.'))
})
test('successful batches survive later failure, source changes and regeneration until explicitly deleted',async()=>{
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'});ui.api.getHandouts=async()=>[]
 let retained=0;ui.api.generateExamDraft=async p=>{if(p.questionTypes[0]==='code')throw Error('Gateway is busy.');return {title:'Retained preview',questions:[{...q,prompt:'Retained MCQ '+(++retained)}],warnings:[]}}
 render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',onApply:()=>{}})));const user=userEvent.setup();await screen.findByText('Local AI is connected.')
 await user.type(screen.getByLabelText('What is the exam about?'),'Python');await user.click(screen.getByLabelText('Practical'));await user.clear(screen.getByLabelText('Number of questions'));await user.type(screen.getByLabelText('Number of questions'),'2')
 await user.click(screen.getByRole('button',{name:'Generate question preview'}));await screen.findByText('Gateway is busy.');assert.ok(screen.getByText('Retained MCQ 1'))
 await user.type(screen.getByLabelText(/Source text \(optional\)/),'New source');await user.click(screen.getByLabelText('Import existing questions'));assert.ok(screen.getByText('Retained MCQ 1'))
 await user.click(screen.getByLabelText('Generate new questions'));await user.click(screen.getByLabelText('Practical'));await user.clear(screen.getByLabelText('Number of questions'));await user.type(screen.getByLabelText('Number of questions'),'1')
 await user.click(screen.getByRole('button',{name:'Generate question preview'}));await screen.findByText('Retained MCQ 2')
 await user.click(screen.getByRole('button',{name:'Delete generated preview 1'}));assert.equal(screen.queryByText('Retained MCQ 1'),null);assert.ok(screen.getByText('Retained MCQ 2'))
})
test('the stop button keeps an in-flight result and the form stays open with its completed preview',async()=>{
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'});ui.api.getHandouts=async()=>[]
 let finish,calls=0;ui.api.generateExamDraft=async()=>{calls++;if(calls===2)await new Promise(r=>{finish=r});return {title:'Progress preview',questions:[{...q,prompt:'Live preview '+calls}],warnings:[]}}
 render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',onApply:()=>{}})));const user=userEvent.setup();await screen.findByText('Local AI is connected.')
 await user.type(screen.getByLabelText('What is the exam about?'),'Python');await user.clear(screen.getByLabelText('Number of questions'));await user.type(screen.getByLabelText('Number of questions'),'8')
 await user.click(screen.getByRole('button',{name:'Generate question preview'}));await screen.findByText('Live preview 1');await waitFor(()=>assert.equal(calls,2))
 await user.click(screen.getByRole('button',{name:'Stop generation'}));assert.ok(screen.getByRole('button',{name:'Stopping after the current question…'}).disabled)
 await act(async()=>{finish()});await screen.findByText('Stopped. 2 new questions kept in your preview.')
 assert.equal(calls,2);assert.equal(within(screen.getByRole('region',{name:'AI question preview'})).getAllByRole('article').length,2);assert.equal(screen.getByRole('button',{name:'Generate question preview'}).disabled,false)
})
test('adding all four AI question types keeps Create exam open and restores previews and edited questions after reload',async()=>{
 ui.updateAccount({teacher:{id:'synthetic-workspace-teacher'}})
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'});ui.api.getHandouts=async()=>[]
 ui.api.generateExamDraft=async p=>({title:'Four-type assessment',questions:[{...q,type:p.questionTypes[0],prompt:'Generated '+p.questionTypes[0],options:p.questionTypes[0]==='mcq'?q.options:[],correctAnswer:p.questionTypes[0]==='mcq'?0:null,language:p.questionTypes[0]==='code'?'python':null}],warnings:[]})
 render(wrap(h(ui.CreateExam)));const user=userEvent.setup();await screen.findByText('Local AI is connected.')
 await user.type(screen.getByLabelText('What is the exam about?'),'Python');for(const label of ['Short answer','Long answer','Practical'])await user.click(screen.getByLabelText(label))
 await user.click(screen.getByRole('button',{name:'Generate question preview'}));await waitFor(()=>assert.equal(screen.getAllByRole('article').length,4))
 await user.click(screen.getByLabelText('I checked these questions and answer keys against the source.'));await user.click(screen.getByRole('button',{name:'Add reviewed questions'}))
 await waitFor(()=>assert.equal(screen.getAllByLabelText('Question').length,4));assert.ok(screen.getByRole('heading',{name:'Create exam',level:1}));assert.equal(within(screen.getByRole('region',{name:'AI question preview'})).getAllByRole('article').length,4)
 await user.type(screen.getAllByLabelText('Question')[1],' Keep this edit.');const edited=screen.getAllByLabelText('Question')[1].value
 const cache=ui.readExamWorkspace(ui.teacherWorkspaceKey('builder'));assert.equal(cache.questions.length,4);assert.equal('passcode' in cache.form,false)
 cleanup();render(wrap(h(ui.CreateExam)));await screen.findByText('Local AI is connected.')
 assert.equal(screen.getAllByLabelText('Question').length,4);assert.equal(screen.getAllByLabelText('Question')[1].value,edited);assert.equal(within(screen.getByRole('region',{name:'AI question preview'})).getAllByRole('article').length,4)
 assert.ok(screen.getByRole('button',{name:'Add reviewed questions'}).disabled)
 await user.click(screen.getByRole('button',{name:'Delete generated preview 1'}));assert.equal(screen.getAllByLabelText('Question').length,4)
 assert.equal(within(screen.getByRole('region',{name:'AI question preview'})).getAllByRole('article').length,3)
})
test('generated preview workspaces are isolated per teacher and exam',async()=>{
 ui.updateAccount({teacher:{id:'teacher-one'}});const key=ui.teacherWorkspaceKey('assistant','exam-one')
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'});ui.api.getHandouts=async()=>[]
 ui.api.generateExamDraft=async()=>({title:'Private preview',questions:[q],warnings:[]})
 render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',workspaceKey:key,onApply:()=>{}})));const user=userEvent.setup();await screen.findByText('Local AI is connected.')
 await user.type(screen.getByLabelText('What is the exam about?'),'Addition');await user.clear(screen.getByLabelText('Number of questions'));await user.type(screen.getByLabelText('Number of questions'),'1')
 await user.click(screen.getByRole('button',{name:'Generate question preview'}));await screen.findByRole('region',{name:'AI question preview'});assert.equal(ui.readExamWorkspace(key).preview.questions.length,1)
 assert.equal(ui.readExamWorkspace(ui.teacherWorkspaceKey('assistant','exam-two')),null)
 cleanup();ui.updateAccount({teacher:{id:'teacher-two'}});render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',workspaceKey:ui.teacherWorkspaceKey('assistant','exam-one'),onApply:()=>{}})))
 await screen.findByText('Local AI is connected.');assert.equal(screen.queryByRole('region',{name:'AI question preview'}),null)
 cleanup();ui.updateAccount({teacher:{id:'teacher-one'}});render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',workspaceKey:key,onApply:()=>{}})))
 await screen.findByText('Local AI is connected.');assert.equal(within(screen.getByRole('region',{name:'AI question preview'})).getAllByRole('article').length,1)
 await user.click(screen.getByRole('button',{name:'Delete generated preview 1'}));cleanup();render(wrap(h(ui.Assistant,{examClass:'IX',subject:'Computers',workspaceKey:key,onApply:()=>{}})))
 await screen.findByText('Local AI is connected.');assert.equal(screen.queryByRole('region',{name:'AI question preview'}),null)
})
test('Save as draft accepts unfinished questions and remembers the created exam instead of creating duplicates',async()=>{
 ui.api.getExamAiStatus=async()=>({ready:false,message:'AI is offline.'});ui.api.getHandouts=async()=>[]
 const calls=[];const draft={...exam,title:'Untitled exam',status:'draft',questions:[]}
 ui.api.saveExamDraft=async(p,id)=>{calls.push({p,id});return draft};ui.api.generateExamPasscode=async()=>({});ui.api.getExamBuilder=async()=>({exam:draft,questions:[]})
 render(wrap(h(ui.CreateExam)));const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Save as draft'}));await screen.findByText('Draft saved. You can finish the questions later.')
 assert.equal(calls.length,1);assert.equal(calls[0].id,undefined);assert.equal(calls[0].p.questions.length,0)
 await user.click(screen.getByRole('button',{name:'Save as draft'}));await waitFor(()=>assert.equal(calls.length,2));assert.equal(calls[1].id,draft.id)
})
test('the practical editor labels optional marking fields and invalidates approval after question edits',async()=>{
 const question={...ui.newQuestion('code','IX'),prompt:'Write a sum function.',rubric:'Correct sum function',aiMarking:true,rubricApproved:true}
 function Demo(){const [items,setItems]=React.useState([question]);return h(ui.Builder,{questions:items,onChange:setItems,examClass:'IX'})}
 render(wrap(h(Demo)));const user=userEvent.setup();const approval=screen.getByLabelText('I checked and approve this rubric. I will review the AI suggestion before saving marks.');assert.ok(approval.checked)
 await user.type(screen.getByLabelText('Question'),' Handle negatives.');assert.equal(approval.checked,false)
 assert.ok(screen.getByLabelText('Reference answer (optional)'));assert.ok(screen.getByText('Sample and hidden tests (optional)'))
})
test('postpone dialog submits a later schedule with its edit version',async()=>{
 ui.api.getTeacherExams=async()=>[exam];let moved=null;ui.api.postponeExam=async(id,p)=>{moved={id,p};return exam}
 render(wrap(h(ui.ManageExams)));const user=userEvent.setup();await user.click(await screen.findByRole('button',{name:'Postpone exam'}))
 const dialog=screen.getByRole('dialog',{name:'Postpone exam'});await user.click(within(dialog).getByRole('button',{name:'Postpone exam'}));await waitFor(()=>assert.ok(moved))
 assert.equal(moved.id,exam.id);assert.equal(moved.p.expectedUpdatedAt,exam.updated_at);assert.ok(Date.parse(moved.p.startTime)>Date.parse(exam.startsAt))
})
test('course design generates more than five lessons one at a time through the existing PC gateway',async()=>{
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'});const calls=[],lessons=[]
 ui.api.generateExamDraft=async p=>{calls.push(p);return {title:'Python course',questions:[{...q,type:'long',prompt:'Lesson '+p.sequence.position,options:[],correctAnswer:null,modelAnswer:'Explain functions with a worked example and a practice task.'}],warnings:[]}}
 render(wrap(h(ui.CourseDesigner,{examClass:'IX',language:'python',sourceText:'',lessons:[],quiz:[],onLesson:l=>lessons.push(l),onQuiz:()=>{}})));const user=userEvent.setup();await screen.findByText('Local AI is connected.')
 await user.type(screen.getByLabelText('Course design brief'),'Python functions');await user.clear(screen.getByLabelText('Number of items'));await user.type(screen.getByLabelText('Number of items'),'6');await user.click(screen.getByRole('button',{name:'Design lessons'}))
 await screen.findByText('Finished. 6 lessons added to your editable course.');assert.equal(lessons.length,6);assert.ok(calls.every(p=>p.purpose==='lesson'&&p.questionCount===1&&p.questionTypes[0]==='long'))
 assert.match(lessons[0].body,/worked example/)
})
test('course designer lessons and quiz answers survive refresh and can be deleted individually',async()=>{
 ui.updateAccount({teacher:{id:'synthetic-course-teacher'}})
 globalThis.fetch=async()=>({ok:true,json:async()=>({courses:[]})})
 ui.api.getExamAiStatus=async()=>({ready:true,message:'Local AI is connected.'})
 ui.api.generateExamDraft=async p=>({title:'Python course',questions:[p.purpose==='lesson'?{...q,type:'long',prompt:'Python lesson '+p.sequence.position,options:[],correctAnswer:null,modelAnswer:'Functions group reusable instructions. Example: def add(a, b): return a + b. Try writing a subtraction function.'}:{...q,prompt:'Course quiz '+p.sequence.position,options:['Correct','Other A','Other B','Other C']}],warnings:[]})
 render(wrap(h(ui.TeacherCourses)));const user=userEvent.setup();await screen.findByText('Local AI is connected.');await user.type(screen.getByLabelText('Course design brief'),'Python')
 await user.click(screen.getByRole('button',{name:'Design lessons'}));await screen.findByText('Finished. 3 lessons added to your editable course.')
 assert.match(screen.getByLabelText('Lesson 1 content').value,/reusable instructions/)
 await user.selectOptions(screen.getByLabelText('Create'), 'quiz');await user.click(screen.getByRole('button',{name:'Generate course quiz'}));await screen.findByText('Finished. 3 quiz items added to your editable course.')
 assert.equal(screen.getAllByLabelText('Verified correct answer')[0].value,'0')
 const key=ui.teacherWorkspaceKey('course-designer');assert.equal(ui.readExamWorkspace(key).form.lessons.length,3);assert.equal(ui.readExamWorkspace(key).form.quiz.length,3);assert.equal('joinCode' in ui.readExamWorkspace(key).form,false)
 cleanup();render(wrap(h(ui.TeacherCourses)));await screen.findByText('Local AI is connected.');assert.equal(screen.getByLabelText('Lesson 3 title').value,'Python lesson 3');assert.equal(screen.getByLabelText('Question 3 prompt').value,'Course quiz 3')
 await user.click(screen.getByRole('button',{name:'Delete lesson 1'}));assert.equal(ui.readExamWorkspace(key).form.lessons.length,2);assert.equal(ui.readExamWorkspace(key).form.quiz.length,3)
 await user.click(screen.getByRole('button',{name:'Delete course question 1'}));assert.equal(ui.readExamWorkspace(key).form.quiz.length,2)
})
test('a course stays private until its latest edits are saved and the teacher reviews them',async()=>{
 ui.updateAccount({teacher:{id:'synthetic-course-publish'}});ui.api.getExamAiStatus=async()=>({ready:false,message:'AI is offline.'})
 const content={title:'Python functions',summary:'An introductory course',className:'IX',language:'python',lessons:[{title:'Functions',body:'Functions group reusable instructions and can return a result.'}],quiz:[{prompt:'Which keyword defines a function?',options:['def','class','return','pass'],answerIndex:0}],resources:[]}
 ui.writeExamWorkspace(ui.teacherWorkspaceKey('course-designer'),{form:content})
 const calls=[];globalThis.fetch=async(url,options)=>{if(options.method!=='GET')calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>url.endsWith('/publish')?{published:true}:options.method==='GET'?{courses:[]}:{course:{id:exam.id}}}}
 render(wrap(h(ui.TeacherCourses)));const user=userEvent.setup();await screen.findByText('AI is offline.')
 await user.click(screen.getByRole('button',{name:'Generate',exact:true}));await user.click(screen.getByRole('button',{name:'Save private draft'}));await screen.findByRole('button',{name:'Update private draft'})
 const approval=screen.getByLabelText('I checked every lesson and course answer key, and saved my changes.');assert.equal(approval.disabled,false);await user.click(approval);assert.equal(screen.getByRole('button',{name:'Publish reviewed course'}).disabled,false)
 await user.type(screen.getByLabelText('Lesson 1 content'),' Include an addition example.');assert.equal(screen.getByRole('button',{name:'Publish reviewed course'}).disabled,true);assert.equal(approval.disabled,true);assert.equal(approval.checked,false)
 await user.click(screen.getByRole('button',{name:'Update private draft'}));await screen.findByText('Private draft updated. Your course remains editable.');await user.click(approval);await user.click(screen.getByRole('button',{name:'Publish reviewed course'}));await screen.findByText('Published. Give the enrollment code privately to your students.')
 assert.deepEqual(calls.map(c=>c.url.endsWith('/publish')?'publish':c.body.joinCode?'create':'update'),['create','update','publish']);assert.equal(calls[2].body.reviewed,true)
})
