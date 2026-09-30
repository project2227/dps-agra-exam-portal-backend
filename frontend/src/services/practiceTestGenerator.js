import {MOCK_EXAM,GAME_BANK} from './gameQuestions.js'
const q=(topic,level,prompt,options,correct,explanation)=>({topic,level,prompt,options,correct,explanation})
const extras=[
 q('python',1,'What does print(7 // 2) show?',['3','3.5','4','Error'],0,'// performs floor division.'),
 q('python',1,'Which type does input() return?',['str','int','float','bool'],0,'input() returns text unless converted.'),
 q('python',1,'Which expression creates a list?',['{1, 2}','[1, 2]','(1, 2)','<1, 2>'],1,'Square brackets create lists.'),
 q('python',1,'Which keyword defines a function?',['function','class','def','func'],2,'Python defines functions using def.'),
 q('python',2,'What does list(range(2, 6, 2)) produce?',['[2,4]','[2,4,6]','[2,3,4,5]','[4,6]'],0,'range uses an exclusive end and a step of 2.'),
 q('python',2,'What is bool([])?',['True','False','[]','Error'],1,'An empty collection is falsy in Python.'),
 q('python',3,'What does [x*x for x in range(3)] produce?',['[0,1,4]','[1,4,9]','[0,1,2]','[0,2,4]'],0,'A list comprehension maps each x to its square.'),
 q('python',3,'What is the result of len({1,1,2,3})?',['4','2','3','Error'],2,'A set removes duplicate members.'),
 q('web',1,'Which HTML element displays the main page heading?',['<h1>','<header>','<title>','<strong>'],0,'h1 is the primary visible heading.'),
 q('web',1,'Which HTML element is intended for navigation links?',['<nav>','<aside>','<img>','<main>'],0,'nav marks navigation sections.'),
 q('web',1,'Which CSS property changes text color?',['background','color','font-style','border'],1,'color affects the foreground text.'),
 q('web',1,'Which input attribute is required for accessible field naming?',['placeholder','type','aria-label or a matching label','style'],2,'A programmatic label must name the control.'),
 q('web',2,'How do you select an element whose ID is app in CSS?',['.app','#app','app','@app'],1,'# selects an ID.'),
 q('web',2,'What does display: flex enable?',['Flexbox layout','Database queries','Network requests','HTML validation'],0,'Flexbox lays out items along one dimension.'),
 q('web',3,'Why use rel="noopener noreferrer" with target="_blank"?',['Improves CSS','Limits opened-tab access and referrer','Adds new tabs','Changes font'],1,'It restricts access to the opener and avoids sending the referrer.'),
 q('web',3,'What does CSS specificity determine?',['Which competing declaration wins','Whether HTML is valid','Server location','Network latency'],0,'Specificity helps resolve conflicting CSS rules.'),
 q('sql',1,'Which command reads database rows?',['SELECT','DELETE','ALTER','DROP'],0,'SELECT queries database records.'),
 q('sql',1,'Which clause filters rows?',['ORDER BY','WHERE','GROUP BY','CREATE'],1,'WHERE applies conditional row filters.'),
 q('sql',1,'Which clause sorts query results?',['WHERE','LIMIT','ORDER BY','HAVING'],2,'ORDER BY controls sorting.'),
 q('sql',1,'Which SQL expression counts all rows?',['SUM(*)','COUNT(*)','TOTAL(*)','SIZE(*)'],1,'COUNT(*) returns the row count.'),
 q('sql',2,'What does LIMIT 5 do?',['Limits returned rows to 5','Skips 5 rows','Deletes 5 rows','Creates 5 tables'],0,'LIMIT caps the number of returned records.'),
 q('sql',2,'Which join keeps every row from the left table?',['INNER JOIN','LEFT JOIN','CROSS JOIN','FULL JOIN'],1,'LEFT JOIN preserves rows from the left relation.'),
 q('sql',3,'Why use parameterized queries?',['To prevent SQL injection','To add CSS','To disable indexes','To encrypt every column'],0,'Parameters separate values from SQL code.'),
 q('sql',3,'What does HAVING filter?',['Grouped aggregate results','HTML forms','Uncommitted transactions','Database names'],0,'HAVING filters groups after aggregation.'),
 q('js',1,'Which declaration allows reassignment?',['const','let','class','import'],1,'A let binding can be assigned a new value.'),
 q('js',1,'What does console.log(typeof 4) output?',['int','number','float','string'],1,'JavaScript numeric primitives have typeof number.'),
 q('js',1,'Which symbol begins a JavaScript line comment?',['#','//','<!--','**'],1,'// comments out the rest of the line.'),
 q('js',1,'Which method adds an item to the end of an array?',['push()','append()','addLast()','insertEnd()'],0,'push appends an array element.'),
 q('js',2,'What does 3 === "3" evaluate to?',['true','false','3','Error'],1,'Strict equality checks type as well as value.'),
 q('js',2,'What does [2,4,6].map(x => x / 2) produce?',['[1,2,3]','[2,4,6]','6','Error'],0,'map transforms each element.'),
 q('js',3,'Which API explicitly waits for a Promise?',['await','yield*','stop','setInterval'],0,'await pauses an async function until a Promise settles.'),
 q('js',3,'Why avoid storing API secrets in frontend environment variables?',['They appear in the delivered bundle','They prevent minification','CSS ignores them','They block HTTPS'],0,'Anything in a browser-delivered bundle can be read by users.'),
 q('java',1,'Which method starts a standard Java application?',['main(String[] args)','init()','start()','constructor()'],0,'The JVM invokes public static void main(String[] args).'),
 q('java',1,'Which Java keyword creates a class?',['struct','class','def','type'],1,'Java uses class.'),
 q('java',1,'Which type represents true or false?',['int','char','boolean','String'],2,'boolean is Java’s primitive Boolean type.'),
 q('java',1,'Which statement prints a line?',['print("Hi")','cout << "Hi"','System.out.println("Hi");','echo "Hi";'],2,'Java commonly uses System.out.println.'),
 q('java',2,'Which operation compares two int values for equality?',['=','==','===','equals() only'],1,'== checks primitive int equality.'),
 q('java',2,'How do you get the length of an int[] array?',['length','size()','count()','length()'],0,'Arrays expose their length property.'),
 q('java',3,'Why use a finally block?',['It normally runs cleanup regardless of exception handling','It returns only int values','It replaces catch','It builds objects'],0,'finally usually executes cleanup even after an exception.'),
 q('java',3,'Which Java collection prevents duplicate elements?',['ArrayList','HashSet','LinkedList','Vector'],1,'A Set does not contain duplicate elements.'),
 q('cpp',1,'Which operator prints to standard output with cout?',['>>','<<','**','=>'],1,'cout uses stream insertion <<.'),
 q('cpp',1,'Which header commonly provides std::cout?',['<vector>','<iostream>','<cmath>','<string>'],1,'iostream provides the I/O streams.'),
 q('cpp',1,'Which punctuation ends most C++ statements?',[':','.', ';', ','],2,'Most statements end with semicolons.'),
 q('cpp',1,'Which keyword creates an integer variable?',['int','num','integer','var'],0,'int represents an integer.'),
 q('cpp',2,'What does 7 / 2 compute using int operands?',['3','3.5','4','Error'],0,'Integer division truncates toward zero.'),
 q('cpp',2,'What does a reference parameter allow?',['Operating on caller’s object','Only reading literals','Disabling type checking','Automatically opening files'],0,'A reference provides an alias to an existing object.'),
 q('cpp',3,'Which is preferred for automatic memory management of owning pointers?',['Raw new/delete everywhere','std::unique_ptr','void*','C casts'],1,'unique_ptr provides RAII-based exclusive ownership.'),
 q('cpp',3,'What does const on a reference parameter usually promise?',['No modification through that reference','The function must return void','A global lock','A pointer cannot be used'],0,'A const reference generally prevents modification through that reference.'),
 q('logic',1,'Binary 101 equals what in decimal?',['3','4','5','6'],2,'4+0+1 = 5.'),
 q('logic',1,'What does an AND gate output for 1 AND 0?',['0','1','2','Undefined'],0,'AND only outputs 1 when both inputs are 1.'),
 q('logic',1,'What is 1 XOR 1?',['0','1','10','11'],0,'XOR is true only when the inputs differ.'),
 q('logic',1,'Which number is even?',['13','17','22','25'],2,'22 is divisible by 2.'),
 q('logic',2,'Decimal 13 in binary is?',['1101','1011','1110','1001'],0,'13 = 8+4+1, or 1101.'),
 q('logic',2,'What is NOT(0)?',['0','1','-1','10'],1,'NOT flips a single Boolean bit.'),
 q('logic',3,'For inputs A=1 and B=0, what is (A OR B) AND (NOT B)?',['0','1','2','Error'],1,'OR is 1, NOT B is 1, so AND is 1.'),
 q('logic',3,'Which data structure follows First In, First Out?',['Stack','Queue','Binary tree','Set'],1,'A queue processes elements in arrival order.')
]
const original=MOCK_EXAM.map((x,i)=>({...x,topic:'mixed',level:i%3+1}))
for(const group of Object.values(GAME_BANK))for(const item of group.questions)original.push({...item,topic:'mixed',level:2})
export const QUESTION_BANK=[...extras,...original]
export const TOPICS=[
 {id:'mixed',label:'Everything',icon:'✳'},
 {id:'python',label:'Python',icon:'🐍'},
 {id:'web',label:'HTML & CSS',icon:'◇'},
 {id:'sql',label:'SQL',icon:'▦'},
 {id:'js',label:'JavaScript',icon:'⚡'},
 {id:'java',label:'Java',icon:'☕'},
 {id:'cpp',label:'C++',icon:'⌘'},
 {id:'logic',label:'Logic & binary',icon:'◈'}
]
const rand=seed=>{let n=seed>>>0;return()=>{n=(n+0x6d2b79f5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296}}
const shuffle=(array,rng)=>{const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function generatePracticeTest({topic='mixed',difficulty=0,count=10,seed=Date.now()}={}){
 if(!TOPICS.some(t=>t.id===topic))throw Error('Unknown practice topic')
 const n=Math.max(1,Math.min(30,Math.floor(Number(count)||10)))
 const rng=rand(Number(seed))
 let selected=QUESTION_BANK.filter(x=>topic==='mixed'||x.topic===topic)
 if(difficulty>0){
  const matching=selected.filter(x=>x.level===difficulty)
  // Favor the chosen difficulty without silently returning a one-question exam.
  selected=shuffle(matching,rng).concat(shuffle(selected.filter(x=>x.level!==difficulty),rng))
 }else selected=shuffle(selected,rng)
 const questions=selected.slice(0,Math.min(n,selected.length)).map((x,i)=>{
  const entries=shuffle(x.options.map((text,index)=>({text,correct:index===x.correct})),rng)
  return {id:seed+'-'+i,prompt:x.prompt,options:entries.map(e=>e.text),correct:entries.findIndex(e=>e.correct),explanation:x.explanation,topic:x.topic,level:x.level}
 })
 return {questions,seed,requested:n,available:QUESTION_BANK.filter(x=>topic==='mixed'||x.topic===topic).length}
}
