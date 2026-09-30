const make = (prompt,options,correct,explanation) => ({prompt,options,correct,explanation})
export const GAME_BANK = {
 'bug-hunt': { title:'Bug Hunt', subtitle:'Spot the mistake before the timer runs out.', duration:120, questions:[
  make('Python: print("hello"\nWhat is missing?',['A colon','A closing bracket', 'An import', 'A variable'],1,'The print call must end with a closing parenthesis.'),
  make('Python: if score >= 50\n    print("Pass")',['An equals sign','A comma','A colon after 50','A semicolon'],2,'Python uses a colon after if conditions.'),
  make('Python: for i in range(5)\n    print(i)',['A colon after range(5)','More indentation','range must be a string','Use while instead'],0,'A for line also needs a colon.'),
  make('JavaScript: const total = 7; total = 8;',['Use let instead of const','Add an import','Missing HTML','Use =='],0,'const bindings cannot be reassigned.'),
  make('SQL: SELECT * FORM students;',['Missing ORDER BY','FORM should be FROM','Wrong quote','Missing semicolon'],1,'FROM names the table.'),
  make('HTML: <img src="cat.png">',['Missing CSS','Needs a semicolon','Missing alt description','Use <image>'],2,'Meaningful images should include alt text.'),
 ]},
 'output-detective': {title:'Output Detective',subtitle:'Mentally execute code and predict the result.',duration:150,questions:[
  make('Python: print(2 ** 3)',['6','8','9','23'],1,'** means exponentiation.'),
  make('Python: print(len("Agra"))',['3','4','5','Error'],1,'There are four characters.'),
  make('Python: print(list(range(3)))',['[1,2,3]','[0,1,2]','[0,1,2,3]','[3]'],1,'range stops before the upper bound.'),
  make('JavaScript: console.log(3 === "3")',['true','false','3','Error'],1,'Strict equality compares both type and value.'),
  make('SQL: SELECT 2 + 3 AS total;',['23','2 + 3','5','NULL'],2,'SQL can evaluate arithmetic expressions.'),
  make('Python: print("hi" * 2)',['hi2','hihi','hi hi','Error'],1,'Python repeats strings when multiplied by integers.'),
 ]},
 'syntax-sprint': {title:'Syntax Sprint',subtitle:'Choose the right syntax under pressure.',duration:95,questions:[
  make('Which Python line creates a function?',['func greet():','def greet():','function greet()','greet => ()'],1,'Python uses def.'),
  make('How do you append to a Python list?',['list.add(x)','list.push(x)','list.append(x)','list.insertEnd(x)'],2,'append adds one item at the end.'),
  make('What selects an HTML element with class box?',['#box','.box','box()','<box>'],1,'Class selectors start with a period.'),
  make('Which SQL clause sorts a result?',['GROUP BY','ORDER BY','WHERE','HAVING'],1,'ORDER BY sorts rows.'),
  make('Which Java statement prints a line?',['printf()','print(line)','System.out.println("Hi");','cout << "Hi"'],2,'Java uses System.out.println.'),
  make('Which Python condition checks equality?',['if a = b:','if a == b:','if a === b:','when a is b:'],1,'== compares equality, = assigns a value.'),
 ]}
}
export const MOCK_EXAM = [
 make('In Python, which data type stores True or False?',['str','bool','tuple','int'],1,'bool stores Boolean values.'),
 make('What will print(len([4, 5, 6])) display?',['2','3','4','6'],1,'The list contains three items.'),
 make('Which operation joins two strings in Python?',['+','//','%','**'],0,'The + operator concatenates strings.'),
 make('What is the first index in a Python list?',['-1','1','0','2'],2,'Indexes start from zero.'),
 make('Which Python keyword begins a conditional?',['for','if','def','import'],1,'if creates a conditional branch.'),
 make('Which HTML element represents a hyperlink?',['<img>','<link>','<a>','<style>'],2,'Anchor tags create clickable links.'),
 make('What does CSS stand for?',['Computer Styled Syntax','Cascading Style Sheets','Colorful System Script','Client Style Server'],1,'CSS styles HTML.'),
 make('What does SELECT * FROM students do?',['Deletes a table','Adds a column','Returns every column','Sorts by marks'],2,'* means all columns.'),
 make('Which structure repeats operations until a condition changes?',['while loop','if branch','variable','function call'],0,'while checks its condition on each iteration.'),
 make('What is the purpose of a function?',['Always store a string','Group reusable steps','Create only a list','Close the program'],1,'Functions encapsulate reusable behavior.'),
 make('Which action is safest when sharing a programming project?', ['Publish your passwords','Commit API secrets','Keep secrets server-side','Disable access checks'],2,'Keep credentials and secrets away from public source files.'),
 make('What does input() return by default in Python?', ['integer','floating value','Boolean','text'],3,'Use int(input()) to convert a numeric text input.'),
]
