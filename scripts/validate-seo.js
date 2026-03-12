#!/usr/bin/env node
/**
 * Validate SEO assets: sitemap.xml exists and is valid XML, robots.txt exists and references sitemap.
 * Run: node scripts/validate-seo.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SITEMAP_PATH = path.join(ROOT, 'public', 'sitemap.xml')
const ROBOTS_PATH = path.join(ROOT, 'public', 'robots.txt')
const SITEMAP_URL = 'https://docs.pinarkive.com/sitemap.xml'

let errors = 0

function fail(msg) {
  console.error('ERROR:', msg)
  errors++
}

function ok(msg) {
  console.log('OK:', msg)
}

// 1. Sitemap exists
if (!fs.existsSync(SITEMAP_PATH)) {
  fail('public/sitemap.xml not found. Run: npm run sitemap')
} else {
  ok('public/sitemap.xml exists')
  const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8')
  // Basic XML check
  if (!sitemap.includes('<urlset') || !sitemap.includes('</urlset>')) {
    fail('sitemap.xml does not look like a valid urlset')
  } else {
    ok('sitemap.xml has valid urlset')
  }
  if (!sitemap.includes('<loc>')) {
    fail('sitemap.xml has no <loc> entries')
  } else {
    const locCount = (sitemap.match(/<loc>/g) || []).length
    ok(`sitemap has ${locCount} URLs`)
  }
  if (!sitemap.includes('<lastmod>')) {
    fail('sitemap.xml has no <lastmod> (recommended for SEO)')
  } else {
    ok('sitemap has <lastmod> entries')
  }
}

// 2. robots.txt exists and references sitemap
if (!fs.existsSync(ROBOTS_PATH)) {
  fail('public/robots.txt not found')
} else {
  ok('public/robots.txt exists')
  const robots = fs.readFileSync(ROBOTS_PATH, 'utf8')
  if (!robots.includes('Sitemap:') || !robots.includes('sitemap.xml')) {
    fail('robots.txt does not reference sitemap.xml')
  } else {
    ok('robots.txt references sitemap')
  }
  if (!robots.includes('Allow:') && !robots.includes('User-agent')) {
    fail('robots.txt should have User-agent and Allow for crawlers')
  }
}

// 3. All doc pages have frontmatter title (quick check on one)
const indexMdx = path.join(ROOT, 'pages', 'index.mdx')
if (fs.existsSync(indexMdx)) {
  const content = fs.readFileSync(indexMdx, 'utf8')
  if (!content.startsWith('---') || !content.includes('title:')) {
    fail('pages/index.mdx should have frontmatter with title')
  } else {
    ok('index.mdx has frontmatter title')
  }
}

if (errors > 0) {
  console.error('\nValidation failed with', errors, 'error(s).')
  process.exit(1)
}

console.log('\nSEO validation passed.')
process.exit(0)
