const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const PORT = process.env.API_TEST_PORT || 4010
const BASE_URL = `http://127.0.0.1:${PORT}`

test('GET /api/epub without url returns 400', async () => {
  await request(BASE_URL).get('/api/epub').expect(400)
})

test('GET /api/text with invalid host returns 400', async () => {
  await request(BASE_URL)
    .get('/api/text?url=https://example.com/file.txt')
    .expect(400)
})

test('POST /api/convert/ebook without sourceUrl returns 400', async () => {
  const res = await request(BASE_URL)
    .post('/api/convert/ebook')
    .send({ filename: 'Test' })
    .expect(400)
  assert.match(res.text, /sourceUrl is required/i)
})
