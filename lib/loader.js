
module.exports.model = function (path) {
    return require(`${__base}/models/${path}`);
};
module.exports.language = function (language, path) {
    return require(`${__base}/languages/${language}/${path}.json`);
};
module.exports.lib = function (path) {
    return require(`${__base}/lib/${path}`);
};
module.exports.config = require(`${__base}/config.json`);

module.exports.base = function (path) {
    return require(`${__base}/${path}`);
};