migrate(
  (app) => {
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'kimberly@adapta.org')
    } catch (_) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const admin = new Record(users)
      admin.setEmail('kimberly@adapta.org')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Admin')
      app.save(admin)
    }

    let program
    try {
      program = app.findFirstRecordByData('programs', 'name', 'Mentoria AI VIP')
    } catch (_) {
      const col = app.findCollectionByNameOrId('programs')
      program = new Record(col)
      program.set('name', 'Mentoria AI VIP')
      program.set('total_meetings', 4)
      program.set('meeting_duration', 60)
      program.set('title_template', 'Sessão de Mentoria AI - {client}')
      program.set('allow_concurrent', false)
      program.set('min_interval_days', 7)
      program.set('tally_form_url', 'https://tally.so/r/mock')
      app.save(program)
    }

    let consultant
    try {
      consultant = app.findFirstRecordByData('consultants', 'email', 'joao@exemplo.com')
    } catch (_) {
      const col = app.findCollectionByNameOrId('consultants')
      consultant = new Record(col)
      consultant.set('name', 'João Silva')
      consultant.set('whatsapp_number', '5511999999999')
      consultant.set('email', 'joao@exemplo.com')
      consultant.set('working_hours', {
        1: ['09:00', '10:00', '14:00', '15:00'],
        2: ['09:00', '10:00', '14:00', '15:00'],
        3: ['09:00', '10:00', '14:00', '15:00'],
        4: ['09:00', '10:00', '14:00', '15:00'],
        5: ['09:00', '10:00', '14:00', '15:00'],
      })
      app.save(consultant)
    }

    try {
      app.findFirstRecordByData('clients', 'email', 'cliente@exemplo.com')
    } catch (_) {
      const col = app.findCollectionByNameOrId('clients')
      const client = new Record(col)
      client.set('name', 'Cliente Teste')
      client.set('email', 'cliente@exemplo.com')
      client.set('program_id', program.id)
      client.set('consultant_id', consultant.id)
      client.set('current_meeting_number', 1)
      client.set('form_answered', false)
      app.save(client)
    }
  },
  (app) => {},
)
