migrate(
  (app) => {
    const addField = (collection, name, field) => {
      let existing = null
      try {
        existing = collection.fields.getByName(name)
      } catch (_) {}
      if (!existing) collection.fields.add(field)
    }

    const ensureCollection = (name, fields, rules) => {
      let collection = null
      try {
        collection = app.findCollectionByNameOrId(name)
      } catch (_) {}
      if (!collection) {
        collection = new Collection({ name, type: 'base', fields })
      }
      collection.listRule = rules.listRule
      collection.viewRule = rules.viewRule
      collection.createRule = rules.createRule
      collection.updateRule = rules.updateRule
      collection.deleteRule = rules.deleteRule
      app.save(collection)
      return app.findCollectionByNameOrId(name)
    }

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    addField(users, 'role', new TextField({ name: 'role' }))
    app.save(users)

    const consultants = app.findCollectionByNameOrId('consultants')
    addField(consultants, 'user_id', new TextField({ name: 'user_id' }))
    addField(consultants, 'photo_url', new URLField({ name: 'photo_url' }))
    addField(consultants, 'tldv_api_key', new TextField({ name: 'tldv_api_key' }))
    addField(consultants, 'hubspot_owner_id', new TextField({ name: 'hubspot_owner_id' }))
    app.save(consultants)

    const clients = app.findCollectionByNameOrId('clients')
    addField(clients, 'user_id', new TextField({ name: 'user_id' }))
    addField(clients, 'hubspot_deal_id', new TextField({ name: 'hubspot_deal_id' }))
    addField(clients, 'deal_name', new TextField({ name: 'deal_name' }))
    addField(clients, 'deal_stage_id', new TextField({ name: 'deal_stage_id' }))
    addField(clients, 'deal_stage_name', new TextField({ name: 'deal_stage_name' }))
    addField(clients, 'deal_owner_id', new TextField({ name: 'deal_owner_id' }))
    addField(clients, 'deal_owner_name', new TextField({ name: 'deal_owner_name' }))
    addField(clients, 'contact_phone', new TextField({ name: 'contact_phone' }))
    addField(clients, 'closed_at', new DateField({ name: 'closed_at' }))
    addField(clients, 'first_call_at', new DateField({ name: 'first_call_at' }))
    addField(
      clients,
      'first_call_consultant_key',
      new TextField({ name: 'first_call_consultant_key' }),
    )
    addField(clients, 'second_call_at', new DateField({ name: 'second_call_at' }))
    addField(
      clients,
      'second_call_consultant_key',
      new TextField({ name: 'second_call_consultant_key' }),
    )
    addField(clients, 'sheet_row_number', new NumberField({ name: 'sheet_row_number' }))
    addField(clients, 'sheet_payload', new JSONField({ name: 'sheet_payload' }))
    addField(clients, 'sheet_synced_at', new DateField({ name: 'sheet_synced_at' }))
    app.save(clients)

    const meetings = app.findCollectionByNameOrId('meetings')
    addField(meetings, 'recording_url', new URLField({ name: 'recording_url' }))
    addField(meetings, 'tldv_meeting_id', new TextField({ name: 'tldv_meeting_id' }))
    addField(meetings, 'tldv_url', new URLField({ name: 'tldv_url' }))
    addField(meetings, 'tldv_transcript', new JSONField({ name: 'tldv_transcript' }))
    addField(meetings, 'tldv_transcript_text', new TextField({ name: 'tldv_transcript_text' }))
    addField(meetings, 'tldv_notes', new JSONField({ name: 'tldv_notes' }))
    addField(meetings, 'tldv_notes_markdown', new TextField({ name: 'tldv_notes_markdown' }))
    addField(meetings, 'tldv_synced_at', new DateField({ name: 'tldv_synced_at' }))
    app.save(meetings)

    ensureCollection(
      'external_ids',
      [
        { name: 'kind', type: 'text', required: true },
        { name: 'external_id', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'consultant_id', type: 'text' },
        { name: 'program_id', type: 'text' },
        { name: 'completed_meetings', type: 'number' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      {
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
      },
    )

    ensureCollection(
      'sync_logs',
      [
        { name: 'source', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'checked', type: 'number' },
        { name: 'updated_count', type: 'number' },
        { name: 'message', type: 'text' },
        { name: 'payload', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      {
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
      },
    )
  },
  (app) => {
    // Keep hub fields and sync collections to avoid losing imported operational data.
  },
)
