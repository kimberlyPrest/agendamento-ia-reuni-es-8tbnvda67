const prepareProgramTemplateFields = (record) => {
  const tallyUrl = String(record.get('tally_form_url') || '')
  const tallyTemplate = String(record.get('tally_form_template') || '')
  const titleTemplate = String(record.get('title_template') || '')

  if (!titleTemplate.trim())
    record.set('title_template', 'Consultoria {program_name} - {client_name}')
  if (tallyUrl && !tallyTemplate) record.set('tally_form_template', tallyUrl)
  if (tallyUrl.includes('{') || tallyUrl.includes('}')) record.set('tally_form_url', '')
}

onRecordCreateRequest((e) => {
  prepareProgramTemplateFields(e.record)
  return e.next()
}, 'programs')

onRecordUpdateRequest((e) => {
  prepareProgramTemplateFields(e.record)
  return e.next()
}, 'programs')
