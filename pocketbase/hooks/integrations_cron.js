var eliteIntegrationsCronRunning = false

const ELITE_GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ELITE_GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const ELITE_TALLY_API_BASE = 'https://api.tally.so'
const ELITE_TALLY_FORM_ID = 'wdRX0N'
const ELITE_GOOGLE_SHEET_ID = '17hsd7jkpRtjKZa6_cXQ4CLSkvjPAVTLVmILebWqDWCs'
const ELITE_DEFAULT_CLIENT_PASSWORD = 'AdaptaElite26'
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

const eliteGoogleMeetLinkFromEvent = (event) => {
  if (event.hangoutLink) return event.hangoutLink
  const entry = ((event.conferenceData || {}).entryPoints || []).find(
    (item) => item.entryPointType === 'video',
  )
  return entry ? entry.uri : ''
}

const eliteSyncGoogleMeetings = () => {
  if (!eliteGoogleConfigReady()) return { enabled: false, checked: 0, updated: 0 }
  const consultants = $app.findRecordsByFilter(
    'consultants',
    "google_refresh_token != ''",
    'name',
    500,
    0,
  )
  let checked = 0
  let updated = 0
  let errors = 0
  consultants.forEach((consultant) => {
    const accessToken = eliteRefreshGoogleAccessToken(consultant)
    if (!accessToken) return
    let meetings = []
    try {
      meetings = $app.findRecordsByFilter(
        'meetings',
        `consultant_id = '${eliteEscapeFilterValue(consultant.id)}' && google_event_id != '' && status = 'scheduled'`,
        'start_time',
        500,
        0,
      )
    } catch (_) {
      meetings = []
    }
    meetings.forEach((meeting) => {
      checked += 1
      try {
        const eventId = meeting.get('google_event_id')
        const res = $http.send({
          url: `${ELITE_GOOGLE_CALENDAR_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`,
          method: 'GET',
          headers: { authorization: `Bearer ${accessToken}` },
          timeout: 30,
        })
        if (res.statusCode === 404 || res.statusCode === 410) {
          meeting.set('status', 'cancelled')
          $app.save(meeting)
          updated += 1
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          errors += 1
          return
        }
        const event = res.json || {}
        if (event.status === 'cancelled') {
          meeting.set('status', 'cancelled')
          $app.save(meeting)
          updated += 1
          return
        }
        const start = eliteParseDate((event.start || {}).dateTime || (event.start || {}).date)
        const end = eliteParseDate((event.end || {}).dateTime || (event.end || {}).date)
        if (start) meeting.set('start_time', elitePbDate(start))
        if (end) meeting.set('end_time', elitePbDate(end))
        if (event.summary) meeting.set('title', event.summary)
        meeting.set('google_html_link', event.htmlLink || meeting.get('google_html_link') || '')
        meeting.set(
          'meet_link',
          eliteGoogleMeetLinkFromEvent(event) || meeting.get('meet_link') || '',
        )
        $app.save(meeting)
        updated += 1
      } catch (_) {
        errors += 1
      }
    })
  })
  return { enabled: true, checked, updated, errors }
}

const eliteFindByData = (collection, field, value) => {
  try {
    return $app.findFirstRecordByData(collection, field, value)
  } catch (_) {
    return null
  }
}

const eliteFirstRecord = (collection, sort) => {
  try {
    return $app.findRecordsByFilter(collection, '', sort || '', 1, 0)[0] || null
  } catch (_) {
    return null
  }
}

const eliteEnsureUser = (email, name, userRole, password) => {
  const normalized = eliteNormalizeEmail(email)
  if (!normalized) return null
  const users = $app.findCollectionByNameOrId('_pb_users_auth_')
  let user = null
  try {
    user = $app.findAuthRecordByEmail('_pb_users_auth_', normalized)
  } catch (_) {}
  if (!user) {
    user = new Record(users)
    user.setEmail(normalized)
    user.setPassword(password || ELITE_DEFAULT_CLIENT_PASSWORD)
    user.setVerified(true)
  }
  if (name) user.set('name', name)
  user.set('role', userRole)
  $app.save(user)
  return user
}

