const pug = require('pug'),
    Utils = load.lib('Utils')
    Settings = load.model('Settings');

module.exports = (request) => {
    return Settings.get('localization.languages')
        .then(settings => {
            return pug.renderFile(`${__base}/views/${request.theme}/client/templates/components/language.pug`, {
                main: request.language,
                available: Utils.getLanguageNames(settings.localization.languages.available)
            })
        })
}