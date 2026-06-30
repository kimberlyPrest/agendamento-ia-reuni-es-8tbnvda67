migrate(
  (app) => {
    const meetings = app.findCollectionByNameOrId('meetings')

    if (!meetings.fields.getByName('title')) {
      meetings.fields.add(new TextField({ name: 'title' }))
    }

    if (!meetings.fields.getByName('google_html_link')) {
      meetings.fields.add(new URLField({ name: 'google_html_link' }))
    }

    app.save(meetings)
  },
  (app) => {
    // Keep fields on rollback to avoid data loss
  },
)
