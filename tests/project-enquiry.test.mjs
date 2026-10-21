import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, afterEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://example.test/projects/arudra',
})
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Initialise React DOM after the document, so controlled input events work.
const React = require('react')
const { act } = React
const { createRoot } = require('react-dom/client')
const originalFetch = globalThis.fetch
globalThis.fetch = async () => {
  throw new Error('Project enquiry regression tests must never call a live API')
}

let root
let container

// These are the six CMS project identities. TJR deliberately includes trailing
// whitespace to protect exact lead attribution from presentation normalisation.
const projects = [
  { name: 'ARUDRA EXOTICA EARTHSTAY VILLAS', location: 'Banglore Highway near to Kothur', cmsSlug: 'arudra', pageSlug: 'arudra', dynamic: true },
  { name: 'RPL COUNTY', location: 'Banglore Highway near kothur', cmsSlug: 'rpl-county', pageSlug: 'rpl-county', dynamic: true },
  { name: 'S.V.KANAKA MAPLE HOMES', location: 'Yadigiri Gutta Temple near Mallapur village', cmsSlug: 's-v-kanaka-maple-homes', pageSlug: 'sv-kanaka-maple-homes' },
  { name: 'VIAN VALLEY', location: 'SHABAD', cmsSlug: 'vian-valley', pageSlug: 'vian-vally' },
  { name: 'TJR TownShip  ', location: 'SANGAREDDY JUNCTION ', cmsSlug: 'tjr-township', pageSlug: 'tjr-township' },
  { name: 'VAIBHAV COUNTY', location: 'SADASHIVPET', cmsSlug: 'vaibhav-county', pageSlug: 'vaibhav-county' },
]

function sourceLoader(mocks = {}) {
  const modules = new Map()
  function loadSource(relativePath) {
    const filename = resolve(repositoryRoot, relativePath)
    if (modules.has(filename)) return modules.get(filename).exports
    const loadedModule = { exports: {} }
    modules.set(filename, loadedModule)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText
    function localRequire(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (name.startsWith('@/')) {
        const stem = `src/${name.slice(2)}`
        const source = ['.ts', '.tsx'].map(extension => stem + extension)
          .find(candidate => existsSync(resolve(repositoryRoot, candidate)))
        assert.ok(source, `Cannot resolve source module ${name}`)
        return loadSource(source)
      }
      return require(name)
    }
    new Function('require', 'module', 'exports', code)(localRequire, loadedModule, loadedModule.exports)
    return loadedModule.exports
  }
  return loadSource
}

async function mountProjectPage(project) {
  const calls = { formProps: [], detailProps: [], leads: [], navigation: [] }
  const cmsProject = {
    ...project,
    slug: { current: project.cmsSlug },
    description: 'Project information supplied by the CMS.',
    googleMapsUrl: `https://maps.example.test/${project.cmsSlug}`,
  }
  const mocks = {
    'next/navigation': {
      useRouter: () => ({ push: url => calls.navigation.push(url) }),
      notFound: () => { throw new Error('Fixture project unexpectedly returned notFound') },
    },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    '@/lib/sanity': {
      projectByNameQuery: 'project-by-name',
      projectBySlugQuery: 'project-by-slug',
      projectSlugsQuery: 'project-slugs',
      sanityFetch: async ({ query, params }) => {
        if (query === 'project-by-name') assert.ok(project.name.startsWith(params.name))
        else assert.equal(params.slug, project.cmsSlug)
        return cmsProject
      },
    },
    '@/lib/hooks/useOtpConfig': {
      useOtpConfig: () => ({
        isOtpEnabled: false,
        isLoading: false,
        hasError: false,
        retryOtpConfig() {},
      }),
    },
    '@/lib/lead-submission': {
      submitContactLead: async data => {
        calls.leads.push(data)
        return { leadId: 'offline-regression-lead' }
      },
    },
    '@/lib/lead-attribution': { getLeadAttribution: () => ({ utm_source: 'offline-regression' }) },
    '@/lib/gtag': { fireLeadConversion() {}, trackEnquiryStep() {} },
    '@/lib/firebase/phone-otp': {
      loadPhoneAuth: async () => { throw new Error('No live SMS is permitted in this test') },
    },
    // Media and download behaviour is separate from this regression. Preserve
    // the enquiry destination passed by the real page for the routing assertion.
    '@/components/ui/ProjectDetailActions': {
      ProjectDetailActions: props => {
        calls.detailProps.push(props)
        return React.createElement('a', { href: props.enquiryLink }, 'Enquire Now')
      },
    },
  }
  const loadSource = sourceLoader(mocks)
  const { ContactForm } = loadSource('src/components/ui/ContactForm.tsx')
  mocks['@/components/ui/ContactForm'] = {
    ContactForm: props => {
      calls.formProps.push(props)
      return React.createElement(ContactForm, props)
    },
  }

  let page
  if (project.dynamic) {
    const { default: ProjectPage } = loadSource('src/app/(public)/projects/[slug]/page.tsx')
    page = await ProjectPage({ params: Promise.resolve({ slug: project.cmsSlug }) })
  } else {
    const { default: ProjectPage } = loadSource(`src/app/(public)/projects/${project.pageSlug}/page.tsx`)
    const serverComponent = ProjectPage()
    page = await serverComponent.type(serverComponent.props)
  }

  dom.reconfigure({ url: `https://example.test/projects/${project.pageSlug}` })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(page))
  return { calls, cmsProject }
}

