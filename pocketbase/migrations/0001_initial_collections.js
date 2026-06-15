migrate(
  (app) => {
    const programs = new Collection({
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
    app.save(programs)

    const consultants = new Collection({
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
    app.save(consultants)

    const clients = new Collection({
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
      indexes: ['CREATE UNIQUE INDEX idx_clients_email ON clients (email)'],
    })
    app.save(clients)

    const meetings = new Collection({
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
      indexes: ['CREATE INDEX idx_meetings_start ON meetings (start_time)'],
    })
    app.save(meetings)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('meetings'))
    app.delete(app.findCollectionByNameOrId('clients'))
    app.delete(app.findCollectionByNameOrId('consultants'))
    app.delete(app.findCollectionByNameOrId('programs'))
  },
)
