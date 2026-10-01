import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('all navigation and homepage game-break links stay inside DPS Lab', () => {
  const files = [
    'src/components/layout/Footer.jsx',
    'src/components/layout/Navbar.jsx',
    'src/pages/LandingPage.jsx',
  ]
  for (const filename of files) {
    const source = readFileSync(filename, 'utf8')
    assert.doesNotMatch(source, /amongus\.free\.page|unverified external gaming website/i)
    assert.match(source, /to="\/learn\/arcade"/)
  }
})