async function fillAndSubmit() {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    for (const [name, value] of [['name', 'Offline regression test'], ['phone', '9000000000']]) {
      const input = container.querySelector(`[name="${name}"]`)
      setter.call(input, value)
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    }
    container.querySelector('[name="agree"]').click()
  })
  assert.equal(container.querySelector('form').checkValidity(), true)
  await act(async () => {
    container.querySelector('form').dispatchEvent(
      new dom.window.Event('submit', { bubbles: true, cancelable: true }),
    )
  })
}

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  container?.remove()
  container = null
})

after(() => {
  globalThis.fetch = originalFetch
  dom.window.close()
})

for (const project of projects) {
  test(`${project.pageSlug}: the page sends an enquiry for its exact CMS project`, async () => {
    const { calls, cmsProject } = await mountProjectPage(project)

    assert.equal(container.querySelectorAll('#book-visit').length, 1, 'Only one local enquiry target is allowed')
    assert.equal(container.querySelectorAll('form').length, 1, 'Every project must expose exactly one inline form')
    const section = container.querySelector('#book-visit')
    const heading = section.querySelector(`#${section.getAttribute('aria-labelledby')}`)
    assert.equal(heading?.tagName, 'H2')
    assert.match(heading.textContent, /quote.*site visit/i)

    const props = calls.formProps.at(-1)
    assert.equal(props.initialProject, project.name)
    assert.deepEqual(props.projectsList, [{ name: project.name, location: project.location }])
    assert.equal(props.compact, true)
    assert.deepEqual(
      Array.from(section.querySelectorAll('input, select, textarea'), field => field.name).sort(),
      ['agree', 'name', 'phone'],
      'Project enquiries should only request name, phone and consent',
    )
    assert.deepEqual(
      Array.from(section.querySelectorAll('[required]'), field => field.name).sort(),
      ['agree', 'name', 'phone'],
    )
    assert.equal(section.querySelector('[name="agree"]').checked, false, 'Consent must remain opt-in')
    assert.ok(section.querySelector('a[href="/policies"]'))

    const enquiryLinks = Array.from(container.querySelectorAll('a[href*="#book-visit"]'))
    assert.ok(enquiryLinks.length >= 3, 'Hero, project actions and footer must all lead to the form')
    assert.ok(enquiryLinks.every(link => link.getAttribute('href') === '#book-visit'))
    assert.equal(calls.detailProps.at(-1).enquiryLink, '#book-visit')
    assert.equal(
      container.querySelector('.editorial-banner a[target="_blank"]')?.getAttribute('href'),
      cmsProject.googleMapsUrl,
      'The hero location link must retain the current CMS map',
    )

    await fillAndSubmit()
    assert.equal(calls.leads.length, 1)
    assert.equal(calls.leads[0].project, project.name, 'The saved identity must not be a formatted display name')
    assert.equal(calls.leads[0].location, project.location)
    assert.equal(calls.leads[0].enquiryType, 'Pricing Details', 'Keep existing compact-form attribution')
    assert.match(calls.leads[0].sourcePage, new RegExp(`/projects/${project.pageSlug}`))
    assert.deepEqual(calls.navigation, ['/thank-you'])

    if (project.pageSlug === 'arudra') {
      const pricing = container.querySelector('[aria-labelledby="arudra-pricing-title"]')
      assert.ok(pricing)
      assert.match(pricing.textContent, /₹21,XXX/)
      assert.match(pricing.textContent, /₹32,XX,XXX/)
      assert.match(pricing.textContent, /150\s*sq\. yd\./)
    }
  })
}

test('project enquiry links use canonical local pages and preserve the unknown-project fallback', () => {
  const { projectEnquiryHref, matchEnquiryProject } = sourceLoader()('src/lib/project-links.ts')
  for (const project of projects) {
    assert.equal(
      projectEnquiryHref(project.name, project.cmsSlug),
      `/projects/${project.pageSlug}#book-visit`,
    )
  }

  const projectName = 'New Project & Phase 2 '
  const fallback = new URL(projectEnquiryHref(projectName), 'https://example.test')
  assert.equal(fallback.pathname, '/')
  assert.equal(fallback.hash, '#book-visit')
  assert.equal(fallback.searchParams.get('project'), projectName)
  assert.equal(projectEnquiryHref(projectName, ''), projectEnquiryHref(projectName))
  assert.equal(matchEnquiryProject(projects, projectName), undefined, 'Unknown names must not select another project')
  assert.strictEqual(matchEnquiryProject(projects, 'TJR Township'), projects[4])
  assert.strictEqual(matchEnquiryProject(projects, 'Vian Vally'), projects[3])
})

test('site navigation keeps project and video visitors on the matching enquiry path', () => {
  const { projectVisitHref } = sourceLoader()('src/lib/project-links.ts')
  for (const project of projects) {
    assert.equal(projectVisitHref(`/projects/${project.pageSlug}`), '#book-visit')
    assert.equal(
      projectVisitHref(`/projects/${project.cmsSlug}/videos`),
      `/projects/${project.pageSlug}#book-visit`,
    )
  }
  assert.equal(projectVisitHref('/projects'), '/#book-visit')
  assert.equal(projectVisitHref('/shabad-open-plots'), '#book-visit')
  assert.equal(projectVisitHref('/blog/buying-plots'), '/#book-visit')
})
