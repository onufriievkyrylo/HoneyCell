const pug = require('pug'),
    User = load.model('User');

module.exports = (request) => {
    return User.findById(request.session.user)
        .then(user => {
            return pug.renderFile(`${__base}/views/${request.theme}/client/components/profile.pug`, {
                user,
                profile: require(`${__base}/languages/${request.language}/client/components/profile.json`)
            })
        })
}