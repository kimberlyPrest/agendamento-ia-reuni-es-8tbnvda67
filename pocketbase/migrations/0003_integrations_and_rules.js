migrate(
  (app) => {
    const addField = (collection, name, field) => {
      try {
        collection.fields.getByName(name)
      } catch (_) {
        collection.fields.add(field)
      }
    }

    const saveCollection = (name, configure) => {
      const collection = app.findCollectionByNameOrId(name)
      configure(collection)
      app.save(collection)
      return collection
    }

    saveCollection('users', (users) => {
      addField(users, 'role', new TextField({ name: 'role' }))
    })

    saveCollection('programs', (programs) => {
      addField(programs, 'require_tally', new BoolField({ name: 'require_tally' }))
      addField(programs, 'max_future_meetings', new NumberField({ name: 'max_future_meetings' }))
      addField(programs, 'min_reschedule_hours', new NumberField({ name: 'min_reschedule_hours' }))
      addField(programs, 'booking_window_days', new NumberField({ name: 'booking_window_days' }))
      addField(
        programs,
        'buffer_before_minutes',
        new NumberField({ name: 'buffer_before_minutes' }),
      )
      addField(programs, 'buffer_after_minutes', new NumberField({ name: 'buffer_after_minutes' }))
      addField(programs, 'min_interval_unit', new TextField({ name: 'min_interval_unit' }))
      addField(programs, 'confirmation_message', new TextField({ name: 'confirmation_message' }))
      programs.listRule = "@request.auth.role = 'admin'"
      programs.viewRule = "@request.auth.role = 'admin'"
      programs.createRule = "@request.auth.role = 'admin'"
      programs.updateRule = "@request.auth.role = 'admin'"
      programs.deleteRule = "@request.auth.role = 'admin'"
    })

    saveCollection('consultants', (consultants) => {
      addField(consultants, 'working_timezone', new TextField({ name: 'working_timezone' }))
      addField(consultants, 'google_access_token', new TextField({ name: 'google_access_token' }))
      addField(consultants, 'google_refresh_token', new TextField({ name: 'google_refresh_token' }))
      addField(consultants, 'google_token_expiry', new DateField({ name: 'google_token_expiry' }))
      addField(
        consultants,
        'google_connected_email',
        new TextField({ name: 'google_connected_email' }),
      )
      addField(consultants, 'google_scopes', new TextField({ name: 'google_scopes' }))
      addField(consultants, 'google_sync_status', new TextField({ name: 'google_sync_status' }))
      addField(consultants, 'google_oauth_state', new TextField({ name: 'google_oauth_state' }))
      addField(
        consultants,
        'calendar_connected_at',
        new DateField({ name: 'calendar_connected_at' }),
      )
      consultants.listRule = "@request.auth.role = 'admin'"
      consultants.viewRule = "@request.auth.role = 'admin'"
      consultants.createRule = "@request.auth.role = 'admin'"
      consultants.updateRule = "@request.auth.role = 'admin'"
      consultants.deleteRule = "@request.auth.role = 'admin'"
    })

    saveCollection('clients', (clients) => {
      addField(
        clients,
        'meeting_limit_override',
        new NumberField({ name: 'meeting_limit_override' }),
      )
      addField(clients, 'extra_meetings', new NumberField({ name: 'extra_meetings' }))
      addField(clients, 'tally_submission_id', new TextField({ name: 'tally_submission_id' }))
      addField(clients, 'tally_answered_at', new DateField({ name: 'tally_answered_at' }))
      addField(clients, 'tally_payload', new JSONField({ name: 'tally_payload' }))
      addField(clients, 'notes', new TextField({ name: 'notes' }))
      clients.listRule = "@request.auth.role = 'admin'"
      clients.viewRule = "@request.auth.role = 'admin'"
      clients.createRule = "@request.auth.role = 'admin'"
      clients.updateRule = "@request.auth.role = 'admin'"
      clients.deleteRule = "@request.auth.role = 'admin'"
    })

    saveCollection('meetings', (meetings) => {
      addField(meetings, 'title', new TextField({ name: 'title' }))
      addField(meetings, 'meeting_number', new NumberField({ name: 'meeting_number' }))
      addField(meetings, 'google_html_link', new URLField({ name: 'google_html_link' }))
      addField(meetings, 'cancelled_at', new DateField({ name: 'cancelled_at' }))
      addField(meetings, 'rescheduled_at', new DateField({ name: 'rescheduled_at' }))
      addField(meetings, 'cancellation_reason', new TextField({ name: 'cancellation_reason' }))
      addField(meetings, 'source', new TextField({ name: 'source' }))
      meetings.listRule = "@request.auth.role = 'admin'"
      meetings.viewRule = "@request.auth.role = 'admin'"
      meetings.createRule = "@request.auth.role = 'admin'"
      meetings.updateRule = "@request.auth.role = 'admin'"
      meetings.deleteRule = "@request.auth.role = 'admin'"
    })

    try {
      const admin = app.findAuthRecordByEmail('users', 'kimberly@adapta.org')
      admin.set('role', 'admin')
      app.save(admin)
    } catch (_) {
      try {
        const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'kimberly@adapta.org')
        admin.set('role', 'admin')
        app.save(admin)
      } catch (_) {}
    }

    try {
      const programs = app.findRecordsByFilter('programs', '', '', 500, 0)
      programs.forEach((program) => {
        if (program.get('require_tally') === null || program.get('require_tally') === undefined) {
          program.set('require_tally', true)
        }
        if (!program.get('max_future_meetings')) program.set('max_future_meetings', 1)
        if (!program.get('min_reschedule_hours')) program.set('min_reschedule_hours', 24)
        if (!program.get('booking_window_days')) program.set('booking_window_days', 60)
        if (!program.get('min_interval_unit')) program.set('min_interval_unit', 'days')
        if (
          program.get('buffer_before_minutes') === null ||
          program.get('buffer_before_minutes') === undefined
        ) {
          program.set('buffer_before_minutes', 0)
        }
        if (
          program.get('buffer_after_minutes') === null ||
          program.get('buffer_after_minutes') === undefined
        ) {
          program.set('buffer_after_minutes', 0)
        }
        app.save(program)
      })
    } catch (_) {}

    try {
      const consultants = app.findRecordsByFilter('consultants', '', '', 500, 0)
      consultants.forEach((consultant) => {
        if (!consultant.get('working_timezone'))
          consultant.set('working_timezone', 'America/Sao_Paulo')
        if (!consultant.get('google_sync_status'))
          consultant.set('google_sync_status', 'not_connected')
        app.save(consultant)
      })
    } catch (_) {}
  },
  (app) => {
    // Schema fields are intentionally kept on rollback to avoid data loss.
  },
)
