migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'kimberly@adapta.org')
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('kimberly@adapta.org')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Admin')
      app.save(admin)
    }

    let programId
    try {
      const p = app.findFirstRecordByData('programs', 'name', 'AI Masterclass')
      programId = p.id
    } catch (_) {
      const col = app.findCollectionByNameOrId('programs')
      const record = new Record(col)
      record.set('name', 'AI Masterclass')
      record.set('total_meetings', 5)
      record.set('meeting_duration', 60)
      record.set('title_template', 'Sessão de IA - {client_name}')
      record.set('allow_concurrent', false)
      record.set('min_interval_days', 7)
      app.save(record)
      programId = record.id
    }

    let consultantId
    try {
      const c = app.findFirstRecordByData('consultants', 'email', 'consultor@adapta.org')
      consultantId = c.id
    } catch (_) {
      const col = app.findCollectionByNameOrId('consultants')
      const record = new Record(col)
      record.set('name', 'João Consultor')
      record.set('whatsapp_number', '5511999999999')
      record.set('email', 'consultor@adapta.org')
      record.set('working_hours', {
        monday: ['09:00', '10:30', '14:00', '15:30'],
        tuesday: ['09:00', '10:30'],
        wednesday: ['09:00', '10:30', '14:00'],
        thursday: ['14:00', '15:30'],
        friday: ['10:30', '14:00'],
      })
      app.save(record)
      consultantId = record.id
    }

    try {
      app.findFirstRecordByData('clients', 'email', 'cliente@teste.com')
    } catch (_) {
      const col = app.findCollectionByNameOrId('clients')
      const record = new Record(col)
      record.set('email', 'cliente@teste.com')
      record.set('name', 'Maria Cliente')
      record.set('program_id', programId)
      record.set('consultant_id', consultantId)
      record.set('current_meeting_number', 1)
      record.set('form_answered', true)
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'kimberly@adapta.org')
      app.delete(record)
    } catch (_) {}
  },
)
