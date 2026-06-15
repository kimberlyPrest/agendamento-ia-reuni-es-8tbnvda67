migrate(
  (app) => {
    let programs
    try {
      programs = app.findCollectionByNameOrId('programs')
    } catch {
      try {
        programs = app.findCollectionByNameOrId('Programs')
      } catch {
        programs = new Collection({
          name: 'programs',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'total_meetings', type: 'number', required: true },
            { name: 'meeting_duration', type: 'number', required: true },
            { name: 'title_template', type: 'text' },
            { name: 'tally_form_url', type: 'url' },
            { name: 'allow_concurrent', type: 'bool' },
            { name: 'min_interval_days', type: 'number' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        })
      }
    }

    if (!programs.fields.getByName('tally_form_url')) {
      programs.fields.add(new URLField({ name: 'tally_form_url' }))
    }
    let tm = programs.fields.getByName('total_meetings')
    if (tm) tm.required = true
    let md = programs.fields.getByName('meeting_duration')
    if (md) md.required = true

    programs.listRule = "@request.auth.id != ''"
    programs.viewRule = "@request.auth.id != ''"
    programs.createRule = "@request.auth.id != ''"
    programs.updateRule = "@request.auth.id != ''"
    programs.deleteRule = "@request.auth.id != ''"
    app.save(programs)

    let consultants
    try {
      consultants = app.findCollectionByNameOrId('consultants')
    } catch {
      try {
        consultants = app.findCollectionByNameOrId('Consultants')
      } catch {
        consultants = new Collection({
          name: 'consultants',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'whatsapp_number', type: 'text' },
            { name: 'email', type: 'email' },
            { name: 'google_calendar_id', type: 'text' },
            { name: 'working_hours', type: 'json' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        })
      }
    }

    consultants.listRule = "@request.auth.id != ''"
    consultants.viewRule = "@request.auth.id != ''"
    consultants.createRule = "@request.auth.id != ''"
    consultants.updateRule = "@request.auth.id != ''"
    consultants.deleteRule = "@request.auth.id != ''"
    app.save(consultants)

    let clients
    try {
      clients = app.findCollectionByNameOrId('clients')
    } catch {
      try {
        clients = app.findCollectionByNameOrId('Clients')
      } catch {
        clients = new Collection({
          name: 'clients',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
          fields: [
            { name: 'email', type: 'email', required: true },
            { name: 'name', type: 'text', required: true },
            {
              name: 'program_id',
              type: 'relation',
              required: true,
              collectionId: programs.id,
              maxSelect: 1,
            },
            {
              name: 'consultant_id',
              type: 'relation',
              required: true,
              collectionId: consultants.id,
              maxSelect: 1,
            },
            { name: 'current_meeting_number', type: 'number' },
            { name: 'form_answered', type: 'bool' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        })
      }
    }

    clients.listRule = "@request.auth.id != ''"
    clients.viewRule = "@request.auth.id != ''"
    clients.createRule = "@request.auth.id != ''"
    clients.updateRule = "@request.auth.id != ''"
    clients.deleteRule = "@request.auth.id != ''"
    app.save(clients)
    clients.addIndex('idx_clients_email', true, 'email', '')
    app.save(clients)

    let meetings
    try {
      meetings = app.findCollectionByNameOrId('meetings')
    } catch {
      try {
        meetings = app.findCollectionByNameOrId('Meetings')
      } catch {
        meetings = new Collection({
          name: 'meetings',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
          fields: [
            {
              name: 'client_id',
              type: 'relation',
              required: true,
              collectionId: clients.id,
              maxSelect: 1,
            },
            {
              name: 'consultant_id',
              type: 'relation',
              required: true,
              collectionId: consultants.id,
              maxSelect: 1,
            },
            {
              name: 'program_id',
              type: 'relation',
              required: true,
              collectionId: programs.id,
              maxSelect: 1,
            },
            { name: 'start_time', type: 'date', required: true },
            { name: 'end_time', type: 'date', required: true },
            { name: 'google_event_id', type: 'text' },
            { name: 'meet_link', type: 'text' },
            {
              name: 'status',
              type: 'select',
              values: ['scheduled', 'cancelled', 'completed'],
              maxSelect: 1,
            },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
        })
      }
    }

    if (!meetings.fields.getByName('end_time')) {
      meetings.fields.add(new DateField({ name: 'end_time', required: true }))
    } else {
      meetings.fields.getByName('end_time').required = true
    }

    if (!meetings.fields.getByName('meet_link')) {
      meetings.fields.add(new TextField({ name: 'meet_link' }))
    }

    meetings.listRule = "@request.auth.id != ''"
    meetings.viewRule = "@request.auth.id != ''"
    meetings.createRule = "@request.auth.id != ''"
    meetings.updateRule = "@request.auth.id != ''"
    meetings.deleteRule = "@request.auth.id != ''"
    app.save(meetings)
    meetings.addIndex('idx_meetings_start', false, 'start_time', '')
    app.save(meetings)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('meetings'))
    } catch {}
    try {
      app.delete(app.findCollectionByNameOrId('clients'))
    } catch {}
    try {
      app.delete(app.findCollectionByNameOrId('consultants'))
    } catch {}
    try {
      app.delete(app.findCollectionByNameOrId('programs'))
    } catch {}
  },
)
