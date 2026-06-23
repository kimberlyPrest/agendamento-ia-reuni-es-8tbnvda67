migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('must_change_password')) {
      users.fields.add(new BoolField({ name: 'must_change_password' }))
      app.save(users)
    }

    try {
      const consultants = app.findRecordsByFilter('consultants', '', '', 1000, 0)
      consultants.forEach((consultant) => {
        let user = null
        try {
          if (consultant.get('user_id'))
            user = app.findRecordById('_pb_users_auth_', consultant.get('user_id'))
        } catch (_) {}
        if (!user && consultant.get('email')) {
          try {
            user = app.findAuthRecordByEmail('_pb_users_auth_', consultant.get('email'))
          } catch (_) {}
        }
        if (user && user.get('role') === 'consultant') {
          user.set('must_change_password', true)
          app.save(user)
        }
      })
    } catch (_) {}
  },
  (app) => {
    // Keep the field on rollback so already created users keep their onboarding state.
  },
)
