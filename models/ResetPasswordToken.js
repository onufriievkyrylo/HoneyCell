const mongoose = require('mongoose'),
    uuid = require('uuid'),
    uniqueValidator = require('mongoose-unique-validator'),
    User = load.model('User');

const Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

let resetPasswordTokenSchema = Schema({
    _id: {
        type: ObjectId,
        unique: true,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    active: {
        type: Date,
        required: true,
        default: Date.now,
        expires: '15m'
    }
});

resetPasswordTokenSchema.methods.create = function () {
    this.set('token', uuid.v4());
    return this.save()
        .then(token => token.token)
}

resetPasswordTokenSchema.methods.use = function (password) {
    return User.get(this.id)
        .then(user => {
            return user.resetPassword(password)
                .then(user => {
                    this.remove();
                    return user;
                })
        })
}

resetPasswordTokenSchema.plugin(uniqueValidator);

let ResetPasswordToken = mongoose.model('resetpasswordtokens', resetPasswordTokenSchema);

ResetPasswordToken.get = function(token) {
    return this.findOne({token})
        .then(token => {
            if(token)
                return token
            else
                throw new HttpError(404);
        })
}

module.exports = ResetPasswordToken;