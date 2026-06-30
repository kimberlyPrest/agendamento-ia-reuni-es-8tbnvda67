routerAdd('GET', '/backend/v1/hub/{path...}', (e) => {
  const route = e.request.pathValue('path')
  const DEFAULT_CLIENT_PASSWORD = 'AdaptaElite26'

  const bad = (message) => e.json(400, { error: message, message })
  const forbidden = () => e.json(403, { error: 'Acesso restrito.', message: 'Acesso restrito.' })
  const notFound = () =>
    e.json(404, { error: 'Rota nao encontrada', message: 'Rota nao encontrada' })
  const normalizeEmail = (email) =>
    String(email || '')
      .trim()
      .toLowerCase()
  const parseDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null)
  const pbDate = (date) => date.toISOString().replace('T', ' ')
  const daysBetween = (start, end) =>
    Math.max(0, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
  const role = () => {
    if (!e.auth) return ''
    try {
      return e.auth.get('role') || ''
    } catch (_) {
      return ''
    }
  }
  const isAdmin = () => role() === 'admin' || (e.hasSuperuserAuth && e.hasSuperuserAuth())
  const isConsultant = () => role() === 'consultant'
  const isClient = () => role() === 'client'
  const requireAuth = () => Boolean(e.auth || (e.hasSuperuserAuth && e.hasSuperuserAuth()))
  const expand = (record, fields) => {
    try {
      $app.expandRecord(record, fields)
    } catch (_) {}
    return record
  }
  const findByData = (collection, field, value) => {
    try {
      return $app.findFirstRecordByData(collection, field, value)
    } catch (_) {
      return null
    }
  }
  const findClientForAuth = () => {
    if (!e.auth) throw new Error('Login obrigatorio.')
    return (
      findByData('clients', 'user_id', e.auth.id) ||
      findByData('clients', 'email', normalizeEmail(e.auth.email()))
    )
  }
  const findConsultantForAuth = () => {
    if (!e.auth) throw new Error('Login obrigatorio.')
    return (
      findByData('consultants', 'user_id', e.auth.id) ||
      findByData('consultants', 'email', normalizeEmail(e.auth.email()))
    )
  }
  const publicConsultant = (consultant) => ({
    id: consultant.id,
    user_id: consultant.get('user_id') || '',
    name: consultant.get('name') || '',
    whatsapp_number: consultant.get('whatsapp_number') || '',
    email: consultant.get('email') || '',
    photo_url: consultant.get('photo_url') || '',
    hubspot_owner_id: consultant.get('hubspot_owner_id') || '',
    google_calendar_id: consultant.get('google_calendar_id') || 'primary',
    google_connected_email: consultant.get('google_connected_email') || '',
    google_sync_status: consultant.get('google_sync_status') || '',
    calendar_connected_at: consultant.get('calendar_connected_at') || '',
    working_timezone: consultant.get('working_timezone') || 'America/Sao_Paulo',
    working_hours: consultant.get('working_hours') || {},
    has_tldv_api_key: Boolean(consultant.get('tldv_api_key')),
  })
  const consultantScopeId = () => {
    if (isAdmin()) return e.request.url.query().get('consultant_id') || ''
    const consultant = findConsultantForAuth()
    if (!consultant) throw new Error('Consultor nao encontrado.')
    return consultant.id
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
  const boolValue = (record, field, fallback) => {
    const value = record && record.get ? record.get(field) : record && record[field]
    if (value === undefined || value === null || value === '') return fallback
    return Boolean(value)
  }
  const normalizeStageText = (value) => {
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
  const stageMeetingNumber = (stage) => {
    const match = normalizeStageText(stage).match(/(\d+)\s*(?:a|o)?/)
    if (match) return Number(match[1])
    const text = normalizeStageText(stage)
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
  const classifyClientStage = (client, program) => {
    const stageText = client.get('deal_stage_name') || client.get('deal_stage_id') || ''
    const text = normalizeStageText(stageText)
    const limit = getProgramLimit(client, program)
    const number = stageMeetingNumber(stageText)
    const hasFinalized = text.includes('finalizad')
    const hasPending = text.includes('pendent')
    const hasRefund =
      text.includes('reembolso') || text.includes('reembols') || text.includes('refund')
    const hasNoShow =
      text.includes('no show') || text.includes('noshow') || text.includes('no-show')
    const asksTally =
      text.includes('formulario nao preenchido') ||
      text.includes('formulario nao respondido') ||
      text.includes('formulario pendente') ||
      text.includes('novos alunos') ||
      text.includes('novo aluno')
    let completed = Math.max(0, Number(client.get('current_meeting_number') || 1) - 1)
    let finalisedByStage = false
    if (stageText) completed = 0
    if (hasRefund) completed = number > 0 ? Math.max(0, number - 1) : completed
    else if (hasNoShow && number > 0) completed = Math.max(0, number - 1)
    else if (hasFinalized && number > 0) completed = number
    else if (hasFinalized && number === 0) {
      completed = limit
      finalisedByStage = true
    } else if (hasPending && number > 0) completed = Math.max(0, number - 1)
    completed = Math.max(0, Math.min(completed, limit))
    return {
      stage_text: stageText,
      stage_key: text,
      stage_meeting_number: number,
      completed_meetings: completed,
      finalised_by_stage: finalisedByStage,
      has_refund: hasRefund,
      has_no_show: hasNoShow,
      requires_tally:
        boolValue(program, 'require_tally', true) &&
        !client.get('form_answered') &&
        (asksTally || !stageText),
      booking_blocked: hasRefund,
      block_reason: hasRefund
        ? 'Status de reembolso: este cliente não pode agendar novas reuniões.'
        : '',
    }
  }
  const getClientStats = (client) => {
    const program = $app.findRecordById('programs', client.get('program_id'))
    const meetings = getClientMeetings(client.id).filter(
      (meeting) => meeting.get('status') !== 'cancelled',
    )
    const now = new Date()
    const future = meetings.filter((meeting) => {
      const start = parseDate(meeting.get('start_time'))
      return meeting.get('status') === 'scheduled' && start && start > now
    })
    const past = meetings.filter((meeting) => {
      const start = parseDate(meeting.get('start_time'))
      return start && start <= now
    })
    const lastMeeting = past.sort(
      (a, b) => parseDate(b.get('start_time')) - parseDate(a.get('start_time')),
    )[0]
    const upcoming = future.sort(
      (a, b) => parseDate(a.get('start_time')) - parseDate(b.get('start_time')),
    )[0]
    const limit = getProgramLimit(client, program)
    const stageRules = classifyClientStage(client, program)
    const completed = stageRules.completed_meetings
    let noShowEarliestStart = null
    if (stageRules.has_no_show) {
      const callDateField =
        stageRules.stage_meeting_number === 1
          ? 'first_call_at'
          : stageRules.stage_meeting_number === 2
            ? 'second_call_at'
            : ''
      const baseDate =
        (callDateField ? parseDate(client.get(callDateField)) : null) ||
        (lastMeeting ? parseDate(lastMeeting.get('start_time')) : null)
      const delayDays = Number(program.get('late_reschedule_delay_days') || 7)
      noShowEarliestStart = baseDate
        ? new Date(baseDate.getTime() + delayDays * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000)
    }
    return {
      completed_meetings: completed,
      future_meetings: future.length,
      max_meetings: limit,
      next_meeting_number: Math.min(limit + 1, completed + 1),
      finalised: stageRules.finalised_by_stage || completed >= limit,
      booking_blocked: stageRules.booking_blocked,
      block_reason: stageRules.block_reason,
      requires_tally: stageRules.requires_tally,
      no_show_earliest_start: noShowEarliestStart ? noShowEarliestStart.toISOString() : '',
      stage_rules: stageRules,
      last_meeting: lastMeeting
        ? expand(lastMeeting, ['program_id', 'consultant_id', 'client_id'])
        : null,
      upcoming: upcoming ? expand(upcoming, ['program_id', 'consultant_id', 'client_id']) : null,
      days_since_last_meeting: lastMeeting
        ? daysBetween(parseDate(lastMeeting.get('start_time')), now)
        : null,
    }
  }
  const withClientSummary = (client) => {
    expand(client, ['program_id', 'consultant_id'])
    const stats = getClientStats(client)
    return { client, stats }
  }

  if (route === 'me') {
    if (!requireAuth()) return forbidden()
    return e.json(200, { user: e.auth, role: role() })
  }

  if (route === 'client/me') {
    if (!requireAuth() || (!isClient() && !isAdmin())) return forbidden()
    try {
      const client = findClientForAuth()
      if (!client) return bad('Cliente nao encontrado.')
      const summary = withClientSummary(client)
      return e.json(200, {
        client: summary.client,
        stats: summary.stats,
        upcoming: summary.stats.upcoming,
        lastMeeting: summary.stats.last_meeting,
        default_password_hint: DEFAULT_CLIENT_PASSWORD,
      })
    } catch (err) {
      return bad(err.message || 'Erro ao carregar cliente.')
    }
  }

  if (route === 'client/meetings') {
    if (!requireAuth() || (!isClient() && !isAdmin())) return forbidden()
    try {
      const client = findClientForAuth()
      if (!client) return bad('Cliente nao encontrado.')
      const meetings = getClientMeetings(client.id)
        .sort((a, b) => parseDate(b.get('start_time')) - parseDate(a.get('start_time')))
        .map((meeting) => expand(meeting, ['program_id', 'consultant_id', 'client_id']))
      return e.json(200, { meetings })
    } catch (err) {
      return bad(err.message || 'Erro ao carregar reunioes.')
    }
  }

  if (route === 'consultant/me') {
    if (!requireAuth() || (!isConsultant() && !isAdmin())) return forbidden()
    try {
      const consultant =
        isAdmin() && e.request.url.query().get('consultant_id')
          ? $app.findRecordById('consultants', e.request.url.query().get('consultant_id'))
          : findConsultantForAuth()
      if (!consultant) return bad('Consultor nao encontrado.')
      return e.json(200, { consultant: publicConsultant(consultant) })
    } catch (err) {
      return bad(err.message || 'Erro ao carregar consultor.')
    }
  }

  if (route === 'consultant/dashboard') {
    if (!requireAuth() || (!isConsultant() && !isAdmin())) return forbidden()
    try {
      const consultantId = consultantScopeId()
      const now = new Date()
      const today = pbDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      const tomorrow = pbDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
      const clientFilter = consultantId ? `consultant_id = '${consultantId}'` : ''
      const clients = $app.findRecordsByFilter('clients', clientFilter, 'name', 500, 0)
      const meetingsToday = consultantId
        ? $app.findRecordsByFilter(
            'meetings',
            `consultant_id = '${consultantId}' && status = 'scheduled' && start_time >= '${today}' && start_time < '${tomorrow}'`,
            'start_time',
            100,
            0,
          )
        : []
      const summaries = clients.map((client) => withClientSummary(client))
      const activeClients = summaries.filter(
        (item) => !item.stats.finalised && !item.stats.booking_blocked,
      ).length
      const overdueTally = summaries.filter((item) => item.stats.requires_tally).length
      const finished = summaries.filter((item) => item.stats.finalised).length
      return e.json(200, {
        kpis: {
          total_clients: clients.length,
          active_clients: activeClients,
          finished_clients: finished,
          tally_pending: overdueTally,
          meetings_today: meetingsToday.length,
        },
        meetings_today: meetingsToday.map((meeting) =>
          expand(meeting, ['client_id', 'program_id', 'consultant_id']),
        ),
        clients: summaries.slice(0, 12),
      })
    } catch (err) {
      return bad(err.message || 'Erro no dashboard.')
    }
  }

  if (route === 'consultant/clients') {
    if (!requireAuth() || (!isConsultant() && !isAdmin())) return forbidden()
    try {
      const consultantId = consultantScopeId()
      const filter = consultantId ? `consultant_id = '${consultantId}'` : ''
      const clients = $app.findRecordsByFilter('clients', filter, 'name', 1000, 0)
      const rows = clients.map((client) => withClientSummary(client))
      return e.json(200, { clients: rows })
    } catch (err) {
      return bad(err.message || 'Erro ao listar clientes.')
    }
  }

  if (route === 'admin/overview') {
    if (!requireAuth() || !isAdmin()) return forbidden()
    try {
      const clients = $app.findRecordsByFilter('clients', '', '', 1000, 0)
      const consultants = $app.findRecordsByFilter('consultants', '', 'name', 500, 0)
      const meetings = $app.findRecordsByFilter(
        'meetings',
        "status = 'scheduled'",
        'start_time',
        500,
        0,
      )
      const connected = consultants.filter(
        (consultant) => consultant.get('google_sync_status') === 'connected',
      ).length
      return e.json(200, {
        kpis: {
          clients: clients.length,
          consultants: consultants.length,
          scheduled_meetings: meetings.length,
          connected_calendars: connected,
        },
        consultants,
        upcoming_meetings: meetings
          .slice(0, 20)
          .map((meeting) => expand(meeting, ['client_id', 'program_id', 'consultant_id'])),
      })
    } catch (err) {
      return bad(err.message || 'Erro ao carregar admin.')
    }
  }

  return notFound()
})

routerAdd('POST', '/backend/v1/hub/{path...}', (e) => {
  const route = e.request.pathValue('path')
  const DEFAULT_CLIENT_PASSWORD = 'AdaptaElite26'
  const SHEET_ID = '17hsd7jkpRtjKZa6_cXQ4CLSkvjPAVTLVmILebWqDWCs'
  const TLDV_API_BASE = 'https://pasta.tldv.io/v1alpha1'

  const env = (key) => {
    try {
      return $os.getenv(key) || ''
    } catch (_) {
      return ''
    }
  }
  const bad = (message) => e.json(400, { error: message, message })
  const forbidden = () => e.json(403, { error: 'Acesso restrito.', message: 'Acesso restrito.' })
  const notFound = () =>
    e.json(404, { error: 'Rota nao encontrada', message: 'Rota nao encontrada' })
  const normalizeEmail = (email) =>
    String(email || '')
      .trim()
      .toLowerCase()
  const parseDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null)
  const pbDate = (date) => date.toISOString().replace('T', ' ')
  const role = () => {
    if (!e.auth) return ''
    try {
      return e.auth.get('role') || ''
    } catch (_) {
      return ''
    }
  }
  const isAdmin = () => role() === 'admin' || (e.hasSuperuserAuth && e.hasSuperuserAuth())
  const isConsultant = () => role() === 'consultant'
  const requireAuth = () => Boolean(e.auth || (e.hasSuperuserAuth && e.hasSuperuserAuth()))
  const findByData = (collection, field, value) => {
    try {
      return $app.findFirstRecordByData(collection, field, value)
    } catch (_) {
      return null
    }
  }
  const findConsultantForAuth = () => {
    if (!e.auth) return null
    return (
      findByData('consultants', 'user_id', e.auth.id) ||
      findByData('consultants', 'email', normalizeEmail(e.auth.email()))
    )
  }
  const publicConsultant = (consultant) => ({
    id: consultant.id,
    user_id: consultant.get('user_id') || '',
    name: consultant.get('name') || '',
    whatsapp_number: consultant.get('whatsapp_number') || '',
    email: consultant.get('email') || '',
    photo_url: consultant.get('photo_url') || '',
    hubspot_owner_id: consultant.get('hubspot_owner_id') || '',
    google_calendar_id: consultant.get('google_calendar_id') || 'primary',
    google_connected_email: consultant.get('google_connected_email') || '',
    google_sync_status: consultant.get('google_sync_status') || '',
    calendar_connected_at: consultant.get('calendar_connected_at') || '',
    working_timezone: consultant.get('working_timezone') || 'America/Sao_Paulo',
    working_hours: consultant.get('working_hours') || {},
    has_tldv_api_key: Boolean(consultant.get('tldv_api_key')),
  })
  const expand = (record, fields) => {
    try {
      $app.expandRecord(record, fields)
    } catch (_) {}
    return record
  }
  const ensureUser = (email, name, userRole, password) => {
    const normalized = normalizeEmail(email)
    if (!normalized) return null
    const users = $app.findCollectionByNameOrId('_pb_users_auth_')
    let user = null
    let isNewUser = false
    try {
      user = $app.findAuthRecordByEmail('_pb_users_auth_', normalized)
    } catch (_) {}
    if (!user) {
      user = new Record(users)
      user.setEmail(normalized)
      user.setPassword(password || DEFAULT_CLIENT_PASSWORD)
      user.setVerified(true)
      isNewUser = true
    }
    if (name) user.set('name', name)
    user.set('role', userRole)
    if (userRole === 'consultant' && isNewUser) user.set('must_change_password', true)
    $app.save(user)
    return user
  }
  const firstRecord = (collection, sort) => {
    try {
      return $app.findRecordsByFilter(collection, '', sort || '', 1, 0)[0] || null
    } catch (_) {
      return null
    }
  }
  const ensureDefaultProgram = () => {
    let program = firstRecord('programs', 'name')
    if (program) return program
    const collection = $app.findCollectionByNameOrId('programs')
    program = new Record(collection)
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
  const ensureDefaultConsultant = () => {
    let consultant = firstRecord('consultants', 'name')
    if (consultant) return consultant
    const collection = $app.findCollectionByNameOrId('consultants')
    consultant = new Record(collection)
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
  const externalId = (kind, id) => {
    if (!id) return null
    try {
      return $app.findFirstRecordByFilter(
        'external_ids',
        `kind = '${String(kind)}' && external_id = '${String(id).replace(/'/g, "\\'")}'`,
      )
    } catch (_) {
      return null
    }
  }
  const consultantForOwner = (ownerId, fallbackName) => {
    const mapping = externalId('owner', ownerId)
    if (mapping && mapping.get('consultant_id')) {
      try {
        return $app.findRecordById('consultants', mapping.get('consultant_id'))
      } catch (_) {}
    }
    let consultant = findByData('consultants', 'hubspot_owner_id', ownerId)
    if (consultant) return consultant
    if (fallbackName) {
      try {
        consultant = $app.findFirstRecordByData('consultants', 'name', fallbackName)
        if (consultant) return consultant
      } catch (_) {}
    }
    return ensureDefaultConsultant()
  }
  const programForStage = (stageId) => {
    const mapping = externalId('deal_stage', stageId)
    if (mapping && mapping.get('program_id')) {
      try {
        return $app.findRecordById('programs', mapping.get('program_id'))
      } catch (_) {}
    }
    return ensureDefaultProgram()
  }
  const boolValue = (record, field, fallback) => {
    const value = record && record.get ? record.get(field) : record && record[field]
    if (value === undefined || value === null || value === '') return fallback
    return Boolean(value)
  }
  const normalizeStageText = (value) => {
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
  const stageMeetingNumber = (stage) => {
    const match = normalizeStageText(stage).match(/(\d+)\s*(?:a|o)?/)
    if (match) return Number(match[1])
    const text = normalizeStageText(stage)
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
  const stageProgress = (stageText, program, currentMeetingNumber) => {
    const text = normalizeStageText(stageText)
    const limit = Number(program.get('total_meetings') || 1)
    const number = stageMeetingNumber(stageText)
    const hasFinalized = text.includes('finalizad')
    const hasPending = text.includes('pendent')
    const hasRefund =
      text.includes('reembolso') || text.includes('reembols') || text.includes('refund')
    const hasNoShow =
      text.includes('no show') || text.includes('noshow') || text.includes('no-show')
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
  const parseHubspotDate = (value) => {
    if (value === undefined || value === null || value === '') return null
    const raw = String(value).trim()
    if (!raw) return null
    if (/^\d+$/.test(raw)) {
      const numeric = Number(raw)
      if (!Number.isFinite(numeric) || numeric <= 0) return null
      return new Date(numeric > 100000000000 ? numeric : numeric * 1000)
    }
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const detectCsvDelimiter = (text) => {
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
  const parseCsv = (text) => {
    const delimiter = detectCsvDelimiter(text)
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
  const headerKey = (value) => {
    const text = String(value || '')
      .trim()
      .toLowerCase()
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
    return text.replace(/[áàâãäéèêëíìîïóòôõöúùûüçªº]/g, (char) => replacements[char] || char)
  }
  const rowValue = (row, headerMap, names) => {
    for (let index = 0; index < names.length; index += 1) {
      const key = headerKey(names[index])
      const column = headerMap[key]
      if (column !== undefined) return String(row[column] || '').trim()
    }
    return ''
  }
  const sheetUrl = () =>
    env('GOOGLE_SHEETS_CSV_URL') ||
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
  const writeSyncLog = (source, status, checked, updated, message, payload) => {
    try {
      const collection = $app.findCollectionByNameOrId('sync_logs')
      const record = new Record(collection)
      record.set('source', source)
      record.set('status', status)
      record.set('checked', checked || 0)
      record.set('updated_count', updated || 0)
      record.set('message', message || '')
      record.set('payload', payload || {})
      $app.save(record)
    } catch (_) {}
  }
  const syncSheetClients = () => {
    const res = $http.send({ url: sheetUrl(), method: 'GET', timeout: 45 })
    if (res.statusCode < 200 || res.statusCode >= 300)
      throw new Error(
        'Nao foi possivel ler a planilha. Verifique o compartilhamento ou GOOGLE_SHEETS_CSV_URL.',
      )
    const rows = parseCsv(res.raw || res.body || String(res.text || ''))
    if (rows.length < 2) throw new Error('Planilha sem dados para importar.')
    const headers = rows[0]
    const headerMap = {}
    headers.forEach((header, index) => {
      headerMap[headerKey(header)] = index
    })
    let checked = 0
    let updated = 0
    const imported = []
    rows.slice(1).forEach((row, index) => {
      const email = normalizeEmail(rowValue(row, headerMap, ['Email do contato', 'Email']))
      if (!email) return
      checked += 1
      const dealId = rowValue(row, headerMap, [
        'Deal ID',
        'ID do negocio',
        'ID do negócio',
        'HubSpot Deal ID',
      ])
      const dealName = rowValue(row, headerMap, ['Nome do negocio', 'Nome do negócio'])
      const stageId = rowValue(row, headerMap, [
        'Etapa do negocio',
        'Etapa do negócio',
        'Status na pipe',
        'Status da pipe',
      ])
      const ownerId = rowValue(row, headerMap, [
        'Proprietario do negocio',
        'Proprietário do negócio',
        'Nome do proprietario do negocio',
        'Nome do proprietário do negócio',
        'Owner',
      ])
      const firstConsultantKey = rowValue(row, headerMap, [
        'Especialista Primeira Reuniao',
        'Especialista Primeira Reunião',
      ])
      const secondConsultantKey = rowValue(row, headerMap, [
        'Especialista Segunda Reuniao',
        'Especialista Segunda Reunião',
      ])
      const name = rowValue(row, headerMap, ['Nome do contato', 'Nome']) || dealName || email
      const phone = rowValue(row, headerMap, [
        'Telefone do contato',
        'Telefone/WhatsApp',
        'Telefone',
      ])
      const stageMap = externalId('deal_stage', stageId)
      const ownerMap = externalId('owner', ownerId)
      const program = programForStage(stageId)
      const consultant = consultantForOwner(ownerId, firstConsultantKey || secondConsultantKey)
      const user = ensureUser(email, name, 'client', DEFAULT_CLIENT_PASSWORD)
      let client = dealId ? findByData('clients', 'hubspot_deal_id', dealId) : null
      if (!client) client = findByData('clients', 'email', email)
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
      const closedAt = parseHubspotDate(rowValue(row, headerMap, ['Data de fechamento']))
      const firstCallAt = parseHubspotDate(
        rowValue(row, headerMap, ['Data 1a Call', 'Data 1ª Call']),
      )
      const secondCallAt = parseHubspotDate(
        rowValue(row, headerMap, ['Data 2a Call', 'Data 2ª Call']),
      )
      if (closedAt) client.set('closed_at', pbDate(closedAt))
      if (firstCallAt) client.set('first_call_at', pbDate(firstCallAt))
      if (secondCallAt) client.set('second_call_at', pbDate(secondCallAt))
      client.set('first_call_consultant_key', firstConsultantKey)
      client.set('second_call_consultant_key', secondConsultantKey)
      client.set('sheet_row_number', index + 2)
      client.set('sheet_payload', { headers, row })
      client.set('sheet_synced_at', pbDate(new Date()))
      const progress = stageProgress(
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
    writeSyncLog('google_sheets', 'success', checked, updated, 'Clientes sincronizados.', {
      url: sheetUrl(),
      imported: imported.slice(0, 50),
    })
    return { checked, updated, imported }
  }
  const tldvRequest = (apiKey, path) => {
    const res = $http.send({
      url: `${TLDV_API_BASE}${path}`,
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
      timeout: 45,
    })
    if (res.statusCode < 200 || res.statusCode >= 300) {
      const detail = (res.json || {}).message || (res.json || {}).name || res.raw || ''
      throw new Error(
        detail ? `tl;dv recusou a requisicao: ${detail}` : 'tl;dv recusou a requisicao.',
      )
    }
    return res.json || {}
  }
  const tldvMeetings = (apiKey) => {
    const meetings = []
    let page = 0
    let pages = 1
    while (page < pages && page < 10) {
      let data = null
      try {
        data = tldvRequest(apiKey, `/meetings?page=${page}&pageSize=100`)
      } catch (err) {
        if (page > 0) throw err
        data = tldvRequest(apiKey, '/meetings')
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
  const transcriptToText = (transcript) =>
    ((transcript || {}).data || [])
      .map((item) => `${item.speaker || 'Participante'}: ${item.text || ''}`)
      .join('\n\n')
  const escapeFilterValue = (value) =>
    String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
  const collectEmailsFromValue = (value, emails) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((item) => collectEmailsFromValue(item, emails))
      return
    }
    if (typeof value === 'object') {
      Object.keys(value).forEach((key) => collectEmailsFromValue(value[key], emails))
      return
    }
    String(value)
      .split(/[\s,;<>"'()]+/)
      .map((item) => normalizeEmail(item))
      .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
      .forEach((email) => {
        if (emails.indexOf(email) === -1) emails.push(email)
      })
  }
  const remoteMeetingEmails = (meeting) => {
    const emails = []
    collectEmailsFromValue(meeting.organizer, emails)
    collectEmailsFromValue(meeting.invitees, emails)
    collectEmailsFromValue(meeting.attendees, emails)
    collectEmailsFromValue(meeting.participants, emails)
    collectEmailsFromValue(meeting.extraProperties, emails)
    return emails
  }
  const remoteMeetingDate = (meeting) =>
    parseHubspotDate(
      meeting.happenedAt || meeting.startedAt || meeting.startTime || meeting.createdAt,
    )
  const remoteMeetingEnd = (meeting, startedAt) => {
    const durationSeconds = Number(meeting.duration || 0)
    const durationMs = durationSeconds > 0 ? durationSeconds * 1000 : 60 * 60 * 1000
    return new Date(startedAt.getTime() + durationMs)
  }
  const findTldvMeeting = (clientId, tldvMeetingId) => {
    try {
      return (
        $app.findRecordsByFilter(
          'meetings',
          `client_id = '${escapeFilterValue(clientId)}' && tldv_meeting_id = '${escapeFilterValue(tldvMeetingId)}'`,
          '-start_time',
          1,
          0,
        )[0] || null
      )
    } catch (_) {
      return null
    }
  }
  const findNearestClientMeeting = (consultantId, clientId, startedAt) => {
    try {
      const meetings = $app.findRecordsByFilter(
        'meetings',
        `consultant_id = '${escapeFilterValue(consultantId)}' && client_id = '${escapeFilterValue(clientId)}' && status != 'cancelled'`,
        '-start_time',
        100,
        0,
      )
      let best = null
      let bestDelta = 48 * 60 * 60 * 1000
      meetings.forEach((meeting) => {
        const start = parseDate(meeting.get('start_time'))
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
  const upsertTldvMeeting = (apiKey, consultant, client, remote) => {
    if (!remote.id) return { updated: false, created: false }
    const startedAt = remoteMeetingDate(remote)
    if (!startedAt) return { updated: false, created: false }
    const endedAt = remoteMeetingEnd(remote, startedAt)
    let meeting = findTldvMeeting(client.id, remote.id)
    let created = false
    if (!meeting) meeting = findNearestClientMeeting(consultant.id, client.id, startedAt)
    if (!meeting) {
      meeting = new Record($app.findCollectionByNameOrId('meetings'))
      meeting.set('client_id', client.id)
      meeting.set('consultant_id', consultant.id)
      meeting.set('program_id', client.get('program_id'))
      meeting.set('start_time', pbDate(startedAt))
      meeting.set('end_time', pbDate(endedAt))
      meeting.set('meeting_number', Math.max(1, Number(client.get('current_meeting_number') || 1)))
      meeting.set('source', 'tldv')
      created = true
    }
    if (!meeting.get('title')) meeting.set('title', remote.name || 'Reunião Elite')
    if (!meeting.get('end_time')) meeting.set('end_time', pbDate(endedAt))
    if (!meeting.get('start_time')) meeting.set('start_time', pbDate(startedAt))
    if (!meeting.get('program_id')) meeting.set('program_id', client.get('program_id'))
    if (!meeting.get('consultant_id')) meeting.set('consultant_id', consultant.id)
    if (!meeting.get('client_id')) meeting.set('client_id', client.id)
    meeting.set('status', 'completed')
    meeting.set('tldv_meeting_id', remote.id)
    meeting.set('tldv_url', remote.url || meeting.get('tldv_url') || '')
    meeting.set('recording_url', remote.url || meeting.get('recording_url') || '')
    if (!meeting.get('source')) meeting.set('source', created ? 'tldv' : 'google_calendar')
    const remoteUpdatedAt = parseHubspotDate(
      remote.updatedAt ||
        remote.updated_at ||
        remote.modifiedAt ||
        remote.transcriptUpdatedAt ||
        remote.notesUpdatedAt,
    )
    const lastSyncedAt = parseHubspotDate(meeting.get('tldv_synced_at'))
    const shouldRefreshDetails =
      created || !lastSyncedAt || (remoteUpdatedAt && remoteUpdatedAt > lastSyncedAt)
    if (shouldRefreshDetails || !meeting.get('tldv_transcript_text')) {
      try {
        const transcript = tldvRequest(apiKey, `/meetings/${remote.id}/transcript`)
        meeting.set('tldv_transcript', transcript)
        meeting.set('tldv_transcript_text', transcriptToText(transcript))
      } catch (_) {}
    }
    if (shouldRefreshDetails || !meeting.get('tldv_notes_markdown')) {
      try {
        const notes = tldvRequest(apiKey, `/meetings/${remote.id}/notes`)
        meeting.set('tldv_notes', notes)
        meeting.set('tldv_notes_markdown', notes.markdownContent || '')
      } catch (_) {}
    }
    meeting.set('tldv_synced_at', pbDate(new Date()))
    $app.save(meeting)
    return { updated: !created, created }
  }
  const syncTldvForConsultant = (consultant) => {
    const apiKey = consultant.get('tldv_api_key') || env('TLDV_API_KEY')
    if (!apiKey) return { enabled: false, checked: 0, matched: 0, updated: 0, created: 0 }
    const clients = $app.findRecordsByFilter(
      'clients',
      `consultant_id = '${escapeFilterValue(consultant.id)}'`,
      'name',
      1000,
      0,
    )
    const clientsByEmail = {}
    clients.forEach((client) => {
      const email = normalizeEmail(client.get('email'))
      if (email) clientsByEmail[email] = client
    })
    const remoteMeetings = tldvMeetings(apiKey)
    let matched = 0
    let updated = 0
    let created = 0
    remoteMeetings.forEach((remote) => {
      const clientIds = {}
      remoteMeetingEmails(remote).forEach((email) => {
        const client = clientsByEmail[email]
        if (!client || clientIds[client.id]) return
        clientIds[client.id] = true
        matched += 1
        const result = upsertTldvMeeting(apiKey, consultant, client, remote)
        if (result.created) created += 1
        if (result.updated) updated += 1
      })
    })
    writeSyncLog(
      'tldv',
      'success',
      remoteMeetings.length,
      updated + created,
      'tl;dv sincronizado por email dos clientes.',
      { consultant_id: consultant.id, matched, created, updated },
    )
    return { enabled: true, checked: remoteMeetings.length, matched, updated, created }
  }

  if (route === 'auth/change-password') {
    if (!requireAuth() || !e.auth) return forbidden()
    const body = e.requestInfo().body || {}
    const password = String(body.password || '')
    const confirmation = String(body.password_confirm || body.passwordConfirm || '')
    if (password.length < 8) return bad('Use uma senha com pelo menos 8 caracteres.')
    if (password !== confirmation) return bad('A confirmação da senha não confere.')
    try {
      const user = $app.findRecordById('_pb_users_auth_', e.auth.id)
      user.setPassword(password)
      user.set('must_change_password', false)
      $app.save(user)
      return e.json(200, { success: true })
    } catch (err) {
      return bad(err.message || 'Não foi possível alterar a senha.')
    }
  }

  if (route === 'auth/skip-password-change') {
    if (!requireAuth() || !e.auth) return forbidden()
    try {
      const user = $app.findRecordById('_pb_users_auth_', e.auth.id)
      user.set('must_change_password', false)
      $app.save(user)
      return e.json(200, { success: true })
    } catch (err) {
      return bad(err.message || 'Não foi possível pular a troca de senha.')
    }
  }

  if (route === 'sheets/sync') {
    if (!requireAuth() || !isAdmin()) return forbidden()
    try {
      return e.json(200, syncSheetClients())
    } catch (err) {
      writeSyncLog('google_sheets', 'error', 0, 0, err.message || 'Erro no sync.', {})
      return bad(err.message || 'Erro ao sincronizar planilha.')
    }
  }

  if (route === 'consultants/save') {
    if (!requireAuth() || !isAdmin()) return forbidden()
    const body = e.requestInfo().body || {}
    try {
      const email = normalizeEmail(body.email)
      const user = email
        ? ensureUser(email, body.name, 'consultant', body.password || DEFAULT_CLIENT_PASSWORD)
        : null
      let consultant = body.id ? $app.findRecordById('consultants', body.id) : null
      if (!consultant) consultant = new Record($app.findCollectionByNameOrId('consultants'))
      ;[
        'name',
        'whatsapp_number',
        'email',
        'google_calendar_id',
        'working_timezone',
        'photo_url',
        'hubspot_owner_id',
      ].forEach((field) => {
        if (body[field] !== undefined) consultant.set(field, body[field])
      })
      if (body.working_hours !== undefined) consultant.set('working_hours', body.working_hours)
      if (user) consultant.set('user_id', user.id)
      if (!consultant.get('google_calendar_id')) consultant.set('google_calendar_id', 'primary')
      if (!consultant.get('working_timezone'))
        consultant.set('working_timezone', 'America/Sao_Paulo')
      $app.save(consultant)
      return e.json(200, {
        consultant: publicConsultant(consultant),
        user_id: user ? user.id : consultant.get('user_id'),
      })
    } catch (err) {
      return bad(err.message || 'Erro ao salvar consultor.')
    }
  }

  if (route === 'consultant/profile') {
    if (!requireAuth() || (!isConsultant() && !isAdmin())) return forbidden()
    const body = e.requestInfo().body || {}
    try {
      const consultant =
        isAdmin() && body.consultant_id
          ? $app.findRecordById('consultants', body.consultant_id)
          : findConsultantForAuth()
      if (!consultant) return bad('Consultor nao encontrado.')
      ;[
        'name',
        'whatsapp_number',
        'email',
        'photo_url',
        'google_calendar_id',
        'working_timezone',
      ].forEach((field) => {
        if (body[field] !== undefined) consultant.set(field, body[field])
      })
      if (String(body.tldv_api_key || '').trim())
        consultant.set('tldv_api_key', String(body.tldv_api_key).trim())
      if (body.working_hours !== undefined) consultant.set('working_hours', body.working_hours)
      $app.save(consultant)
      return e.json(200, { consultant: publicConsultant(consultant) })
    } catch (err) {
      return bad(err.message || 'Erro ao atualizar perfil.')
    }
  }

  if (route === 'consultant/tldv/sync') {
    if (!requireAuth() || (!isConsultant() && !isAdmin())) return forbidden()
    const body = e.requestInfo().body || {}
    try {
      const consultant =
        isAdmin() && body.consultant_id
          ? $app.findRecordById('consultants', body.consultant_id)
          : findConsultantForAuth()
      if (!consultant) return bad('Consultor nao encontrado.')
      return e.json(200, syncTldvForConsultant(consultant))
    } catch (err) {
      writeSyncLog('tldv', 'error', 0, 0, err.message || 'Erro no tl;dv.', {})
      return bad(err.message || 'Erro ao sincronizar tl;dv.')
    }
  }

  return notFound()
})
