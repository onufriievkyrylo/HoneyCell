const mongoose = require('mongoose'),
    validator = require('mongoose-validator');

const Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

let pageSchema = Schema({
    url: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String
    },
    components: [{
        component: {
            type: ObjectId,
            ref: 'components'
        },
        position: {
            type: String
        }
    }]
});

let Page = module.exports = mongoose.model('pages', pageSchema);