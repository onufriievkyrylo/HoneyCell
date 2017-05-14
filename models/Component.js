const mongoose = require('mongoose');

let componentSchema = mongoose.Schema({
    name: {
        type: String
    },
    type: {
        type: String
    },
    settings: {
        type: Object
    }
});

let Component = mongoose.model('components', componentSchema);



module.exports = Component;