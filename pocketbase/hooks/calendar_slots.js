routerAdd('GET', '/backend/v1/calendar/slots', (e) => {
  const consultantId = e.request.url.query().get('consultant_id')
  const dateStr = e.request.url.query().get('date')
  if (!consultantId || !dateStr) return e.badRequestError('Missing params')

  try {
    const consultant = $app.findRecordById('consultants', consultantId)
    const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay().toString()
    const wh = consultant.get('working_hours') || {}
    const daySlots = wh[dow] || ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

    const startOfDay = dateStr + ' 00:00:00.000Z'
    const endOfDay = dateStr + ' 23:59:59.999Z'
    const filter = `consultant_id = '${consultantId}' && start_time >= '${startOfDay}' && start_time <= '${endOfDay}' && status = 'scheduled'`

    let bookedTimes = []
    try {
      const meetings = $app.findRecordsByFilter('meetings', filter, '', 100, 0)
      bookedTimes = meetings.map((m) => m.get('start_time').substring(11, 16))
    } catch (_) {}

    const available = daySlots.filter((s) => !bookedTimes.includes(s))
    return e.json(200, { slots: available })
  } catch (err) {
    return e.badRequestError(err.message)
  }
})
