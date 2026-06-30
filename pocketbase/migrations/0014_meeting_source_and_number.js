migrate(
  (app) => {
    const meetings = app.findCollectionByNameOrId('meetings')

    if (!meetings.fields.getByName('source')) {
      meetings.fields.add(new TextField({ name: 'source' }))
    }

    if (!meetings.fields.getByName('meeting_number')) {
      meetings.fields.add(new NumberField({ name: 'meeting_number' }))
    }

    app.save(meetings)

    try {
      const records = app.findRecordsByFilter('meetings', '', '', 500, 0)
      for (const meeting of records) {
        let changed = false
        if (!meeting.get('source')) {
          const googleEventId = meeting.get('google_event_id') || ''
          meeting.set('source', googleEventId ? 'google_calendar' : 'manual')
          changed = true
        }
        if (!meeting.get('meeting_number')) {
          meeting.set('meeting_number', 1)
          changed = true
        }
        if (changed) app.save(meeting)
      }
    } catch (_) {}
  },
  (app) => {
    // Keep fields on rollback to avoid data loss
  },
)
