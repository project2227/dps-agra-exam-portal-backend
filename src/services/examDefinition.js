'use strict';
const {z}=require('zod');
const {must}=require('../utils/http');
const settingsSchema=z.object({visionTracking:z.boolean().default(false),requireWebcam:z.boolean().default(false),requireScreenShare:z.boolean().default(false),
 enableTabSwitchDetection:z.boolean().default(true),enableCopyPasteDetection:z.boolean().default(true),
 enableFullscreenMode:z.boolean().default(false),enableCodeRunner:z.boolean().default(false),
 allowLateJoin:z.boolean().default(true),monitorAnswerText:z.boolean().default(false),allowGuestJoin:z.boolean().default(true),instructions:z.string().max(2000).default('')}).strict();
const examFields={title:z.string().trim().max(180),subject:z.string().max(90).default('Computers'),
 className:z.string().trim().min(1).max(40),section:z.string().max(12).default('All'),
 examType:z.enum(['quiz','practical','mixed']),startTime:z.coerce.date(),endTime:z.coerce.date(),
 durationMinutes:z.number().int().min(1).max(360),settings:settingsSchema.default({})};
const validWindow=v=>v.endTime>v.startTime;
const examShape=z.object({...examFields,title:examFields.title.min(3)}).refine(validWindow,{message:'End time must be after start time.'});
const markingShape=z.object({modelAnswer:z.string().max(4000).default(''),rubric:z.string().max(4000).default(''),
 aiMarking:z.boolean().default(false),rubricApproved:z.boolean().default(false)}).strict();
const questionShape=z.object({type:z.enum(['mcq','short','long','code','file']),title:z.string().max(240).default(''),
 description:z.string().max(10000).default(''),options:z.array(z.string().max(600)).max(16).default([]),
 correctAnswer:z.union([z.string().max(600),z.number(),z.null()]).default(null),marks:z.number().finite().min(0).max(10000),
 language:z.enum(['python','java','cpp','c','javascript']).nullable().optional(),starterCode:z.string().max(20000).default(''),
 visibleTestCases:z.array(z.object({stdin:z.string().max(2048),expectedOutput:z.string().max(2048)}).strict()).max(8).default([]),
 hiddenTestCases:z.array(z.object({stdin:z.string().max(2048),expectedOutput:z.string().max(2048)}).strict()).max(8).default([]),
 markingNotes:markingShape.default({}),order:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0)}).strict();
const draftShape=z.object({exam:z.object(examFields).strict().refine(validWindow,{message:'End time must be after start time.'}),
 questions:z.array(questionShape),expectedUpdatedAt:z.string().datetime().optional()}).strict();
// Non-MCQ answer keys use the existing private JSONB answer-key column.
// The student serializer deliberately excludes this column and hidden tests.
function markingNotes(q){
 const value=q.correct_answer;
 if(q.type==='mcq')return markingShape.parse({});
 if(typeof value==='string')return markingShape.parse({modelAnswer:value.slice(0,4000)});
 return markingShape.parse(value&&typeof value==='object'&&!Array.isArray(value)?{
  modelAnswer:value.modelAnswer||'',rubric:value.rubric||'',aiMarking:value.aiMarking===true,rubricApproved:value.rubricApproved===true
 }:{});
}
function answerKey(q){return q.type==='mcq'?q.correctAnswer:q.markingNotes;}
function validateForPublish(exam,questions){
 must(String(exam.title||'').trim().length>=3,400,'Give the exam a title before publishing.');
 must(questions.length>0,400,'Add at least one question before publishing.');
 must(new Date(exam.end_time).getTime()>Date.now(),400,'Choose a future end time before publishing.');
 must(Number(exam.duration_minutes)<=Math.round((new Date(exam.end_time)-new Date(exam.start_time))/60000),400,'Duration cannot exceed the exam window.');
 for(const [i,q] of questions.entries()){
  const label='Question '+(i+1)+': ';
  must(String(q.description||q.title||'').trim(),400,label+'write the question text.');
  if(q.type==='mcq'){
   const options=q.options;
   must(Array.isArray(options)&&options.length>=2&&options.every(x=>typeof x==='string'&&x.trim()),400,label+'add at least two complete options.');
   must(new Set(options.map(x=>x.trim())).size===options.length,400,label+'use distinct options.');
   must(q.correct_answer==null||options.includes(q.correct_answer),400,label+'choose an existing option as the answer key, or mark it manually.');
  }
  if(q.type==='code')must(['python','java','cpp','c','javascript'].includes(q.language),400,label+'choose a supported language.');
  const notes=markingNotes(q);
  must(!notes.aiMarking||(notes.rubric.trim()&&notes.rubricApproved),400,label+'write and approve the rubric before enabling AI marking suggestions.');
  if(notes.aiMarking)must(Number(q.marks)<=100&&String(q.description||q.title).length<=5000,400,label+'AI suggestions support up to 100 marks and 5,000 question characters. Use manual marking instead.');
  if(q.type==='code')must([...(q.visible_tests||q.visibleTestCases||[]),...(q.hidden_tests||q.hiddenTestCases||[])].every(t=>!t.stdin.trim()||t.expectedOutput.trim()),400,label+'finish or remove the optional test cases.');
 }
}
async function editableExam(c,id,teacherId,{expectedUpdatedAt,questions=false}={}){
 const result=await c.query('SELECT * FROM exams WHERE id=$1 AND teacher_id=$2 FOR UPDATE',[id,teacherId]);
 must(result.rowCount,404,'Exam not found.');const exam=result.rows[0];
 must(!exam.archived_at,409,'Restore the removed exam before editing.');
 must(['draft','scheduled'].includes(exam.status),409,'An active or closed exam cannot be edited. Create a new draft instead.');
 must(exam.status==='draft'||Date.now()<new Date(exam.start_time).getTime(),409,'This exam has started. Its questions and timing are locked.');
 const attendees=await c.query('SELECT count(*)::int AS n FROM exam_sessions WHERE exam_id=$1',[exam.id]);
 must(!attendees.rows[0].n,409,'Students have already checked in. Create a new exam instead of changing their exam or timing.');
 if(expectedUpdatedAt)must(new Date(exam.updated_at).getTime()===Date.parse(expectedUpdatedAt),409,'Someone changed this exam. Reload it before saving again.');
 return exam;
}
module.exports={settingsSchema,examShape,questionShape,draftShape,markingNotes,answerKey,validateForPublish,editableExam};
