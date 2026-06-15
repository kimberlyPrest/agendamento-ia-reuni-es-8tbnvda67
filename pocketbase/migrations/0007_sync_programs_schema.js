migrate(
  (app) => {
    // Ensure the 'role' field is present on users for the access rules
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'client', 'consultant'],
          maxSelect: 1,
        }),
      )
      app.save(users)

      // Give admin role to the seed user to prevent lockout
      try {
        const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'kimberly@adapta.org')
        admin.set('role', 'admin')
        app.save(admin)
      } catch (_) {}
    }

    const programs = app.findCollectionByNameOrId('programs')

    const fields = [
      new TextField({ name: 'name', required: true }),
      new NumberField({ name: 'total_meetings', required: true }),
      new NumberField({ name: 'meeting_duration', required: true }),
      new TextField({ name: 'title_template' }),
      new URLField({ name: 'tally_form_template' }),
      new BoolField({ name: 'require_tally' }),
      new BoolField({ name: 'allow_concurrent' }),
      new NumberField({ name: 'max_future_meetings' }),
      new NumberField({ name: 'min_interval_days' }),
      new TextField({ name: 'min_interval_unit' }),
      new NumberField({ name: 'min_reschedule_hours' }),
      new NumberField({ name: 'late_reschedule_delay_days' }),
      new NumberField({ name: 'booking_window_days' }),
      new NumberField({ name: 'buffer_before_minutes' }),
      new NumberField({ name: 'buffer_after_minutes' }),
      new TextField({ name: 'confirmation_message' }),
    ]

    let changed = false
    for (const field of fields) {
      const existing = programs.fields.getByName(field.name)
      if (!existing) {
        programs.fields.add(field)
        changed = true
      } else if (existing.type !== field.type) {
        programs.fields.removeByName(field.name)
        programs.fields.add(field)
        changed = true
      }
    }

    if (programs.createRule !== "@request.auth.role = 'admin'") {
      programs.createRule = "@request.auth.role = 'admin'"
      changed = true
    }

    if (changed) {
      app.save(programs)
    }
  },
  (app) => {
    // down migration
  },
)
