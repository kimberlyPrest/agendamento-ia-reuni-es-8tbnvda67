var eliteIntegrationsCronRunning = false

const ELITE_GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ELITE_GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const ELITE_TALLY_API_BASE = 'https://api.tally.so'
const ELITE_TALLY_FORM_ID = 'wdRX0N'
const ELITE_TLDV_API_BASE = 'https://pasta.tldv.io/v1alpha1'

const eliteEnv = (key) => {
  try {
    return $os.getenv(key) || ''
  } catch (_) {
    return ''
  }
}

const eliteNormalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase()

const eliteParseDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = String(value).trim()
  if (!raw) return null
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw)
    const date = new Date(raw.length <= 10 ? numeric * 1000 : numeric)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(raw.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

const elitePbDate = (date) => date.toISOString().replace('T', ' ')
const eliteEscapeFilterValue = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")

const eliteWriteSyncLog = (source, status, checked, updated, message, payload) => {
  try {
    const record = new Record($app.findCollectionByNameOrId('sync_logs'))
    record.set('source', source)
    record.set('status', status)
    record.set('checked', checked || 0)
    record.set('updated_count', updated || 0)
    record.set('message', message || '')
    record.set('payload', payload || {})
    $app.save(record)
  } catch (_) {}
}

const eliteFormEncode = (params) =>
  Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

const eliteCollectEmails = (value, emails) => {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item) => eliteCollectEmails(item, emails))
    return
  }
  if (typeof value === 'object') {
    Object.keys(value).forEach((key) => eliteCollectEmails(value[key], emails))
    return
  }
  String(value)
    .split(/[\s,;<>"'()]+/)
    .map((item) => eliteNormalizeEmail(item))
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
    .forEach((email) => {
      if (emails.indexOf(email) === -1) emails.push(email)
    })
}

const eliteFindClientByEmail = (email) => {
  const normalized = eliteNormalizeEmail(email)
  try {
    return $app.findFirstRecordByData('clients', 'email', normalized)
  } catch (_) {
    try {
      return $app.findFirstRecordByData('clients', 'email', email)
    } catch (_) {
      return null
    }
  }
}

const eliteSyncTallyAnsweredClients = () => {
  const apiKey = eliteEnv('TALLY_API_KEY')
  if (!apiKey) return { enabled: false, checked: 0, updated: 0, matched_emails: 0 }
  const formId = eliteEnv('TALLY_FORM_ID') || ELITE_TALLY_FORM_ID
  let page = 1
  let hasMore = true
  let checked = 0
  let updated = 0
  const seenEmails = {}
  while (hasMore && page <= 20) {
    const res = $http.send({
      url: `${ELITE_TALLY_API_BASE}/forms/${formId}/submissions?page=${page}&limit=500&filter=completed`,
      method: 'GET',
      headers: { authorization: `Bearer ${apiKey}` },
      timeout: 30,
    })
    if (res.statusCode < 200 || res.statusCode >= 300) {
      const detail = (res.json || {}).message || (res.json || {}).error || res.raw || ''
      throw new Error(detail || 'Tally API recusou a sincronizacao.')
    }
    const data = res.json || {}
    const submissions = data.submissions || []
    checked += submissions.length
    submissions.forEach((submission) => {
      const emails = []
      eliteCollectEmails(submission, emails)
      emails.forEach((email) => {
        if (seenEmails[email]) return
        seenEmails[email] = true
        const client = eliteFindClientByEmail(email)
        if (!client) return
        if (!client.get('form_answered')) updated += 1
        client.set('form_answered', true)
        client.set('tally_submission_id', submission.id || '')
        client.set(
          'tally_answered_at',
          elitePbDate(eliteParseDate(submission.submittedAt || submission.createdAt) || new Date()),
        )
        client.set('tally_payload', submission)
        $app.save(client)
      })
    })
    hasMore = Boolean(data.hasMore)
    page += 1
  }
  return {
    enabled: true,
    form_id: formId,
    checked,
    updated,
    matched_emails: Object.keys(seenEmails).length,
  }
}

const eliteGoogleConfigReady = () =>
  Boolean(eliteEnv('GOOGLE_CLIENT_ID') && eliteEnv('GOOGLE_CLIENT_SECRET'))
const eliteConfiguredGoogleCalendarIds = (consultant) => {
  const raw = consultant.get('google_calendar_id') || 'primary'
  const ids = String(raw)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item)
  return ids.length ? ids : ['primary']
}

