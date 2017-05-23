const mongoose = require('mongoose'),
    validator = require('validator'),
    uniqueValidator = require('mongoose-unique-validator'),
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

let userSchema = mongoose.Schema({
    firstname: {
        type: String,
        validate: {
            validator: value => !value || /^[^!-@\[-`{-¿\s]+$/.test(value),
            type: 'alpha'
        }
    },
    lastname: {
        type: String,
        validate: {
            validator: value => !value || /^[^!-@\[-`{-¿\s]+$/.test(value),
            type: 'alpha'
        }
    },
    email: {
        type: String,
        lowercase: true,
        required: true,
        unique: true,
        validate: {
            validator: value => validator.isEmail(value),
            type: 'email'
        }
    },
    username: {
        type: String,
        required: true,
        unique: true,
        uniqueCaseInsensitive: true,
        validate: {
            validator: value => /^[\w.]+$/.test(value),
            type: 'latin'
        }
    },
    password: {
        type: String,
        minlength: 6,
        select: false,
        required: true,
        validate: {
            validator: value => /^(?=.*\d)(?=.*[a-z]).*$/i.test(value),
            type: 'security'
        }
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    created: {
        type: Date,
        default: Date.now
    },
    verified: {
        type: Boolean,
        default: false
    }
});

userSchema.pre('save', function (next) {
    let user = this;
    if (!user.isModified('password'))
        return next();
    bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
        if (err)
            return next(err);
        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err)
                return next(err);
            user.password = hash;
            next();
        });
    });
})

userSchema.methods.update = function (updatement) {
    for (let key in updatement)
        this[key] = updatement[key];
    return this.save()
}

userSchema.methods.resetPassword = function (password) {
    this.password = password;
    return this.save();
}

userSchema.methods.verify = function () {
    this.verified = true;
    return this.save();
}

userSchema.plugin(uniqueValidator);

let User = mongoose.model('users', userSchema);

User.login = function (username, password) {
    return this.findOne({username})
        .select('+password')
        .then(user => {
            if (!user)
                throw new HttpError(401);
            else
                return bcrypt.compare(password, user.password)
                    .then(match => {
                        if(match)
                            return user
                        else 
                            throw new HttpError(401);
                    })
        })
}

User.remove = function (selector) {
    return this.findOneAndRemove(selector)
        .then(user => {
            if (user) 
                return user;
            else
                throw new HttpError(404);
        })
}

User.update = function (selector, updatement) {
    return this.findOne(selector)
        .then(user => {
            if (user) {
                for (let key in updatement)
                    user[key] = updatement[key];
                return user.save()
            } else 
                throw new HttpError(404);
        })
}

User.get = function (selector) {
    let method = selector instanceof Object ? 'findOne' : 'findById';
    return User[method](selector)
        .then(users => {
            if (users)
                return users
            else
                throw new HttpError(404);
        })
}

module.exports = User;