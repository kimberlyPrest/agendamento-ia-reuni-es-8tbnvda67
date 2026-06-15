routerAdd('POST', '/backend/v1/calendar/cancel', (e) => {
  const body = e.requestInfo().body || {}
  if (!body.meeting_id) return e.badRequestError('Missing meeting_id')

  try {
    const meeting = $app.findRecordById('meetings', body.meeting_id)
    meeting.set('status', 'cancelled')
    $app.save(meeting)
    return e.json(200, { success: true })
  } catch (err) {
    return e.badRequestError(err.message)
  }
})