const eliteRefreshGoogleAccessToken = (consultant) => {
  const currentToken = consultant.get('google_access_token') || ''
  const expiry = eliteParseDate(consultant.get('google_token_expiry'))
  if (currentToken && expiry && expiry.getTime() > Date.now() + 120000) return currentToken
  const refreshToken = consultant.get('google_refresh_token') || ''
  if (!refreshToken || !eliteGoogleConfigReady()) return ''
  const res = $http.send({
    url: ELITE_GOOGLE_TOKEN_URL,
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: eliteFormEncode({
      client_id: eliteEnv('GOOGLE_CLIENT_ID'),
      client_secret: eliteEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    timeout: 30,
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    consultant.set('google_sync_status', 'token_error')
    $app.save(consultant)
    return ''
  }
  const data = res.json || {}
  if (!data.access_token) return ''
  consultant.set('google_access_token', data.access_token)
  consultant.set(
    'google_token_expiry',
    elitePbDate(new Date(Date.now() + Number(data.expires_in || 3600) * 1000)),
  )
  consultant.set('google_sync_status', 'connected')
  $app.save(consultant)
  return data.access_token
}

const eliteGoogleCalendarList = (consultant, accessToken) => {
  const query = eliteFormEncode({
    minAccessRole: 'freeBusyReader',
    showDeleted: 'false',
    showHidden: 'false',
    maxResults: 250,
  })
  const res = $http.send({
    url: `${ELITE_GOOGLE_CALENDAR_BASE}/users/me/calendarList?${query}`,
    method: 'GET',
    headers: { authorization: `Bearer ${accessToken}` },
    timeout: 30,
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const detail = ((res.json || {}).error || {}).message || ''
    throw new Error(detail || 'Google Calendar recusou a lista de agendas.')
  }
  return ((res.json || {}).items || []).filter((item) => item && item.id && !item.deleted)
}

const eliteSyncGoogleCalendars = () => {
  if (!eliteGoogleConfigReady()) return { enabled: false, checked: 0, updated: 0 }
  const consultants = $app.findRecordsByFilter(
    'consultants',
    "google_refresh_token != ''",
    'name',
    500,
    0,
  )
  let updated = 0
  let checked = 0
  consultants.forEach((consultant) => {
    checked += 1
    try {
      const token = eliteRefreshGoogleAccessToken(consultant)
      if (!token) return
      const calendars = eliteGoogleCalendarList(consultant, token)
      if (!consultant.get('google_calendar_id')) consultant.set('google_calendar_id', 'primary')
      consultant.set('google_sync_status', 'connected')
      $app.save(consultant)
      updated += calendars.length > 0 ? 1 : 0
    } catch (err) {
      consultant.set('google_sync_status', 'calendar_error')
      $app.save(consultant)
    }
  })
  return { enabled: true, checked, updated }
}

const eliteTldvRequest = (apiKey, path) => {
  const res = $http.send({
    url: `${ELITE_TLDV_API_BASE}${path}`,
    method: 'GET',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    timeout: 45,
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const detail = (res.json || {}).message || (res.json || {}).name || res.raw || ''
    throw new Error(detail || 'tl;dv recusou a requisicao.')
  }
  return res.json || {}
}

const eliteTldvMeetings = (apiKey) => {
  const meetings = []
  let page = 0
  let pages = 1
  while (page < pages && page < 10) {
    let data = null
    try {
      data = eliteTldvRequest(apiKey, `/meetings?page=${page}&pageSize=100`)
    } catch (err) {
      if (page > 0) throw err
      data = eliteTldvRequest(apiKey, '/meetings')
    }
    const results = data.results || data.meetings || []
    results.forEach((meeting) => meetings.push(meeting))
    if (data.pages !== undefined && data.pages !== null)
      pages = Math.max(1, Number(data.pages) || 1)
    else if (data.hasMore) pages = page + 2
    else pages = page + 1
    if (!results.length) break
    page += 1
  }
  return meetings
}

const eliteTranscriptToText = (transcript) =>
  ((transcript || {}).data || [])
    .map((item) => `${item.speaker || 'Participante'}: ${item.text || ''}`)
    .join('\n\n')

const eliteRemoteMeetingEmails = (meeting) => {
  const emails = []
  eliteCollectEmails(meeting.organizer, emails)
  eliteCollectEmails(meeting.invitees, emails)
  eliteCollectEmails(meeting.attendees, emails)
  eliteCollectEmails(meeting.participants, emails)
  eliteCollectEmails(meeting.extraProperties, emails)
  return emails
}

const eliteRemoteMeetingDate = (meeting) =>
  eliteParseDate(meeting.happenedAt || meeting.startedAt || meeting.startTime || meeting.createdAt)

const eliteRemoteMeetingEnd = (meeting, startedAt) => {
  const durationSeconds = Number(meeting.duration || 0)
  return new Date(
    startedAt.getTime() + (durationSeconds > 0 ? durationSeconds * 1000 : 60 * 60 * 1000),
  )
}

const eliteFindTldvMeeting = (clientId, tldvMeetingId) => {
  try {
    return (
      $app.findRecordsByFilter(
        'meetings',
        `client_id = '${eliteEscapeFilterValue(clientId)}' && tldv_meeting_id = '${eliteEscapeFilterValue(tldvMeetingId)}'`,
        '-start_time',
        1,
        0,
      )[0] || null
    )
  } catch (_) {
    return null
  }
}

const eliteFindNearestClientMeeting = (consultantId, clientId, startedAt) => {
  try {
    const meetings = $app.findRecordsByFilter(
      'meetings',
      `consultant_id = '${eliteEscapeFilterValue(consultantId)}' && client_id = '${eliteEscapeFilterValue(clientId)}' && status != 'cancelled'`,
      '-start_time',
      100,
      0,
    )
    let best = null
    let bestDelta = 48 * 60 * 60 * 1000
    meetings.forEach((meeting) => {
      const start = eliteParseDate(meeting.get('start_time'))
      if (!start) return
      const delta = Math.abs(start.getTime() - startedAt.getTime())
      if (delta < bestDelta) {
        best = meeting
        bestDelta = delta
      }
    })
    return best
  } catch (_) {
    return null
  }
}

const eliteUpsertTldvMeeting = (apiKey, consultant, client, remote) => {
  if (!remote.id) return { updated: false, created: false }
  const startedAt = eliteRemoteMeetingDate(remote)
  if (!startedAt) return { updated: false, created: false }
  const endedAt = eliteRemoteMeetingEnd(remote, startedAt)
  let meeting = eliteFindTldvMeeting(client.id, remote.id)
  let created = false
  if (!meeting) meeting = eliteFindNearestClientMeeting(consultant.id, client.id, startedAt)
  if (!meeting) {
    meeting = new Record($app.findCollectionByNameOrId('meetings'))
    meeting.set('client_id', client.id)
    meeting.set('consultant_id', consultant.id)
    meeting.set('program_id', client.get('program_id'))
    meeting.set('start_time', elitePbDate(startedAt))
    meeting.set('end_time', elitePbDate(endedAt))
    meeting.set('meeting_number', Math.max(1, Number(client.get('current_meeting_number') || 1)))
    meeting.set('source', 'tldv')
    created = true
  }
  if (!meeting.get('title')) meeting.set('title', remote.name || 'Reuniao Elite')
  if (!meeting.get('start_time')) meeting.set('start_time', elitePbDate(startedAt))
  if (!meeting.get('end_time')) meeting.set('end_time', elitePbDate(endedAt))
  meeting.set('status', 'completed')
  meeting.set('tldv_meeting_id', remote.id)
  meeting.set('tldv_url', remote.url || meeting.get('tldv_url') || '')
  meeting.set('recording_url', remote.url || meeting.get('recording_url') || '')
  if (!meeting.get('tldv_transcript_text')) {
    try {
      const transcript = eliteTldvRequest(apiKey, `/meetings/${remote.id}/transcript`)
      meeting.set('tldv_transcript', transcript)
      meeting.set('tldv_transcript_text', eliteTranscriptToText(transcript))
    } catch (_) {}
  }
  if (!meeting.get('tldv_notes_markdown')) {
    try {
      const notes = eliteTldvRequest(apiKey, `/meetings/${remote.id}/notes`)
      meeting.set('tldv_notes', notes)
      meeting.set('tldv_notes_markdown', notes.markdownContent || '')
    } catch (_) {}
  }
  meeting.set('tldv_synced_at', elitePbDate(new Date()))
  $app.save(meeting)
  return { updated: !created, created }
}

const eliteSyncTldv = () => {
  const consultants = $app.findRecordsByFilter('consultants', '', 'name', 500, 0)
  let checked = 0
  let matched = 0
  let updated = 0
  let created = 0
  let enabled = false
  consultants.forEach((consultant) => {
    const apiKey = consultant.get('tldv_api_key') || eliteEnv('TLDV_API_KEY')
    if (!apiKey) return
    enabled = true
    const clients = $app.findRecordsByFilter(
      'clients',
      `consultant_id = '${eliteEscapeFilterValue(consultant.id)}'`,
      'name',
      1000,
      0,
    )
    const clientsByEmail = {}
    clients.forEach((client) => {
      const email = eliteNormalizeEmail(client.get('email'))
      if (email) clientsByEmail[email] = client
    })
    const remoteMeetings = eliteTldvMeetings(apiKey)
    checked += remoteMeetings.length
    remoteMeetings.forEach((remote) => {
      const clientIds = {}
      eliteRemoteMeetingEmails(remote).forEach((email) => {
        const client = clientsByEmail[email]
        if (!client || clientIds[client.id]) return
        clientIds[client.id] = true
        matched += 1
        const result = eliteUpsertTldvMeeting(apiKey, consultant, client, remote)
        if (result.created) created += 1
        if (result.updated) updated += 1
      })
    })
  })
  return { enabled, checked, matched, updated, created }
}

cronAdd('elite_integrations_sync', '* * * * *', () => {
  if (eliteIntegrationsCronRunning) return
  eliteIntegrationsCronRunning = true
  const payload = {}
  const errors = []
  let checked = 0
  let updated = 0
  const runStep = (name, fn) => {
    try {
      const result = fn()
      payload[name] = result
      checked += Number((result && result.checked) || 0)
      updated += Number((result && result.updated + (result.created || 0)) || 0)
    } catch (err) {
      const message = err && err.message ? err.message : String(err)
      payload[name] = { error: message }
      errors.push(`${name}: ${message}`)
    }
  }
  try {
    runStep('tally', eliteSyncTallyAnsweredClients)
    runStep('google_calendar', eliteSyncGoogleCalendars)
    runStep('tldv', eliteSyncTldv)
    eliteWriteSyncLog(
      'integrations_cron',
      errors.length ? 'partial_error' : 'success',
      checked,
      updated,
      errors.length ? errors.join(' | ') : 'Integracoes sincronizadas automaticamente.',
      payload,
    )
  } finally {
    eliteIntegrationsCronRunning = false
  }
})
