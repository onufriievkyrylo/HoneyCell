const mongoose = require('mongoose'),
    uuid = require('uuid'),
    User = load.model('User');

const Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

let verificationTokenSchema = Schema({
    _id: {
        type: ObjectId,
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

verificationTokenSchema.methods.create = function () {
    this.set('token', uuid.v4());
    return this.save()
        .then(token => token.token)
};

verificationTokenSchema.methods.use = function () {
    return User.get(this.id)
        .then(user => {
            return user.verify()
                .then(user => {
                    this.remove();
                    return user;
                })
        })
};

let VerificationToken = mongoose.model('verificationTokens', verificationTokenSchema);

VerificationToken.get = function (token) {
    return this.findOne({token})
        .then(token => {
            if (token){
                return token
            }
            else
                throw new HttpError(404);
        })
}

module.exports = VerificationToken;