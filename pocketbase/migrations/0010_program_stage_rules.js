migrate(
  (app) => {
    const programs = app.findCollectionByNameOrId('programs')
    if (!programs.fields.getByName('no_show_counts_as_meeting')) {
      programs.fields.add(new BoolField({ name: 'no_show_counts_as_meeting' }))
      app.save(programs)
    }
  },
  (app) => {
    // Keep the field on rollback to avoid losing configured program rules.
  },
)
