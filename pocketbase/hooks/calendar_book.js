routerAdd('POST', '/backend/v1/calendar/book', (e) => {
  const body = e.requestInfo().body || {}
  const { client_id, consultant_id, program_id, start_time, end_time } = body

  if (!client_id || !consultant_id || !program_id || !start_time || !end_time) {
    return e.badRequestError('Missing required fields')
  }

  try {
    try {
      const existing = $app.findFirstRecordByFilter(
        'meetings',
        `consultant_id = '${consultant_id}' && start_time = '${start_time}' && status = 'scheduled'`,
      )
      if (existing) {
        return e.badRequestError('Horário já reservado')
      }
    } catch (_) {}

    const collection = $app.findCollectionByNameOrId('meetings')
    const record = new Record(collection)
    record.set('client_id', client_id)
    record.set('consultant_id', consultant_id)
    record.set('program_id', program_id)
    record.set('start_time', start_time)
    record.set('end_time', end_time)
    record.set('status', 'scheduled')
    record.set('meet_link', 'https://meet.google.com/' + $security.randomString(10).toLowerCase())

    $app.save(record)
    return e.json(200, { meeting: record })
  } catch (err) {
    return e.badRequestError(err.message)
  }
})
