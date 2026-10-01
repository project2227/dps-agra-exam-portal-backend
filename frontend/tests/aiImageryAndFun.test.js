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
test('Fun break external link is opt-in, visible, separate and safely opens a new tab',()=>{
 const home=source('pages/LandingPage.jsx')
 const nav=source('components/layout/Navbar.jsx')
 const footer=source('components/layout/Footer.jsx')
 for(const text of [home,nav,footer]){
  assert.match(text,/https:\/\/amongus\.free\.page\//)
  assert.match(text,/target="_blank"/)
  assert.match(text,/noopener noreferrer nofollow/)
 }
 assert.match(home,/unverified external website/)
})