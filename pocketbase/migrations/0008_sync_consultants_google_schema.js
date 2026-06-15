migrate(
  (app) => {
    const consultants = app.findCollectionByNameOrId('consultants')

    const fields = [
      new TextField({ name: 'working_timezone' }),
      new TextField({ name: 'google_access_token' }),
      new TextField({ name: 'google_refresh_token' }),
      new DateField({ name: 'google_token_expiry' }),
      new TextField({ name: 'google_connected_email' }),
      new TextField({ name: 'google_scopes' }),
      new TextField({ name: 'google_sync_status' }),
      new TextField({ name: 'google_oauth_state' }),
      new DateField({ name: 'calendar_connected_at' }),
    ]

    let changed = false
    for (const field of fields) {
      const existing = consultants.fields.getByName(field.name)
      if (!existing) {
        consultants.fields.add(field)
        changed = true
      }
    }

    if (consultants.listRule !== "@request.auth.role = 'admin'") {
      consultants.listRule = "@request.auth.role = 'admin'"
      consultants.viewRule = "@request.auth.role = 'admin'"
      consultants.createRule = "@request.auth.role = 'admin'"
      consultants.updateRule = "@request.auth.role = 'admin'"
      consultants.deleteRule = "@request.auth.role = 'admin'"
      changed = true
    }

    if (changed) app.save(consultants)

    try {
      const records = app.findRecordsByFilter('consultants', '', '', 500, 0)
      for (const consultant of records) {
        let recordChanged = false
        if (!consultant.get('working_timezone')) {
          consultant.set('working_timezone', 'America/Sao_Paulo')
          recordChanged = true
        }
        if (!consultant.get('google_sync_status')) {
          consultant.set('google_sync_status', 'not_connected')
          recordChanged = true
        }
        if (recordChanged) app.save(consultant)
      }
    } catch (_) {}
  },
  (app) => {
    // Keep OAuth fields on rollback to avoid deleting connected calendar credentials.
  },
)
