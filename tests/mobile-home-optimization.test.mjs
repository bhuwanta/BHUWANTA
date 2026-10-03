import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const cssContent = await readFile(
  new URL('../src/app/public-theme.css', import.meta.url),
  'utf8'
)
const navbarContent = await readFile(
  new URL('../src/components/layout/Navbar.tsx', import.meta.url),
  'utf8'
)
const contactFormContent = await readFile(
  new URL('../src/components/ui/ContactForm.tsx', import.meta.url),
  'utf8'
)
const homePageContent = await readFile(
  new URL('../src/app/(public)/page.tsx', import.meta.url),
  'utf8'
)

test('mobile home hotfix: #nav-mobile-toggle has shrink-0 to prevent top-right cutoff', () => {
  assert.match(
    navbarContent,
    /id="nav-mobile-toggle"[^>]*shrink-0/,
    'Mobile toggle button must have shrink-0 so it is not crushed by flex siblings'
  )
})

test('mobile home hotfix: #nav-cta and #nav-login are explicitly hidden on mobile (< 640px)', () => {
  assert.match(
    cssContent,
    /\.public-nav\s+#nav-cta,\s*\.public-nav\s+#nav-login\s*\{[^}]*display:\s*none\s*!important;/s,
    'public-theme.css must hide #nav-cta and #nav-login by default on mobile'
  )
  assert.match(
    cssContent,
    /@media\s*\(\s*min-width:\s*640px\s*\)[\s\S]*?\.public-nav\s+#nav-cta,\s*\.public-nav\s+#nav-login[\s\S]*?display:\s*inline-flex\s*!important;/s,
    'public-theme.css must restore #nav-cta and #nav-login on screens >= 640px'
  )
})

test('mobile home hotfix: .btn-solid and .btn-outline use :where() to preserve utility classes like hidden', () => {
  assert.match(
    cssContent,
    /:where\(\.btn-outline\)/,
    'Button styles for .btn-outline must use :where() to maintain lower specificity than utility classes'
  )
  assert.match(
    cssContent,
    /:where\(\.btn-solid\)/,
    'Button styles for .btn-solid must use :where() to maintain lower specificity than utility classes'
  )
})

test('mobile home hotfix: hero highlight carousel buttons maintain 1:1 circular proportions', () => {
  // In public-theme.css, controls button must have equal width and height (42px by 42px), avoiding oval distortion
  assert.match(
    cssContent,
    /\.hero-highlight-controls\s+button\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px;/s,
    'Hero highlight control buttons must be 42px by 42px so border-radius: 50% renders as a circle'
  )
})

test('mobile home hotfix: hero highlight rail uses x-axis scroll snapping and hides scrollbar', () => {
  assert.match(
    cssContent,
    /scroll-snap-type:\s*x\s+mandatory/,
    'Rail must have scroll-snap-type: x mandatory for smooth mobile paging'
  )
  assert.match(
    cssContent,
    /scrollbar-width:\s*none/,
    'Rail must hide scrollbar on mobile browsers'
  )
})

test('mobile home hotfix: hero highlight rail reserves end padding so last card does not collide with WhatsApp button', () => {
  assert.match(
    cssContent,
    /padding-inline-end:\s*68px/,
    'Rail must have padding-inline-end: 68px on mobile to leave space for WhatsApp button'
  )
})

test('mobile home hotfix: ContactForm supports hideTitle prop to eliminate duplicate headings', () => {
  assert.match(
    contactFormContent,
    /hideTitle\?:?\s*boolean/,
    'ContactFormProps must declare optional hideTitle boolean prop'
  )
  assert.match(
    contactFormContent,
    /!hideTitle\s*&&/,
    'ContactForm must conditionally render title heading based on !hideTitle'
  )
})

test('mobile home hotfix: Home page passes hideTitle to ContactForm booking section', () => {
  assert.match(
    homePageContent,
    /<ContactForm[^>]*hideTitle[^>]*\/>/,
    'Home page booking section must pass hideTitle to ContactForm to prevent duplicate h3 headings'
  )
})
