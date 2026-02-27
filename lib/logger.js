export function logInfo(message, data = {}) {
  console.log(
    JSON.stringify({
      level: 'info',
      message,
      ts: new Date().toISOString(),
      ...data,
    })
  )
}

export function logError(message, error, data = {}) {
  console.error(
    JSON.stringify({
      level: 'error',
      message,
      ts: new Date().toISOString(),
      error: error?.message || String(error),
      ...(error?.stack ? { stack: error.stack } : {}),
      ...data,
    })
  )
}