const eliteEnsureDefaultProgram = () => {
  let program = eliteFirstRecord('programs', 'name')
  if (program) return program
  program = new Record($app.findCollectionByNameOrId('programs'))
  program.set('name', 'Elite')
  program.set('total_meetings', 2)
  program.set('meeting_duration', 75)
  program.set('title_template', 'Consultoria Elite - {client_name}')
  program.set('require_tally', true)
  program.set('allow_concurrent', false)
  program.set('max_future_meetings', 1)
  program.set('min_interval_days', 7)
  program.set('min_interval_unit', 'days')
  program.set('min_reschedule_hours', 24)
  program.set('late_reschedule_delay_days', 7)
  program.set('booking_window_days', 60)
  $app.save(program)
  return program
}

const eliteEnsureDefaultConsultant = () => {
  let consultant = eliteFirstRecord('consultants', 'name')
  if (consultant) return consultant
  consultant = new Record($app.findCollectionByNameOrId('consultants'))
  consultant.set('name', 'Consultor a definir')
  consultant.set('email', 'consultor@adapta.org')
  consultant.set('google_calendar_id', 'primary')
  consultant.set('working_timezone', 'America/Sao_Paulo')
  consultant.set('working_hours', {
    monday: [{ start: '09:00', end: '18:00' }],
    tuesday: [{ start: '09:00', end: '18:00' }],
    wednesday: [{ start: '09:00', end: '18:00' }],
    thursday: [{ start: '09:00', end: '18:00' }],
    friday: [{ start: '09:00', end: '18:00' }],
    saturday: [],
    sunday: [],
  })
  $app.save(consultant)
  return consultant
}

const eliteExternalId = (kind, id) => {
  if (!id) return null
  try {
    return $app.findFirstRecordByFilter(
      'external_ids',
      `kind = '${eliteEscapeFilterValue(kind)}' && external_id = '${eliteEscapeFilterValue(id)}'`,
    )
  } catch (_) {
    return null
  }
}

const eliteConsultantForOwner = (ownerId, fallbackName) => {
  const mapping = eliteExternalId('owner', ownerId)
  if (mapping && mapping.get('consultant_id')) {
    try {
      return $app.findRecordById('consultants', mapping.get('consultant_id'))
    } catch (_) {}
  }
  let consultant = eliteFindByData('consultants', 'hubspot_owner_id', ownerId)
  if (consultant) return consultant
  if (fallbackName) {
    try {
      consultant = $app.findFirstRecordByData('consultants', 'name', fallbackName)
      if (consultant) return consultant
    } catch (_) {}
  }
  return eliteEnsureDefaultConsultant()
}

const eliteProgramForStage = (stageId) => {
  const mapping = eliteExternalId('deal_stage', stageId)
  if (mapping && mapping.get('program_id')) {
    try {
      return $app.findRecordById('programs', mapping.get('program_id'))
    } catch (_) {}
  }
  return eliteEnsureDefaultProgram()
}

const eliteHeaderKey = (value) => {
  const replacements = {
    á: 'a',
    à: 'a',
    â: 'a',
    ã: 'a',
    ä: 'a',
    é: 'e',
    è: 'e',
    ê: 'e',
    ë: 'e',
    í: 'i',
    ì: 'i',
    î: 'i',
    ï: 'i',
    ó: 'o',
    ò: 'o',
    ô: 'o',
    õ: 'o',
    ö: 'o',
    ú: 'u',
    ù: 'u',
    û: 'u',
    ü: 'u',
    ç: 'c',
    ª: 'a',
    º: 'o',
  }
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[áàâãäéèêëíìîïóòôõöúùûüçªº]/g, (char) => replacements[char] || char)
}

const eliteDetectCsvDelimiter = (text) => {
  const firstLine =
    String(text || '')
      .split(/\r?\n/)
      .find((line) => line.trim()) || ''
  let quoted = false
  let commas = 0
  let semicolons = 0
  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index]
    const next = firstLine[index + 1]
    if (char === '"') {
      if (quoted && next === '"') index += 1
      else quoted = !quoted
    } else if (!quoted && char === ',') commas += 1
    else if (!quoted && char === ';') semicolons += 1
  }
  return semicolons > commas ? ';' : ','
}

const eliteParseCsv = (text) => {
  const delimiter = eliteDetectCsvDelimiter(text)
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"'
        index += 1
      } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      if (row.some((item) => String(item).trim() !== '')) rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  row.push(cell)
  if (row.some((item) => String(item).trim() !== '')) rows.push(row)
  return rows
}

