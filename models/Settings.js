const mongoose = require('mongoose'),
    //validator = require('mongoose-validator'),
    Utils = load.lib('Utils');

let languages = Utils.languageCodes;

let settingsSchema = mongoose.Schema({
    general: {
        title: {
            type: String,
            default: 'Site Title',
            required: true
        },
        description: {
            type: String,
        },
        keywords: {
            type: [String]
        }
    },
    localization: {
        languages: {
            available: {
                validate: {
                    validator: function(value) {
                        return value.includes(this.localization.languages.admin.value) && value.includes(this.localization.languages.client.value);
                    },
                    reason: 'mainlanguage'
                },
                type: [String],
                enum: languages,
                default: 'uk',
                required: true
            },
            client: {
                type: String,
                enum: languages,
                default: 'uk',
                required: true
            },
            admin: {
                type: String,
                enum: languages,
                default: 'uk',
                required: true
            }
        },
        format: {
            date: {
                year: {
                    type: String,
                    enum: ['numeric', '2-digit'],
                },
                month: {
                    type: String,
                    enum: ['numeric', '2-digit', 'narrow', 'short', 'long'],
                },
                day: {
                    type: String,
                    enum: ['numeric', '2-digit'],
                },
                weekday:{
                    type: String,
                    enum: ['narrow', 'short', 'long']
                }
            },
            time: {
                hour: {
                    type: String,
                    enum: ['numeric', '2-digit'],
                },
                minute: {
                    type: String,
                    enum: ['numeric', '2-digit'],
                },
                second: {
                    type: String,
                    enum: ['numeric', '2-digit']
                },
                timeZoneName: {
                    type: String,
                    enum: ['short', 'long']
                }
            }
        },
    },
    theme: {
        type: String,
        default: 'default',
        required: true
    }
});



settingsSchema.eachPath((path, type) => {
    if(type.options.enum){
        settingsSchema.path(path).get((value, type) => {
            return {value, enum: type.options.enum};
        })
    }
})

let Settings = module.exports = mongoose.model('settings', settingsSchema);

Settings.update = function (updatement) {
    return Settings.findOne()
        .then(settings => {
            if (settings) {
                for (let path in updatement){
                    if (Settings.schema.pathType(path) === 'adhocOrUndefined')
                        throw new HttpError(400);
                    else
                        if(updatement[path])
                            settings.set(path, updatement[path]);
                        else
                            settings.set(path, undefined);
                }
                return settings.save()
                    .then(settings => settings.toObject({getters: true}))
            } else {
                throw new HttpError(404);
            }
        })
};

module.exports.get = function (properties, options) {
    return Settings.findOne()
        .select(properties)
        .then(settings => {
            if(settings)
                return settings.toObject(options);
            else
                return new Settings().save()
                    .then(settings => settings.toObject(options));
        })
};