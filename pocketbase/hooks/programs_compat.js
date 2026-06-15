onRecordCreateRequest((e) => {
  const tallyUrl = String(e.record.get('tally_form_url') || '')
  const tallyTemplate = String(e.record.get('tally_form_template') || '')

  if (tallyUrl && !tallyTemplate) e.record.set('tally_form_template', tallyUrl)
  if (tallyUrl.includes('{') || tallyUrl.includes('}')) e.record.set('tally_form_url', '')

  return e.next()
}, 'programs')

onRecordUpdateRequest((e) => {
  const tallyUrl = String(e.record.get('tally_form_url') || '')
  const tallyTemplate = String(e.record.get('tally_form_template') || '')

  if (tallyUrl && !tallyTemplate) e.record.set('tally_form_template', tallyUrl)
  if (tallyUrl.includes('{') || tallyUrl.includes('}')) e.record.set('tally_form_url', '')

  return e.next()
}, 'programs')
