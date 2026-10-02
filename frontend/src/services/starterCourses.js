import { getAccountState } from './session.js'
import { syncLearning } from './accountApi.js'
// Authored micro-lessons: original educational content, not school curricula.
// Built-in progress lives on the current device; teacher scores only come from joined teacher courses.
export const BOOKS = {
  python: { name: 'Python', tag: 'Class IX friendly', color: 'emerald', pdf: '/resources/python-quickstart.pdf', official: 'https://docs.python.org/3/tutorial/', external: 'https://greenteapress.com/wp/think-python-2e/' },
  web: { name: 'Web Development', tag: 'HTML + CSS + JavaScript', color: 'blue', pdf: '/resources/web-quickstart.pdf', official: 'https://developer.mozilla.org/en-US/docs/Learn_web_development', external: 'https://eloquentjavascript.net/' },
  java: { name: 'Java', tag: 'Object-oriented thinking', color: 'orange', pdf: '/resources/java-quickstart.pdf', official: 'https://dev.java/learn/', external: 'https://docs.oracle.com/javase/tutorial/' },
  c: { name: 'C', tag: 'Foundations of programming', color: 'amber', pdf: '/resources/c-quickstart.pdf', official: 'https://www.gnu.org/software/gnu-c-manual/gnu-c-manual.html', external: 'https://beej.us/guide/bgc/' },
  cpp: { name: 'C++', tag: 'Algorithms and performance', color: 'sky', pdf: '/resources/cpp-quickstart.pdf', official: 'https://www.learncpp.com/', external: 'https://en.cppreference.com/w/cpp' },
  sql: { name: 'SQL', tag: 'Queries and data', color: 'violet', pdf: '/resources/sql-quickstart.pdf', official: 'https://www.postgresql.org/docs/current/tutorial.html', external: 'https://sqlbolt.com/' },
  blocks: { name: 'Block Coding', tag: 'Visual logic', color: 'pink', pdf: '/resources/blocks-quickstart.pdf', official: 'https://scratch.mit.edu/ideas', external: 'https://scratch.mit.edu/projects/editor/' },
}
export const STARTER_LESSONS = {
 python: [
  { title: 'Variables and input', body: 'Python stores values in names called variables. input() reads a line as text. Convert to int() when you need arithmetic. Try: age = int(input()) and print(age + 1). An expression produces a value; a statement causes an action.' },
  { title: 'Conditions and loops', body: 'Use if, elif, and else to choose a branch. Indentation groups the statements. A for loop repeats actions, often over range(n). A while loop repeats while its condition is true. Check your loop updates to avoid infinite repetition.' },
  { title: 'Lists and functions', body: 'A list stores an ordered group of values, like scores = [10,20,30]. Indexing begins at zero. def defines a function. Functions can accept parameters and return results. Small functions make programs easier to test.' },
 ],
 web: [{title:'Semantic HTML',body:'HTML describes content: headings, paragraphs, lists, forms, links and images. Prefer semantic elements such as main, nav, article and button so the page is usable with assistive technology.'},{title:'CSS styling',body:'CSS selects elements and assigns properties like color, padding, grid and flex. Use responsive layouts, accessible contrast and :focus-visible states.'},{title:'JavaScript interaction',body:'JavaScript responds to events. querySelector finds an element; addEventListener wires a click or keyboard action. Never put secret credentials in browser JavaScript.'}],
 java: [{title:'Classes and main',body:'Java groups behaviour and data into classes. public static void main(String[] args) begins a console program. Use System.out.println to display output. Case matters.'},{title:'Types and control flow',body:'int is a whole number, double supports decimals, boolean is true or false, and String is text. if and for work similarly to other languages but use braces.'}],
 c: [{title:'Variables and main',body:'A C program usually begins int main(void) and includes headers. Use printf to display, scanf to read carefully, and return 0 to indicate success.'},{title:'Pointers and memory',body:'&x is an address; *p dereferences a pointer. Avoid using uninitialized pointers and validate input lengths. C offers low-level power and responsibility.'}],
 cpp: [{title:'Modern C++ basics',body:'Use #include <iostream> and int main(). std::cout prints output. Prefer std::string and std::vector to unsafe raw arrays.'},{title:'Algorithms and loops',body:'Iterate with range-based for for containers. std::sort helps order data. Separate code into short functions and handle errors explicitly.'}],
 sql: [{title:'Tables and SELECT',body:'Relational databases store rows and columns. SELECT returns columns from a table. WHERE filters rows, ORDER BY sorts, and LIMIT narrows results.'},{title:'Aggregates and joins',body:'COUNT, SUM, AVG and GROUP BY summarize data. JOIN connects related rows using keys. Practice with toy tables, not a real school database.'}],
 blocks: [{title:'Sequences and events',body:'Programs are ordered steps. In Scratch, when-green-flag-clicked starts a script. A forever or repeat block creates repetition.'},{title:'Decisions and variables',body:'Use if blocks to branch and variables to remember state. Broadcast messages coordinate sprites. Debug by tracing one block at a time.'}],
}
export const STARTER_QUIZZES = {
 python: [ {prompt:'What does input() return?',options:['A list','Text (str)','A float','A boolean'],answerIndex:1},{prompt:'Which loop gives 0, 1, 2?',options:['range(3)','range(1,3)','range(2)','range(3,3)'],answerIndex:0},{prompt:'Which keyword returns a function result?',options:['break','print','return','import'],answerIndex:2}],
 web: [{prompt:'Which HTML tag represents navigation?',options:['<nav>','<div>','<span>','<strong>'],answerIndex:0},{prompt:'Which CSS rule makes a flexible row?',options:['display: list','display: flex','display: inline-block','position: fixed'],answerIndex:1},{prompt:'Which API handles a click?',options:['setTimeout','addEventListener','JSON.parse','localStorage'],answerIndex:1}],
 java: [{prompt:'What is the console entry method?',options:['main','start','run','execute'],answerIndex:0},{prompt:'What type is true/false?',options:['String','float','boolean','char'],answerIndex:2}],
 c: [{prompt:'Which function prints to the terminal?',options:['scanf','printf','read','cout'],answerIndex:1},{prompt:'What does &x mean?',options:['Multiply x','Address of x','Value at x','Boolean and'],answerIndex:1}],
 cpp: [{prompt:'Which standard type stores dynamic arrays?',options:['std::vector','std::map','std::cin','std::cout'],answerIndex:0},{prompt:'Which header supports std::cout?',options:['<vector>','<iostream>','<string>','<algorithm>'],answerIndex:1}],
 sql: [{prompt:'Which clause filters rows?',options:['GROUP BY','LIMIT','WHERE','ORDER BY'],answerIndex:2},{prompt:'Which function counts rows?',options:['AVG','SUM','MAX','COUNT'],answerIndex:3}],
 blocks: [{prompt:'Which block repeats a finite number of times?',options:['repeat','forever','wait','broadcast'],answerIndex:0},{prompt:'What stores a changing score?',options:['Sprite','Backdrop','Variable','Costume'],answerIndex:2}],
}
export const progressKey = 'dps.selfstudy.progress.v2'
export const readProgress = () => { if (getAccountState().student) return Object.fromEntries(Object.entries(getAccountState().progress.courses).map(([id,p])=>[id,{...p,bestScore:p.score}])); try { return JSON.parse(localStorage.getItem(progressKey)) || {} } catch { return {} } }
export function saveProgress(id, progress) {
  if (syncLearning({ courses: { [id]: { ...progress, ...(progress.bestScore!=null?{score:progress.bestScore}:{}), completed:progress.completed||[] } } })) { window.dispatchEvent(new Event('selfstudy-progress')); return }
  const all = readProgress(); all[id] = { ...(all[id] || {}), ...progress }
  localStorage.setItem(progressKey, JSON.stringify(all))
  window.dispatchEvent(new Event('selfstudy-progress'))
}
