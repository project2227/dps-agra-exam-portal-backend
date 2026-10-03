import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=x=>readFileSync('src/'+x,'utf8')
test('accessible onboarding has skip, first-visit memory, distinct intro animations, and replay',()=>{
 const tour=source('platform/GuidedIntro.jsx')
 const nav=source('components/layout/Navbar.jsx')
 assert.match(tour,/localStorage\.setItem\(key/)
 assert.match(tour,/Take a tour/)
 assert.match(tour,/ArrowRight/);assert.match(tour,/Skip tour/);assert.match(tour,/SCENES/)
 assert.match(nav,/dps:tour-replay/)
})
test('react routes expose offline practice generator and three hands-on arcade games',()=>{
 const app=source('InstituteApp.jsx')
 const games=source('pages/ArcadeLabs.jsx')
 assert.match(app,/path="\/learn\/custom-test"/)
 assert.match(app,/path="\/learn\/arcade"/)
 assert.match(games,/CircuitSwitch/)
 assert.match(games,/MemoryMatrix/)
 assert.match(games,/StackBuilder/)
})
