routerAdd('POST', '/backend/v1/client/auth', (e) => {
  const body = e.requestInfo().body || {}
  if (!body.email) return e.badRequestError('Email é obrigatório')

  try {
    const client = $app.findFirstRecordByData('clients', 'email', body.email)
    $app.expandRecord(client, ['program_id', 'consultant_id'])

    let upcoming = null
    try {
      const now = new Date().toISOString().replace('T', ' ')
      upcoming = $app.findFirstRecordByFilter(
        'meetings',
        `client_id = '${client.id}' && status = 'scheduled' && start_time > '${now}'`,
      )
      if (upcoming) {
        $app.expandRecord(upcoming, ['consultant_id', 'program_id'])
      }
    } catch (_) {}

    return e.json(200, { client, upcoming })
  } catch (_) {
    return e.notFoundError('Email não encontrado')
  }
})
