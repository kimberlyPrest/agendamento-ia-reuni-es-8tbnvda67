migrate(
  (app) => {
    const programs = app.findCollectionByNameOrId('programs')

    // Keep the legacy API field compatible with cached bundles that still send
    // Tally URLs containing placeholders like {clients_email}.
    programs.fields.add(new TextField({ name: 'tally_form_url' }))

    try {
      programs.fields.getByName('tally_form_template')
    } catch (_) {
      programs.fields.add(new TextField({ name: 'tally_form_template' }))
    }

    app.save(programs)

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
    // Keep the text field on rollback to avoid breaking cached clients again.
  },
)
