const test = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const request = require('supertest')

const PORT = process.env.API_TEST_PORT || 4010
const BASE_URL = `http://127.0.0.1:${PORT}`

let devProcess = null

function waitForReady(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Next dev server did not start in time'))
    }, 60000)

    const onData = (data) => {
      const text = data.toString()
      if (text.includes('started server') || text.includes('Ready in') || text.includes('ready - started server')) {
        clearTimeout(timeout)
        resolve()
      }
    }

    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    proc.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Next dev server exited (${code})`))
    })
  })
}

async function startServer() {
  devProcess = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(PORT)],
    {
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'demo',
        NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || 'demo',
        CLOUDCONVERT_API_KEY: process.env.CLOUDCONVERT_API_KEY || 'demo',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  await waitForReady(devProcess)
}

async function stopServer() {
  if (!devProcess) return
  devProcess.kill('SIGTERM')
  await new Promise((resolve) => setTimeout(resolve, 1000))
  devProcess.kill('SIGKILL')
  devProcess = null
}

test.before(async () => {
  await startServer()
})

test.after(async () => {
  await stopServer()
})

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
