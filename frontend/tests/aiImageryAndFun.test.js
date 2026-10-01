import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,statSync} from 'node:fs'
const source=(path)=>readFileSync('src/'+path,'utf8')
test('original AI artwork is installed, optimized and included on the home and study pages',()=>{
 const art=statSync('public/ai-learning-hero.webp')
 assert.ok(art.size>20000 && art.size<150000,'optimized original artwork should be present')
 const homepage=source('pages/LandingPage.jsx')
 const learn=source('pages/LearningHome.jsx')
 assert.match(homepage,/ai-learning-hero\.webp/)
 assert.match(homepage,/AI-generated concept artwork/)
 assert.match(learn,/ai-learning-hero\.webp/)
})
test('arcade links remain inside DPS Lab rather than sending students to an external site',()=>{
 const home=source('pages/LandingPage.jsx')
 const nav=source('components/layout/Navbar.jsx')
 const footer=source('components/layout/Footer.jsx')
 for(const page of [home,nav,footer]){
  assert.ok(page.includes('to="/learn/arcade"'),'The internal arcade must be linked')
  assert.ok(!page.includes('amongus.free.page'),'Remove external game redirect')
  assert.ok(!page.includes('unverified external gaming website'),'Remove outdated external description')
 }
 assert.match(home,/Take a brain break in the Logic Arcade/)
})
