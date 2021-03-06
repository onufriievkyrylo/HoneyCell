const fs = require('fs');

class Utils {
  static validation(errors, messages) {
    let validation = {};
    for (let key in errors) {
      validation[errors[key].path] = {
        value: errors[key].value,
        message: messages[key][errors[key].kind]
      };
    }
    return validation;
  }

  static getLanguageNames(codes) {
    let languagePath = `${__base}/languages`,
      languages = {};
    codes.forEach(languageCode => {
      let language = `${languagePath}/${languageCode}/common.json`;
      if (fs.existsSync(language))
        languages[languageCode] = require(language).name;
    });
    return languages;
  }

  static get languageCodes() {
    let languagePath = `${__base}/languages`;
    return fs.readdirSync(languagePath)
      .filter(file => fs.statSync(`${languagePath}/${file}`).isDirectory());
  }

  static get languages() {
    let languagePath = `${__base}/languages`,
      languages = {};
    fs.readdirSync(languagePath)
      .filter(file => fs.statSync(`${languagePath}/${file}`).isDirectory())
      .forEach(languageCode => {
        let language = `${languagePath}/${languageCode}/common.json`;
        if (fs.existsSync(language))
          languages[languageCode] = require(language).name;
      });
    return languages;
  }
}

module.exports = Utils;