const eliteRowValue = (row, headerMap, names) => {
  for (let index = 0; index < names.length; index += 1) {
    const column = headerMap[eliteHeaderKey(names[index])]
    if (column !== undefined) return String(row[column] || '').trim()
  }
  return ''
}

const eliteStageMeetingNumber = (stage) => {
  const match = eliteHeaderKey(stage).match(/(\d+)\s*(?:a|o)?/)
  if (match) return Number(match[1])
  const text = eliteHeaderKey(stage)
  const words = [
    ['primeira', 1],
    ['primeiro', 1],
    ['segunda', 2],
    ['segundo', 2],
    ['terceira', 3],
    ['terceiro', 3],
    ['quarta', 4],
    ['quarto', 4],
    ['quinta', 5],
    ['quinto', 5],
    ['sexta', 6],
    ['sexto', 6],
  ]
  const found = words.find((item) => text.includes(item[0]))
  return found ? found[1] : 0
}

const eliteStageProgress = (stageText, program, currentMeetingNumber) => {
  const text = eliteHeaderKey(stageText)
  const limit = Number(program.get('total_meetings') || 1)
  const number = eliteStageMeetingNumber(stageText)
  const hasFinalized = text.includes('finalizad')
  const hasPending = text.includes('pendent')
  const hasRefund =
    text.includes('reembolso') || text.includes('reembols') || text.includes('refund')
  const hasNoShow = text.includes('no show') || text.includes('noshow') || text.includes('no-show')
  let completed = Math.max(0, Number(currentMeetingNumber || 1) - 1)
  if (stageText) completed = 0
  if (hasRefund) completed = number > 0 ? Math.max(0, number - 1) : completed
  else if (hasNoShow && number > 0) completed = Math.max(0, number - 1)
  else if (hasFinalized && number > 0) completed = number
  else if (hasFinalized && number === 0) completed = limit
  else if (hasPending && number > 0) completed = Math.max(0, number - 1)
  completed = Math.max(0, Math.min(completed, limit))
  return { completed, next_meeting_number: completed + 1 }
}

const eliteSheetUrl = () =>
  eliteEnv('GOOGLE_SHEETS_CSV_URL') ||
  `https://docs.google.com/spreadsheets/d/${ELITE_GOOGLE_SHEET_ID}/export?format=csv&gid=0`

