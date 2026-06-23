migrate(
  (app) => {
    const programs = app.findCollectionByNameOrId('programs')
    const field = programs.fields.getByName('no_show_counts_as_meeting')
    if (field) {
      programs.fields.removeById(field.id)
      app.save(programs)
    }
  },
  (app) => {
    // The rule was removed intentionally: no-show never consumes meeting balance.
  },
)
