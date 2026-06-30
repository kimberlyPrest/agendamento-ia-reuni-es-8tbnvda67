routerAdd('POST', '/backend/v1/tally/webhook', (e) => {
  const body = e.requestInfo().body || {}

  const signingSecret = $secrets.get('TALLY_SIGNING_SECRET') || ''
  const signatureHeader = e.request.header.get('tally-signature') || ''
  if (signingSecret) {
    const signature = signatureHeader.replace(/^sha256=/, '')
    const bodyStr = JSON.stringify(body)
    const computed = $security.hs256(bodyStr, signingSecret)
    if (
      computed !== signature &&
      String(computed).toLowerCase() !== String(signature).toLowerCase()
    ) {
      return e.json(401, { error: 'Invalid Tally signature' })
    }
  }

  const emails = []
  const collectEmails = (value) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((v) => collectEmails(v))
      return
    }
    if (typeof value === 'object') {
      Object.keys(value).forEach((k) => collectEmails(value[k]))
      return
    }
    String(value)
      .split(/[\s,;<>"'()]+/)
      .forEach((s) => {
        const normalized = s.trim().toLowerCase()
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && emails.indexOf(normalized) === -1) {
          emails.push(normalized)
        }
      })
  }
  collectEmails(body)

  if (!emails.length) {
    try {
      const logRecord = new Record($app.findCollectionByNameOrId('sync_logs'))
      logRecord.set('source', 'tally_webhook')
      logRecord.set('status', 'error')
      logRecord.set('checked', 1)
      logRecord.set('updated_count', 0)
      logRecord.set('message', 'Tally submission received without a recognizable email address.')
      logRecord.set('payload', body)
      $app.save(logRecord)
    } catch (_) {}
    return e.json(400, { error: 'No email found in Tally submission' })
  }

  const data = body.data || body
  const submissionId = data.submissionId || data.responseId || body.eventId || ''
  const submittedAt = data.submittedAt || data.createdAt || body.createdAt || ''

  let parsedDate = null
  if (submittedAt) {
    const d = new Date(String(submittedAt).replace(' ', 'T'))
    if (!isNaN(d.getTime())) parsedDate = d
  }

  const pbDate = (date) => date.toISOString().replace('T', ' ')

  const escapeFilterValue = (value) =>
    String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")

  let updated = 0
  let notFound = 0

  emails.forEach((email) => {
    let client = null
    try {
      client = $app.findFirstRecordByData('clients', 'email', email)
    } catch (_) {
      try {
        client = $app.findFirstRecordByFilter(
          'clients',
          "email = '" + escapeFilterValue(email) + "'",
        )
      } catch (_) {}
    }

    if (!client) {
      notFound += 1
      try {
        const logRecord = new Record($app.findCollectionByNameOrId('sync_logs'))
        logRecord.set('source', 'tally_webhook')
        logRecord.set('status', 'warning')
        logRecord.set('checked', 1)
        logRecord.set('updated_count', 0)
        logRecord.set('message', 'Tally submission received for unregistered email: ' + email)
        logRecord.set('payload', { email, submission_id: submissionId })
        $app.save(logRecord)
      } catch (_) {}
      return
    }

    client.set('form_answered', true)
    client.set('tally_submission_id', submissionId)
    if (parsedDate) {
      client.set('tally_answered_at', pbDate(parsedDate))
    }
    client.set('tally_payload', body)
    $app.save(client)
    updated += 1
  })

  return e.json(200, {
    processed: emails.length,
    updated: updated,
    not_found: notFound,
  })
})
