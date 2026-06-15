routerAdd('POST', '/backend/v1/client/simulate-tally', (e) => {
  const body = e.requestInfo().body || {}
  if (!body.client_id) return e.badRequestError('Missing client_id')

  try {
    const client = $app.findRecordById('clients', body.client_id)
    client.set('form_answered', true)
    $app.save(client)
    return e.json(200, { success: true })
  } catch (err) {
    return e.badRequestError(err.message)
  }
})
