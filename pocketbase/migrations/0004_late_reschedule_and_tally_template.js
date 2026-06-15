migrate(
  (app) => {
    const programs = app.findCollectionByNameOrId('programs')
    const addField = (name, field) => {
      try {
        programs.fields.getByName(name)
      } catch (_) {
        programs.fields.add(field)
      }
    }

    addField('tally_form_template', new TextField({ name: 'tally_form_template' }))
    addField('late_reschedule_delay_days', new NumberField({ name: 'late_reschedule_delay_days' }))
    app.save(programs)

    try {
      const records = app.findRecordsByFilter('programs', '', '', 500, 0)
      records.forEach((program) => {
        if (!program.get('late_reschedule_delay_days')) program.set('late_reschedule_delay_days', 7)
        if (!program.get('tally_form_template') && program.get('tally_form_url')) {
          program.set('tally_form_template', program.get('tally_form_url'))
        }
        app.save(program)
      })
    } catch (_) {}
  },
  (app) => {
    // Kept intentionally to avoid losing program rule data.
  },
)
