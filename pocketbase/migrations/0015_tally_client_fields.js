migrate(
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')

    if (!clients.fields.getByName('tally_submission_id')) {
      clients.fields.add(new TextField({ name: 'tally_submission_id' }))
    }

    if (!clients.fields.getByName('tally_answered_at')) {
      clients.fields.add(new DateField({ name: 'tally_answered_at' }))
    }

    if (!clients.fields.getByName('tally_payload')) {
      clients.fields.add(new JSONField({ name: 'tally_payload' }))
    }

    app.save(clients)
  },
  (app) => {
    // Keep fields on rollback to avoid data loss
  },
)