const eliteSyncSheetClients = () => {
  const res = $http.send({ url: eliteSheetUrl(), method: 'GET', timeout: 45 })
  if (res.statusCode < 200 || res.statusCode >= 300)
    throw new Error(
      'Nao foi possivel ler a planilha. Verifique o compartilhamento ou GOOGLE_SHEETS_CSV_URL.',
    )
  const rows = eliteParseCsv(res.raw || res.body || String(res.text || ''))
  if (rows.length < 2) return { enabled: true, checked: 0, updated: 0, imported: 0 }
  const headers = rows[0]
  const headerMap = {}
  headers.forEach((header, index) => {
    headerMap[eliteHeaderKey(header)] = index
  })
  let checked = 0
  let updated = 0
  const imported = []
  rows.slice(1).forEach((row, index) => {
    const email = eliteNormalizeEmail(eliteRowValue(row, headerMap, ['Email do contato', 'Email']))
    if (!email) return
    checked += 1
    const dealId = eliteRowValue(row, headerMap, [
      'Deal ID',
      'ID do negocio',
      'ID do negócio',
      'HubSpot Deal ID',
    ])
    const dealName = eliteRowValue(row, headerMap, ['Nome do negocio', 'Nome do negócio'])
    const stageId = eliteRowValue(row, headerMap, [
      'Etapa do negocio',
      'Etapa do negócio',
      'Status na pipe',
      'Status da pipe',
    ])
    const ownerId = eliteRowValue(row, headerMap, [
      'Proprietario do negocio',
      'Proprietário do negócio',
      'Nome do proprietario do negocio',
      'Nome do proprietário do negócio',
      'Owner',
    ])
    const firstConsultantKey = eliteRowValue(row, headerMap, [
      'Especialista Primeira Reuniao',
      'Especialista Primeira Reunião',
    ])
    const secondConsultantKey = eliteRowValue(row, headerMap, [
      'Especialista Segunda Reuniao',
      'Especialista Segunda Reunião',
    ])
    const name = eliteRowValue(row, headerMap, ['Nome do contato', 'Nome']) || dealName || email
    const phone = eliteRowValue(row, headerMap, [
      'Telefone do contato',
      'Telefone/WhatsApp',
      'Telefone',
    ])
    const stageMap = eliteExternalId('deal_stage', stageId)
    const ownerMap = eliteExternalId('owner', ownerId)
    const program = eliteProgramForStage(stageId)
    const consultant = eliteConsultantForOwner(ownerId, firstConsultantKey || secondConsultantKey)
    const user = eliteEnsureUser(email, name, 'client', ELITE_DEFAULT_CLIENT_PASSWORD)
    let client = dealId ? eliteFindByData('clients', 'hubspot_deal_id', dealId) : null
    if (!client) client = eliteFindByData('clients', 'email', email)
    if (!client) client = new Record($app.findCollectionByNameOrId('clients'))
    client.set('email', email)
    client.set('name', name)
    client.set('program_id', program.id)
    client.set('consultant_id', consultant.id)
    client.set('user_id', user ? user.id : '')
    client.set('hubspot_deal_id', dealId)
    client.set('deal_name', dealName)
    client.set('deal_stage_id', stageId)
    client.set('deal_stage_name', stageMap ? stageMap.get('name') : stageId)
    client.set('deal_owner_id', ownerId)
    client.set('deal_owner_name', ownerMap ? ownerMap.get('name') : ownerId)
    client.set('contact_phone', phone)
    const closedAt = eliteParseDate(eliteRowValue(row, headerMap, ['Data de fechamento']))
    const firstCallAt = eliteParseDate(
      eliteRowValue(row, headerMap, ['Data 1a Call', 'Data 1ª Call']),
    )
    const secondCallAt = eliteParseDate(
      eliteRowValue(row, headerMap, ['Data 2a Call', 'Data 2ª Call']),
    )
    if (closedAt) client.set('closed_at', elitePbDate(closedAt))
    if (firstCallAt) client.set('first_call_at', elitePbDate(firstCallAt))
    if (secondCallAt) client.set('second_call_at', elitePbDate(secondCallAt))
    client.set('first_call_consultant_key', firstConsultantKey)
    client.set('second_call_consultant_key', secondConsultantKey)
    client.set('sheet_row_number', index + 2)
    client.set('sheet_payload', { headers, row })
    client.set('sheet_synced_at', elitePbDate(new Date()))
    const progress = eliteStageProgress(
      stageMap ? stageMap.get('name') : stageId,
      program,
      client.get('current_meeting_number'),
    )
    client.set('current_meeting_number', progress.next_meeting_number)
    if (client.get('form_answered') === null || client.get('form_answered') === undefined)
      client.set('form_answered', false)
    $app.save(client)
    updated += 1
    imported.push({ id: client.id, email, name })
  })
  eliteWriteSyncLog('google_sheets', 'success', checked, updated, 'Clientes sincronizados.', {
    url: eliteSheetUrl(),
    imported: imported.slice(0, 50),
  })
  return { enabled: true, checked, updated, imported: imported.length }
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
  const remoteUpdatedAt = eliteParseDate(
    remote.updatedAt ||
      remote.updated_at ||
      remote.modifiedAt ||
      remote.transcriptUpdatedAt ||
      remote.notesUpdatedAt,
  )
  const lastSyncedAt = eliteParseDate(meeting.get('tldv_synced_at'))
  const shouldRefreshDetails =
    created || !lastSyncedAt || (remoteUpdatedAt && remoteUpdatedAt > lastSyncedAt)
  if (shouldRefreshDetails || !meeting.get('tldv_transcript_text')) {
    try {
      const transcript = eliteTldvRequest(apiKey, `/meetings/${remote.id}/transcript`)
      meeting.set('tldv_transcript', transcript)
      meeting.set('tldv_transcript_text', eliteTranscriptToText(transcript))
    } catch (_) {}
  }
  if (shouldRefreshDetails || !meeting.get('tldv_notes_markdown')) {
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
    runStep('google_meetings', eliteSyncGoogleMeetings)
    runStep('google_sheets', eliteSyncSheetClients)
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
