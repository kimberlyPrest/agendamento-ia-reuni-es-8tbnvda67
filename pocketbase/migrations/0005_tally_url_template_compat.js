migrate(
  (app) => {
    const programs = app.findCollectionByNameOrId('programs')

    try {
      programs.fields.getByName('tally_form_template')
    } catch (_) {
      programs.fields.add(new TextField({ name: 'tally_form_template' }))
      app.save(programs)
    }

    try {
      const records = app.findRecordsByFilter('programs', '', '', 500, 0)
      records.forEach((program) => {
        if (!program.get('tally_form_template') && program.get('tally_form_url')) {
          program.set('tally_form_template', program.get('tally_form_url'))
          app.save(program)
        }
      })
    } catch (_) {}
  },
  (app) => {
    // Kept intentionally to avoid losing program integration data.
  },
)
