/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('programs')

    if (!collection.fields.getByName('tally_form_template')) {
      collection.fields.add(new URLField({ name: 'tally_form_template' }))
    }
    if (!collection.fields.getByName('require_tally')) {
      collection.fields.add(new BoolField({ name: 'require_tally' }))
    }
    if (!collection.fields.getByName('max_future_meetings')) {
      collection.fields.add(new NumberField({ name: 'max_future_meetings' }))
    }
    if (!collection.fields.getByName('min_interval_unit')) {
      collection.fields.add(new TextField({ name: 'min_interval_unit' }))
    }
    if (!collection.fields.getByName('min_reschedule_hours')) {
      collection.fields.add(new NumberField({ name: 'min_reschedule_hours' }))
    }
    if (!collection.fields.getByName('late_reschedule_delay_days')) {
      collection.fields.add(new NumberField({ name: 'late_reschedule_delay_days' }))
    }
    if (!collection.fields.getByName('booking_window_days')) {
      collection.fields.add(new NumberField({ name: 'booking_window_days' }))
    }
    if (!collection.fields.getByName('buffer_before_minutes')) {
      collection.fields.add(new NumberField({ name: 'buffer_before_minutes' }))
    }
    if (!collection.fields.getByName('buffer_after_minutes')) {
      collection.fields.add(new NumberField({ name: 'buffer_after_minutes' }))
    }
    if (!collection.fields.getByName('confirmation_message')) {
      collection.fields.add(new TextField({ name: 'confirmation_message' }))
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('programs')

    const fieldsToRemove = [
      'tally_form_template',
      'require_tally',
      'max_future_meetings',
      'min_interval_unit',
      'min_reschedule_hours',
      'late_reschedule_delay_days',
      'booking_window_days',
      'buffer_before_minutes',
      'buffer_after_minutes',
      'confirmation_message',
    ]

    for (const fieldName of fieldsToRemove) {
      const field = collection.fields.getByName(fieldName)
      if (field) {
        collection.fields.removeById(field.id)
      }
    }

    app.save(collection)
  },
)
