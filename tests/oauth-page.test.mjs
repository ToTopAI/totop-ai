import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { callbackPage, callbackLocale, callbackLocales } from '../shared/oauth-page.mjs'

test('callback locale negotiates the fourteen platform languages and rejects untrusted input', () => {
  assert.equal(callbackLocales.length, 14)
  for (const language of callbackLocales) assert.equal(callbackLocale(language), language)
  assert.equal(callbackLocale('en;q=0.3, zh-Hant-HK;q=0.9'), 'zh-TW')
  assert.equal(callbackLocale('zh-Hans-CN'), 'zh-CN')
  assert.equal(callbackLocale('fr;q=0, de;q=0.8'), 'de')
  assert.equal(callbackLocale('fr;q=2, es;q=NaN, unknown'), 'en')
  assert.equal(callbackLocale('<script>alert(1)</script>'), 'en')
})
test('callback UI is self-contained, RTL-aware, accessible and does not promise a completed connection', () => {
  for (const language of callbackLocales) {
    for (const state of ['received', 'error']) {
      const page = callbackPage({ language, state })
      assert.ok(page.html.startsWith('<!doctype html>'))
      assert.ok(page.html.includes(`lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"`))
      assert.ok(page.html.includes('aria-labelledby="title"'))
      assert.ok(page.html.includes('prefers-reduced-motion'))
      assert.ok(page.html.includes('name="viewport"'))
      assert.ok(page.html.includes('<details><summary>'))
      assert.equal(page.headers['Cache-Control'], 'no-store')
      assert.equal(page.headers['Referrer-Policy'], 'no-referrer')
      assert.equal(page.headers['X-Content-Type-Options'], 'nosniff')
      for (const tag of ['style', 'script']) {
        const content = page.html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))[1]
        assert.ok(page.headers['Content-Security-Policy'].includes(`${tag}-src 'sha256-${createHash('sha256').update(content).digest('base64')}'`))
      }
      assert.equal(/<(?:script|img|link)\b[^>]*(?:src|href)=/i.test(page.html), false)
    }
  }
  assert.ok(callbackPage().html.includes('does not confirm a completed connection'))
  const malicious = callbackPage({ state: '<script>secret</script>', language: '<img src=x>' })
  assert.equal(malicious.html.includes('secret'), false)
  assert.equal(malicious.headers['Content-Language'], 'en')
  assert.ok(malicious.html.includes('location.pathname'))
  assert.ok(malicious.headers['Content-Security-Policy'].includes("frame-ancestors 'none'"))
})
