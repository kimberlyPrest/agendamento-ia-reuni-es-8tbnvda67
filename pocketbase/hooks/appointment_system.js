routerAdd('GET', '/backend/v1/{path...}', (e) => {
  const BR_TIMEZONE = 'America/Sao_Paulo'
  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
  const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
  const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
  const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
  const route = e.request.pathValue('path')

  const env = (key) => {
    try {
      return $os.getenv(key) || ''
    } catch (_) {
      return ''
    }
  }
  const bad = (message) => e.json(400, { error: message, message })
  const forbidden = () =>
    e.json(403, { error: 'Acesso restrito ao admin.', message: 'Acesso restrito ao admin.' })
  const notFound = () =>
    e.json(404, { error: 'Rota não encontrada', message: 'Rota não encontrada' })
  const requireAdmin = () => {
    if (e.hasSuperuserAuth && e.hasSuperuserAuth()) return true
    if (!e.auth) return false
    try {
      return e.auth.get('role') === 'admin'
    } catch (_) {
      return false
    }
  }
  const parseDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null)
  const pbDate = (date) => date.toISOString().replace('T', ' ')
  const numberValue = (record, field, fallback) => {
    const value = record && record.get ? Number(record.get(field)) : Number(record && record[field])
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
  const nonNegativeNumberValue = (record, field, fallback) => {
    const value = record && record.get ? Number(record.get(field)) : Number(record && record[field])
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }
  const nonNegativeNumberValue = (record, field, fallback) => {
    const value = record && record.get ? Number(record.get(field)) : Number(record && record[field])
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }
  const textValue = (record, field, fallback) => {
    const value = record && record.get ? record.get(field) : record && record[field]
    return value === undefined || value === null || value === '' ? fallback : String(value)
  }
  const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000)
  const minutesFromTime = (time) => {
    const parts = String(time || '').split(':')
    if (parts.length < 2) return null
    const hours = Number(parts[0])
    const minutes = Number(parts[1])
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
  }
  const timeFromMinutes = (total) =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  const localDateTime = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00-03:00`)
  const intervalsOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB
  const recordTime = (record, field) => parseDate(record.get(field))
  const formEncode = (params) =>
    Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
  const googleConfigReady = () =>
    Boolean(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET') && env('GOOGLE_REDIRECT_URI'))
  const googleConnected = (consultant) =>
    Boolean(googleConfigReady() && consultant.get('google_refresh_token'))

  const parseWorkingHours = (consultant) => {
    let value = consultant.get('working_hours') || {}
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value)
      } catch (_) {
        value = {}
      }
    }
    return value || {}
  }
  const getRawDaySchedule = (consultant, dateStr) => {
    const wh = parseWorkingHours(consultant)
    const dow = new Date(`${dateStr}T12:00:00-03:00`).getUTCDay()
    return wh[DAY_KEYS[dow]] || wh[String(dow)] || wh[dow] || []
  }
  const normalizeDaySchedule = (raw, duration) => {
    const windows = []
    const exactTimes = []
    const addRange = (start, end) => {
      if (minutesFromTime(start) !== null && minutesFromTime(end) !== null)
        windows.push({ start, end })
    }
    const addTime = (time) => {
      if (minutesFromTime(time) !== null) exactTimes.push(time)
    }
    const items = Array.isArray(raw) ? raw : raw ? [raw] : []
    items.forEach((item) => {
      if (!item) return
      if (typeof item === 'string') {
        if (item.includes('-')) {
          const parts = item.split('-').map((part) => part.trim())
          addRange(parts[0], parts[1])
        } else addTime(item.trim())
        return
      }
      const start = item.start || item.from || item.begin
      const end = item.end || item.to || item.finish
      if (start && end) addRange(start, end)
    })
    if (windows.length === 0 && exactTimes.length === 0) DEFAULT_SLOTS.forEach(addTime)
    const slots = []
    exactTimes.forEach((time) => slots.push(time))
    windows.forEach((window) => {
      const start = minutesFromTime(window.start)
      const end = minutesFromTime(window.end)
      if (start === null || end === null) return
      for (let cursor = start; cursor + duration <= end; cursor += 30)
        slots.push(timeFromMinutes(cursor))
    })
    return Array.from(new Set(slots)).sort()
  }
  const getLocalBusyIntervals = (consultantId, dateStr, ignoreMeetingId) => {
    const startOfDay = `${dateStr} 00:00:00.000Z`
    const endOfDay = `${dateStr} 23:59:59.999Z`
    const filter = `consultant_id = '${consultantId}' && start_time <= '${endOfDay}' && end_time >= '${startOfDay}' && status = 'scheduled'`
    try {
      return $app
        .findRecordsByFilter('meetings', filter, '', 200, 0)
        .filter((meeting) => meeting.id !== ignoreMeetingId)
        .map((meeting) => ({
          start: recordTime(meeting, 'start_time'),
          end: recordTime(meeting, 'end_time'),
        }))
        .filter((interval) => interval.start && interval.end)
    } catch (_) {
      return []
    }
  }
  const refreshGoogleAccessToken = (consultant) => {
    const currentToken = consultant.get('google_access_token')
    const expiry = parseDate(consultant.get('google_token_expiry'))
    if (currentToken && expiry && expiry.getTime() > Date.now() + 120000) return currentToken
    const refreshToken = consultant.get('google_refresh_token')
    if (!refreshToken || !googleConfigReady()) return ''
    const res = $http.send({
      url: GOOGLE_TOKEN_URL,
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formEncode({
        client_id: env('GOOGLE_CLIENT_ID'),
        client_secret: env('GOOGLE_CLIENT_SECRET'),
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
    const accessToken = data.access_token || ''
    if (!accessToken) return ''
    consultant.set('google_access_token', accessToken)
    consultant.set(
      'google_token_expiry',
      pbDate(new Date(Date.now() + Number(data.expires_in || 3600) * 1000)),
    )
    consultant.set('google_sync_status', 'connected')
    $app.save(consultant)
    return accessToken
  }
  const googleFreeBusy = (consultant, timeMin, timeMax) => {
    const accessToken = refreshGoogleAccessToken(consultant)
    if (!accessToken) throw new Error('Google Calendar não conectado.')
    const calendarId = consultant.get('google_calendar_id') || 'primary'
    const res = $http.send({
      url: `${GOOGLE_CALENDAR_BASE}/freeBusy`,
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: textValue(consultant, 'working_timezone', BR_TIMEZONE),
        items: [{ id: calendarId }],
      }),
      timeout: 30,
    })
    if (res.statusCode < 200 || res.statusCode >= 300)
      throw new Error('Não foi possível consultar a agenda Google.')
    const calendar = (res.json.calendars || {})[calendarId]
    if (!calendar || calendar.errors)
      throw new Error('Calendário Google inválido ou sem permissão.')
    return (calendar.busy || []).map((busy) => ({
      start: parseDate(busy.start),
      end: parseDate(busy.end),
    }))
  }
  const buildSlots = (consultant, program, dateStr, ignoreMeetingId) => {
    const duration = numberValue(program, 'meeting_duration', 60)
    const bufferBefore = numberValue(program, 'buffer_before_minutes', 0)
    const bufferAfter = numberValue(program, 'buffer_after_minutes', 0)
    const times = normalizeDaySchedule(getRawDaySchedule(consultant, dateStr), duration)
    const now = new Date()
    const startOfDay = localDateTime(dateStr, '00:00')
    const endOfDay = localDateTime(dateStr, '23:59')
    const busyIntervals = getLocalBusyIntervals(consultant.id, dateStr, ignoreMeetingId).concat(
      googleConnected(consultant) ? googleFreeBusy(consultant, startOfDay, endOfDay) : [],
    )
    return times
      .map((time) => {
        const start = localDateTime(dateStr, time)
        const end = addMinutes(start, duration)
        const blocked = busyIntervals.some((busy) =>
          intervalsOverlap(
            addMinutes(start, -bufferBefore),
            addMinutes(end, bufferAfter),
            busy.start,
            busy.end,
          ),
        )
        return {
          time,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          available: start > now && !blocked,
        }
      })
      .filter((slot) => slot.available)
  }

  if (route === 'calendar/slots') {
    const consultantId =
      e.request.url.query().get('consultant_id') || e.request.url.query().get('consultantId')
    const clientId = e.request.url.query().get('client_id') || e.request.url.query().get('clientId')
    const dateStr = e.request.url.query().get('date')
    const ignoreMeetingId = e.request.url.query().get('ignore_meeting_id') || ''
    if (!consultantId || !dateStr) return bad('Parâmetros obrigatórios ausentes')
    try {
      const consultant = $app.findRecordById('consultants', consultantId)
      let program = { get: (field) => (field === 'meeting_duration' ? 60 : 0) }
      if (clientId) {
        const client = $app.findRecordById('clients', clientId)
        program = $app.findRecordById('programs', client.get('program_id'))
      }
      if (!googleConnected(consultant)) {
        return e.json(200, {
          slots: [],
          google_connected: false,
          setup_required: true,
          message: 'Agenda Google do consultor ainda não está conectada por OAuth.',
        })
      }
      let slots = buildSlots(consultant, program, dateStr, ignoreMeetingId)
      let lateReschedule = false
      let earliestStart = null
      const lateDelayDays = nonNegativeNumberValue(program, 'late_reschedule_delay_days', 7)
      if (ignoreMeetingId) {
        try {
          const meeting = $app.findRecordById('meetings', ignoreMeetingId)
          const meetingStart = recordTime(meeting, 'start_time')
          const minHours = nonNegativeNumberValue(program, 'min_reschedule_hours', 24)
          if (meetingStart && meetingStart.getTime() - Date.now() < minHours * 60 * 60 * 1000) {
            lateReschedule = true
            earliestStart = addMinutes(new Date(), lateDelayDays * 24 * 60)
            slots = slots.filter((slot) => parseDate(slot.start_time) >= earliestStart)
          }
        } catch (_) {}
      }
      return e.json(200, {
        slots,
        google_connected: true,
        timezone: textValue(consultant, 'working_timezone', BR_TIMEZONE),
        late_reschedule: lateReschedule,
        earliest_start_time: earliestStart ? earliestStart.toISOString() : '',
        late_reschedule_delay_days: lateDelayDays,
      })
    } catch (err) {
      return bad(err.message || 'Erro ao buscar horários')
    }
  }

  if (route === 'google/oauth/start') {
    if (!requireAdmin()) return forbidden()
    const consultantId =
      e.request.url.query().get('consultant_id') || e.request.url.query().get('consultantId')
    if (!consultantId) return bad('Consultor obrigatório')
    if (!googleConfigReady())
      return bad(
        'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no ambiente.',
      )
    try {
      const consultant = $app.findRecordById('consultants', consultantId)
      const state = `${consultant.id}:${$security.randomString(24)}`
      consultant.set('google_oauth_state', state)
      $app.save(consultant)
      const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' ')
      const url = `${GOOGLE_AUTH_URL}?${formEncode({ client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: env('GOOGLE_REDIRECT_URI'), response_type: 'code', scope: scopes, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state })}`
      return e.json(200, { url })
    } catch (err) {
      return bad(err.message || 'Erro ao iniciar OAuth')
    }
  }

  if (route === 'google/oauth/callback') {
    const code = e.request.url.query().get('code')
    const state = e.request.url.query().get('state')
    if (!code || !state) return bad('Callback OAuth inválido')
    try {
      const consultantId = state.split(':')[0]
      const consultant = $app.findRecordById('consultants', consultantId)
      if (consultant.get('google_oauth_state') !== state) return bad('State OAuth inválido')
      const tokenRes = $http.send({
        url: GOOGLE_TOKEN_URL,
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: formEncode({
          code,
          client_id: env('GOOGLE_CLIENT_ID'),
          client_secret: env('GOOGLE_CLIENT_SECRET'),
          redirect_uri: env('GOOGLE_REDIRECT_URI'),
          grant_type: 'authorization_code',
        }),
        timeout: 30,
      })
      if (tokenRes.statusCode < 200 || tokenRes.statusCode >= 300)
        return bad('Google recusou a autorização.')
      const token = tokenRes.json || {}
      consultant.set('google_access_token', token.access_token || '')
      if (token.refresh_token) consultant.set('google_refresh_token', token.refresh_token)
      consultant.set(
        'google_token_expiry',
        pbDate(new Date(Date.now() + Number(token.expires_in || 3600) * 1000)),
      )
      consultant.set('google_scopes', token.scope || '')
      consultant.set(
        'google_sync_status',
        token.refresh_token || consultant.get('google_refresh_token')
          ? 'connected'
          : 'missing_refresh_token',
      )
      consultant.set('google_oauth_state', '')
      consultant.set('calendar_connected_at', pbDate(new Date()))
      try {
        const profileRes = $http.send({
          url: GOOGLE_USERINFO_URL,
          method: 'GET',
          headers: { authorization: `Bearer ${token.access_token}` },
          timeout: 15,
        })
        if (profileRes.statusCode >= 200 && profileRes.statusCode < 300 && profileRes.json.email)
          consultant.set('google_connected_email', profileRes.json.email)
      } catch (_) {}
      $app.save(consultant)
      return e.html(
        200,
        '<!doctype html><meta charset="utf-8"><title>Google conectado</title><body style="background:#0A0A0A;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh"><main style="max-width:520px;text-align:center"><h1 style="color:#FF6B00">Google Calendar conectado</h1><p>Você já pode voltar ao admin do Agendamentos Elite.</p></main></body>',
      )
    } catch (err) {
      return bad(err.message || 'Erro no callback OAuth')
    }
  }

  return notFound()
})

routerAdd('POST', '/backend/v1/{path...}', (e) => {
  const BR_TIMEZONE = 'America/Sao_Paulo'
  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
  const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
  const route = e.request.pathValue('path')

  const env = (key) => {
    try {
      return $os.getenv(key) || ''
    } catch (_) {
      return ''
    }
  }
  const bad = (message) => e.json(400, { error: message, message })
  const forbidden = () =>
    e.json(403, { error: 'Acesso restrito ao admin.', message: 'Acesso restrito ao admin.' })
  const notFound = () =>
    e.json(404, { error: 'Rota não encontrada', message: 'Rota não encontrada' })
  const requireAdmin = () => {
    if (e.hasSuperuserAuth && e.hasSuperuserAuth()) return true
    if (!e.auth) return false
    try {
      return e.auth.get('role') === 'admin'
    } catch (_) {
      return false
    }
  }
  const normalizeEmail = (email) =>
    String(email || '')
      .trim()
      .toLowerCase()
  const parseDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null)
  const pbDate = (date) => date.toISOString().replace('T', ' ')
  const numberValue = (record, field, fallback) => {
    const value = record && record.get ? Number(record.get(field)) : Number(record && record[field])
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
  const textValue = (record, field, fallback) => {
    const value = record && record.get ? record.get(field) : record && record[field]
    return value === undefined || value === null || value === '' ? fallback : String(value)
  }
  const boolValue = (record, field, fallback) => {
    const value = record && record.get ? record.get(field) : record && record[field]
    if (value === undefined || value === null || value === '') return fallback
    return Boolean(value)
  }
  const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000)
  const addInterval = (date, amount, unit) => {
    const next = new Date(date.getTime())
    const safeAmount = Number(amount) || 0
    if (unit === 'weeks') next.setUTCDate(next.getUTCDate() + safeAmount * 7)
    else if (unit === 'months') next.setUTCMonth(next.getUTCMonth() + safeAmount)
    else next.setUTCDate(next.getUTCDate() + safeAmount)
    return next
  }
  const intervalsOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB
  const recordTime = (record, field) => parseDate(record.get(field))
  const formEncode = (params) =>
    Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
  const googleConfigReady = () =>
    Boolean(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET') && env('GOOGLE_REDIRECT_URI'))
  const googleConnected = (consultant) =>
    Boolean(googleConfigReady() && consultant.get('google_refresh_token'))
  const findClientByEmail = (email) => {
    const normalized = normalizeEmail(email)
    try {
      return $app.findFirstRecordByData('clients', 'email', normalized)
    } catch (_) {
      return $app.findFirstRecordByData('clients', 'email', email)
    }
  }
  const expandClient = (client) => {
    try {
      $app.expandRecord(client, ['program_id', 'consultant_id'])
    } catch (_) {}
    return client
  }
  const expandMeeting = (meeting) => {
    try {
      $app.expandRecord(meeting, ['client_id', 'program_id', 'consultant_id'])
    } catch (_) {}
    return meeting
  }
  const getClientMeetings = (clientId) => {
    try {
      return $app.findRecordsByFilter('meetings', `client_id = '${clientId}'`, 'start_time', 500, 0)
    } catch (_) {
      return []
    }
  }
  const getProgramLimit = (client, program) => {
    const override = Number(client.get('meeting_limit_override') || 0)
    if (override > 0) return override
    return Number(program.get('total_meetings') || 1) + Number(client.get('extra_meetings') || 0)
  }
  const getClientStats = (client, program) => {
    const now = new Date()
    const meetings = getClientMeetings(client.id)
    const active = meetings.filter((meeting) => meeting.get('status') !== 'cancelled')
    const completed = active.filter((meeting) => {
      const start = recordTime(meeting, 'start_time')
      return meeting.get('status') === 'completed' || (start && start < now)
    })
    const future = active.filter((meeting) => {
      const start = recordTime(meeting, 'start_time')
      return meeting.get('status') === 'scheduled' && start && start > now
    })
    const past = active.filter((meeting) => {
      const start = recordTime(meeting, 'start_time')
      return start && start <= now
    })
    const lastMeeting =
      past.sort((a, b) => recordTime(b, 'start_time') - recordTime(a, 'start_time'))[0] || null
    const upcoming =
      future.sort((a, b) => recordTime(a, 'start_time') - recordTime(b, 'start_time'))[0] || null
    const limit = getProgramLimit(client, program)
    const currentFromClient = Number(client.get('current_meeting_number') || 0)
    const nextMeetingNumber = Math.max(currentFromClient || 1, completed.length + 1)
    return {
      completed_meetings: completed.length,
      future_meetings: future.length,
      max_meetings: limit,
      next_meeting_number: nextMeetingNumber,
      finalised: completed.length >= limit || nextMeetingNumber > limit,
      last_meeting: lastMeeting ? expandMeeting(lastMeeting) : null,
      upcoming: upcoming ? expandMeeting(upcoming) : null,
    }
  }
  const getUpcomingMeeting = (clientId) => {
    try {
      const now = pbDate(new Date())
      return expandMeeting(
        $app.findFirstRecordByFilter(
          'meetings',
          `client_id = '${clientId}' && status = 'scheduled' && start_time > '${now}'`,
          'start_time',
        ),
      )
    } catch (_) {
      return null
    }
  }
  const getLocalBusyIntervals = (consultantId, dateStr, ignoreMeetingId) => {
    const startOfDay = `${dateStr} 00:00:00.000Z`
    const endOfDay = `${dateStr} 23:59:59.999Z`
    const filter = `consultant_id = '${consultantId}' && start_time <= '${endOfDay}' && end_time >= '${startOfDay}' && status = 'scheduled'`
    try {
      return $app
        .findRecordsByFilter('meetings', filter, '', 200, 0)
        .filter((meeting) => meeting.id !== ignoreMeetingId)
        .map((meeting) => ({
          start: recordTime(meeting, 'start_time'),
          end: recordTime(meeting, 'end_time'),
        }))
        .filter((interval) => interval.start && interval.end)
    } catch (_) {
      return []
    }
  }
  const refreshGoogleAccessToken = (consultant) => {
    const currentToken = consultant.get('google_access_token')
    const expiry = parseDate(consultant.get('google_token_expiry'))
    if (currentToken && expiry && expiry.getTime() > Date.now() + 120000) return currentToken
    const refreshToken = consultant.get('google_refresh_token')
    if (!refreshToken || !googleConfigReady()) return ''
    const res = $http.send({
      url: GOOGLE_TOKEN_URL,
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formEncode({
        client_id: env('GOOGLE_CLIENT_ID'),
        client_secret: env('GOOGLE_CLIENT_SECRET'),
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
      pbDate(new Date(Date.now() + Number(data.expires_in || 3600) * 1000)),
    )
    consultant.set('google_sync_status', 'connected')
    $app.save(consultant)
    return data.access_token
  }
  const googleFreeBusy = (consultant, timeMin, timeMax) => {
    const accessToken = refreshGoogleAccessToken(consultant)
    if (!accessToken) throw new Error('Google Calendar não conectado.')
    const calendarId = consultant.get('google_calendar_id') || 'primary'
    const res = $http.send({
      url: `${GOOGLE_CALENDAR_BASE}/freeBusy`,
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: textValue(consultant, 'working_timezone', BR_TIMEZONE),
        items: [{ id: calendarId }],
      }),
      timeout: 30,
    })
    if (res.statusCode < 200 || res.statusCode >= 300)
      throw new Error('Não foi possível consultar a agenda Google.')
    const calendar = (res.json.calendars || {})[calendarId]
    if (!calendar || calendar.errors)
      throw new Error('Calendário Google inválido ou sem permissão.')
    return (calendar.busy || []).map((busy) => ({
      start: parseDate(busy.start),
      end: parseDate(busy.end),
    }))
  }
  const assertBusinessRules = (client, consultant, program, start, end, ignoreMeetingId) => {
    if (boolValue(program, 'require_tally', true) && !client.get('form_answered'))
      return 'Antes de agendar, responda o formulário preparatório.'
    const stats = getClientStats(client, program)
    const futureLimit = boolValue(program, 'allow_concurrent', false)
      ? numberValue(program, 'max_future_meetings', 1)
      : 1
    const currentFutureCount = getClientMeetings(client.id).filter((meeting) => {
      if (meeting.id === ignoreMeetingId) return false
      const meetingStart = recordTime(meeting, 'start_time')
      return meeting.get('status') === 'scheduled' && meetingStart && meetingStart > new Date()
    }).length
    if (!ignoreMeetingId && stats.finalised)
      return 'A consultoria deste programa já foi finalizada.'
    if (!ignoreMeetingId && currentFutureCount >= futureLimit)
      return 'Já existe uma reunião futura agendada para este cliente.'
    const minInterval = Number(program.get('min_interval_days') || 0)
    if (minInterval > 0 && stats.last_meeting) {
      const lastEnd =
        recordTime(stats.last_meeting, 'end_time') || recordTime(stats.last_meeting, 'start_time')
      if (
        start < addInterval(lastEnd, minInterval, textValue(program, 'min_interval_unit', 'days'))
      )
        return 'Ainda não passou o intervalo mínimo entre reuniões deste programa.'
    }
    const bookingWindow = numberValue(program, 'booking_window_days', 60)
    if (start > addMinutes(new Date(), bookingWindow * 24 * 60))
      return `Escolha um horário dentro dos próximos ${bookingWindow} dias.`
    const duration = numberValue(program, 'meeting_duration', 60)
    if (Math.abs(addMinutes(start, duration).getTime() - end.getTime()) > 60000)
      return `Esta reunião precisa ter ${duration} minutos.`
    const bufferBefore = numberValue(program, 'buffer_before_minutes', 0)
    const bufferAfter = numberValue(program, 'buffer_after_minutes', 0)
    const dateStr = start.toISOString().slice(0, 10)
    const localConflict = getLocalBusyIntervals(consultant.id, dateStr, ignoreMeetingId).some(
      (busy) =>
        intervalsOverlap(
          addMinutes(start, -bufferBefore),
          addMinutes(end, bufferAfter),
          busy.start,
          busy.end,
        ),
    )
    if (localConflict) return 'Horário já reservado.'
    if (!googleConnected(consultant))
      return 'Agenda Google do consultor ainda não está conectada por OAuth.'
    const googleConflict = googleFreeBusy(
      consultant,
      addMinutes(start, -bufferBefore),
      addMinutes(end, bufferAfter),
    ).some((busy) =>
      intervalsOverlap(
        addMinutes(start, -bufferBefore),
        addMinutes(end, bufferAfter),
        busy.start,
        busy.end,
      ),
    )
    if (googleConflict) return 'Este horário está ocupado na agenda Google do consultor.'
    return ''
  }
  const replaceToken = (text, token, value) =>
    String(text)
      .split(token)
      .join(String(value || ''))
  const buildMeetingTitle = (program, client, meetingNumber) => {
    let title = program.get('title_template') || 'Consultoria {meeting_number} - {client_name}'
    title = replaceToken(title, '{client_name}', client.get('name'))
    title = replaceToken(title, '{client_email}', client.get('email'))
    title = replaceToken(title, '{meeting_number}', meetingNumber)
    title = replaceToken(title, '{program_name}', program.get('name'))
    return title
  }
  const getMeetLinkFromEvent = (event) => {
    if (event.hangoutLink) return event.hangoutLink
    const entry = ((event.conferenceData || {}).entryPoints || []).find(
      (item) => item.entryPointType === 'video',
    )
    return entry ? entry.uri : ''
  }
  const createGoogleEvent = (consultant, client, program, title, start, end) => {
    const accessToken = refreshGoogleAccessToken(consultant)
    if (!accessToken) throw new Error('Google Calendar não conectado.')
    const calendarId = consultant.get('google_calendar_id') || 'primary'
    const res = $http.send({
      url: `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: title,
        description: `Reunião do programa ${program.get('name')} com ${client.get('name')}.`,
        start: {
          dateTime: start.toISOString(),
          timeZone: textValue(consultant, 'working_timezone', BR_TIMEZONE),
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: textValue(consultant, 'working_timezone', BR_TIMEZONE),
        },
        attendees: [{ email: consultant.get('email') }, { email: client.get('email') }].filter(
          (item) => item.email,
        ),
        conferenceData: {
          createRequest: {
            requestId: $security.randomString(24).toLowerCase(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
      timeout: 30,
    })
    if (res.statusCode < 200 || res.statusCode >= 300)
      throw new Error('Não foi possível criar o evento no Google Calendar.')
    return res.json
  }
  const patchGoogleEvent = (consultant, meeting, title, start, end) => {
    const eventId = meeting.get('google_event_id')
    if (!eventId) return null
    const accessToken = refreshGoogleAccessToken(consultant)
    if (!accessToken) throw new Error('Google Calendar não conectado.')
    const calendarId = consultant.get('google_calendar_id') || 'primary'
    const res = $http.send({
      url: `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`,
      method: 'PATCH',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: title,
        start: {
          dateTime: start.toISOString(),
          timeZone: textValue(consultant, 'working_timezone', BR_TIMEZONE),
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: textValue(consultant, 'working_timezone', BR_TIMEZONE),
        },
      }),
      timeout: 30,
    })
    if (res.statusCode < 200 || res.statusCode >= 300)
      throw new Error('Não foi possível remarcar o evento no Google Calendar.')
    return res.json
  }
  const deleteGoogleEvent = (consultant, meeting) => {
    const eventId = meeting.get('google_event_id')
    if (!eventId) return
    const accessToken = refreshGoogleAccessToken(consultant)
    if (!accessToken) return
    const calendarId = consultant.get('google_calendar_id') || 'primary'
    $http.send({
      url: `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      method: 'DELETE',
      headers: { authorization: `Bearer ${accessToken}` },
      timeout: 30,
    })
  }
  const canChangeMeeting = (meeting, program) => {
    const start = recordTime(meeting, 'start_time')
    return (
      start &&
      start.getTime() - Date.now() >=
        nonNegativeNumberValue(program, 'min_reschedule_hours', 24) * 60 * 60 * 1000
    )
  }

  if (route === 'client/auth') {
    const body = e.requestInfo().body || {}
    if (!body.email) return bad('Email é obrigatório')
    try {
      const client = expandClient(findClientByEmail(body.email))
      const program = $app.findRecordById('programs', client.get('program_id'))
      const stats = getClientStats(client, program)
      const upcoming = getUpcomingMeeting(client.id)
      return e.json(200, {
        client,
        upcoming,
        upcomingMeeting: upcoming,
        lastMeeting: stats.last_meeting,
        stats,
      })
    } catch (_) {
      return e.json(404, { error: 'Email não encontrado', message: 'Email não encontrado' })
    }
  }

  if (route === 'calendar/book') {
    const body = e.requestInfo().body || {}
    const clientId = body.client_id || body.clientId
    if (!clientId) return bad('Cliente inválido')
    try {
      const client = $app.findRecordById('clients', clientId)
      const consultant = $app.findRecordById('consultants', client.get('consultant_id'))
      const program = $app.findRecordById('programs', client.get('program_id'))
      const start = parseDate(body.start_time)
      const end = parseDate(body.end_time)
      if (!start || !end) return bad('Horário inválido')
      const ruleError = assertBusinessRules(client, consultant, program, start, end, '')
      if (ruleError) return bad(ruleError)
      const stats = getClientStats(client, program)
      const title = buildMeetingTitle(program, client, stats.next_meeting_number)
      const googleEvent = createGoogleEvent(consultant, client, program, title, start, end)
      const record = new Record($app.findCollectionByNameOrId('meetings'))
      record.set('client_id', client.id)
      record.set('consultant_id', consultant.id)
      record.set('program_id', program.id)
      record.set('title', title)
      record.set('meeting_number', stats.next_meeting_number)
      record.set('start_time', pbDate(start))
      record.set('end_time', pbDate(end))
      record.set('status', 'scheduled')
      record.set('source', 'client')
      record.set('google_event_id', googleEvent.id || '')
      record.set('google_html_link', googleEvent.htmlLink || '')
      record.set('meet_link', getMeetLinkFromEvent(googleEvent))
      $app.save(record)
      return e.json(200, { meeting: expandMeeting(record) })
    } catch (err) {
      return bad(err.message || 'Erro ao agendar')
    }
  }

  if (route === 'calendar/cancel') {
    const body = e.requestInfo().body || {}
    const meetingId = body.meeting_id || body.meetingId
    const clientId = body.client_id || body.clientId
    if (!meetingId) return bad('Agendamento inválido')
    try {
      const meeting = $app.findRecordById('meetings', meetingId)
      if (!clientId && !requireAdmin()) return forbidden()
      if (clientId && meeting.get('client_id') !== clientId && !requireAdmin()) return forbidden()
      const consultant = $app.findRecordById('consultants', meeting.get('consultant_id'))
      const program = $app.findRecordById('programs', meeting.get('program_id'))
      if (!canChangeMeeting(meeting, program))
        return bad(
          `Cancelamentos exigem no mínimo ${nonNegativeNumberValue(program, 'min_reschedule_hours', 24)}h de antecedência.`,
        )
      deleteGoogleEvent(consultant, meeting)
      meeting.set('status', 'cancelled')
      meeting.set('cancelled_at', pbDate(new Date()))
      meeting.set('cancellation_reason', body.reason || '')
      $app.save(meeting)
      return e.json(200, { success: true, meeting: expandMeeting(meeting) })
    } catch (err) {
      return bad(err.message || 'Erro ao cancelar')
    }
  }

  if (route === 'calendar/reschedule') {
    const body = e.requestInfo().body || {}
    const meetingId = body.meeting_id || body.meetingId
    const clientId = body.client_id || body.clientId
    if (!meetingId) return bad('Agendamento inválido')
    try {
      const meeting = $app.findRecordById('meetings', meetingId)
      if (!clientId && !requireAdmin()) return forbidden()
      if (clientId && meeting.get('client_id') !== clientId && !requireAdmin()) return forbidden()
      const client = $app.findRecordById('clients', meeting.get('client_id'))
      const consultant = $app.findRecordById('consultants', meeting.get('consultant_id'))
      const program = $app.findRecordById('programs', meeting.get('program_id'))
      const start = parseDate(body.start_time)
      const end = parseDate(body.end_time)
      if (!start || !end) return bad('Horário inválido')
      if (!canChangeMeeting(meeting, program)) {
        const lateDelayDays = nonNegativeNumberValue(program, 'late_reschedule_delay_days', 7)
        const earliestStart = addMinutes(new Date(), lateDelayDays * 24 * 60)
        if (start < earliestStart)
          return bad(
            `Como a remarcação passou do prazo mínimo, escolha um novo horário a partir de ${lateDelayDays} dias.`,
          )
      }
      const ruleError = assertBusinessRules(client, consultant, program, start, end, meeting.id)
      if (ruleError) return bad(ruleError)
      const title =
        meeting.get('title') ||
        buildMeetingTitle(program, client, meeting.get('meeting_number') || 1)
      const googleEvent = patchGoogleEvent(consultant, meeting, title, start, end)
      meeting.set('title', title)
      meeting.set('start_time', pbDate(start))
      meeting.set('end_time', pbDate(end))
      meeting.set('rescheduled_at', pbDate(new Date()))
      if (googleEvent) {
        meeting.set(
          'google_html_link',
          googleEvent.htmlLink || meeting.get('google_html_link') || '',
        )
        meeting.set(
          'meet_link',
          getMeetLinkFromEvent(googleEvent) || meeting.get('meet_link') || '',
        )
      }
      $app.save(meeting)
      return e.json(200, { meeting: expandMeeting(meeting) })
    } catch (err) {
      return bad(err.message || 'Erro ao remarcar')
    }
  }

  if (route === 'tally/webhook') {
    const body = e.requestInfo().body || {}
    const secret = env('TALLY_SIGNING_SECRET')
    if (secret) {
      const received = String(
        e.request.header.get('Tally-Signature') || e.request.header.get('tally-signature') || '',
      ).replace('sha256=', '')
      const calculated = String($security.hs256(JSON.stringify(body), secret)).replace(
        'sha256=',
        '',
      )
      if (!received || received !== calculated)
        return e.json(401, { error: 'Assinatura Tally inválida' })
    }
    const fields = ((body || {}).data || {}).fields || []
    const emailField = fields.find(
      (field) =>
        field.type === 'INPUT_EMAIL' ||
        String(field.label || '')
          .toLowerCase()
          .includes('email'),
    )
    const email = normalizeEmail(
      (emailField && emailField.value) || ((body || {}).data || {}).respondentEmail || '',
    )
    if (!email) return e.json(200, { success: true, matched: false, reason: 'email_missing' })
    try {
      const client = findClientByEmail(email)
      client.set('form_answered', true)
      client.set(
        'tally_submission_id',
        ((body || {}).data || {}).submissionId ||
          ((body || {}).data || {}).responseId ||
          body.eventId ||
          '',
      )
      client.set(
        'tally_answered_at',
        pbDate(new Date(((body || {}).data || {}).createdAt || body.createdAt || Date.now())),
      )
      client.set('tally_payload', body.data || body)
      $app.save(client)
      return e.json(200, { success: true, matched: true, client_id: client.id })
    } catch (_) {
      return e.json(200, { success: true, matched: false, reason: 'client_not_found' })
    }
  }

  return notFound()
})
