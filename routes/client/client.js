const express = require('express'),
    router = express.Router(),
    Utils = load.lib('Utils'),
    Mailer = load.lib('Mailer'),
    User = load.model('User'),
    Settings = load.model('Settings'),
    Page = load.model('Page'),
    Component = load.model('Component'),
    VerificationToken = load.model('VerificationToken'),
    ResetPasswordToken = load.model('ResetPasswordToken');

router.use((req, res, next) => {
    Settings.get('general localization theme')
        .then(settings => {
            req.title = settings.general.title;
            req.language = req.cookies.language && settings.localization.languages.available.includes(req.cookies.language) ? req.cookies.language : settings.localization.languages.client;
            req.theme = settings.theme;
            req.format = settings.localization.format;
            next();
        })
        .catch(err => next(err));
})

router.use(async (req, res, next) => {
    if (req.method === 'GET') {
        let page = await Page.findOne({url: req.path})
            .populate('components.component');
        if (page) {
            req.components = [];
            for (let component of page.components) {
                req.components.push({
                    position: component.position,
                    code: await require(`${__base}/routes/client/components/${component.component.name}`)(req)
                });
            }
        }
    }
    next();
})

router.get('/', (req, res) => {
    res.render(`${req.theme}/client/templates/index`, {
        title: req.title,
        pageLanguage: req.language,
        availableLanguages: ['uk', 'pl'],
        common: load.language(req.language, 'common'),
        components: req.components
    });
})

router.get('/registration', (req, res) => {
    res.locals.registration = load.language(req.language, 'client/users/registration');
    res.locals.title = res.locals.registration.title;
    res.render(`${req.theme}/client/templates/users/registration`, {
        common: load.language(req.language, 'common'),
        userProperties: load.language(req.language, 'models/user/properties'),
        components: req.components
    });
})

router.post('/registration', (req, res) => {
    let newUser = new User(req.body);
    newUser.save()
        .then(user => {
            let newVerificationToken = new VerificationToken({_id: user.id});
            newVerificationToken.create()
                .then(token => {
                    let email = new Mailer();
                    email.send({
                            to: user.email,
                            subject: 'verify your email',
                            text: `Click ${req.protocol}://${req.get('host')}/verify/${token}`
                        })
                        .catch(err => console.log(err));
                })
                .catch(err => {
                    console.log(err);
                    res.status(500).send();
                });
            res.status(200).send()
        })
        .catch(err => {
            if (err.name == 'ValidationError') {
                let errors = Utils.validation(
                    err.errors,
                    load.language(req.language, 'models/user/errors'));
                res.status(400).json(errors);
            } else {
                console.log(err);
                res.status(500).send();
            }
        });
})

router.get('/verify/:token', (req, res, next) => {
    VerificationToken.get(req.params.token)
        .then(token => {
            return token.use()
                .then(user => {
                    res.redirect('/');
                })
        })
        .catch(err => next(err));
})

router.get('/reset-password', (req, res) => {
    res.render(`${req.theme}/client/templates/users/reset-password`, load.language(req.language, 'client/users/reset-password'))
})

router.post('/reset-password', (req, res) => {
    User.get({email: req.body.email})
        .then(user => {
            let newResetPasswordToken = new ResetPasswordToken({_id: user.id});
            return newResetPasswordToken.create()
                .then(token => {
                    let email = new Mailer();
                    email.send({
                        to: user.email,
                        subject: 'reset your password',
                        text: `Click ${req.protocol}://${req.get('host')}/reset-password/${token}`
                    })
                    .catch(err => console.log(err));
                    res.status(200).send();
                })
        })
        .catch(err => res.status(err.code || 500).send())
})

router.route('/reset-password/:token')
.all((req, res, next) => {
    ResetPasswordToken.get(req.params.token)
        .then(token => {
            req.token = token;
            next()
        })
        .catch(err => next(err));
})
.get((req, res) => {
    res.render(`${req.theme}/client/templates/users/set-new-password`, load.language(req.language, 'client/users/set-new-password'))
})
.put((req, res) => {
    req.token.use(req.body.newpassword)
        .then(user => res.status(200).send())
        .catch(err => {
            res.status(err.code || 500).send();
        })
})

router.post('/login', (req, res) => {
    User.login(req.body.username, req.body.password)
        .then(user => {
            console.log(req.body);
            if (req.body.rememberme)//168
                req.session.cookie.maxAge = 168 * 60 * 60 * 1000;
            else 
                req.session.cookie.maxAge = 2 * 60 * 60 * 1000;
            req.session.user = user.id;
            res.status(200).send();
        })
        .catch(err => {
            console.log(err);
            res.status(err.code || 500).send()
        });
})

router.post('/logout', (req, res) => {
    delete req.session.user;
    res.status(200).send();
})

router.param('username', (req, res, next, username) => {
    User.get({username: new RegExp(`^${username}$`, 'i')})
        .then(user => {
            req.user = user;
            next();
        })
        .catch(err => next(err));
})

router.get('/profile/:username', (req, res) => {
    let lacaleDate = new Intl.DateTimeFormat(req.language, Object.assign(req.format.date, req.format.time)),
        user = req.user.toObject();
    user.created = lacaleDate.format(user.created);
    res.locals.profile = load.language(req.language, 'client/users/profile');
    res.locals.title = `${res.locals.profile.title} ${user.username}`; 
    res.render(`${req.theme}/client/templates/users/profile`, {
        user,
        owner: req.session.user === req.user.id,
        userProperties: load.language(req.language, 'models/user/properties'),
    });
})

router.get('/profile/:username/edit', (req, res, next) => {
    res.locals.edit = load.language(req.language, 'client/users/profile-edit');
    res.locals.title = res.locals.edit.title;
    if (req.user.id === req.session.user) {
        res.render(`${req.theme}/client/templates/users/profile-edit`, {
            userProperties: load.language(req.language, 'models/user/properties'),
            user: req.user
        });
    } else
        next(new HttpError(403));
})

router.put('/profile/:username/edit', (req, res) => {
    if (req.user.id == req.session.user) {
        delete req.body.role;
        req.user.update(req.body)
            .then(user => res.status(200).json({username: user.username}))
            .catch(err => {
                if (err.name == 'ValidationError') {
                    let errors = Utils.validation(
                        err.errors,
                        load.language(req.language, 'models/user/errors'));
                    res.status(400).json(errors);
                } else {
                    console.log(err);
                    res.status(500).send();
                }
            });
    } else
        res.status(403).send();
})

module.exports = router;