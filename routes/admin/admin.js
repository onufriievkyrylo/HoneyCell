const express = require('express'),
    router = express.Router(),
    Utils = load.lib('Utils'),
    User = load.model('User'),
    Settings = load.model('Settings'),
    Component = load.model('Component'),
    Page = load.model('Page');

//let languagePath = `${__dirname}/admin/modules`;
//let modules = fs.readdirSync(languagePath)
//    .filter(file => fs.statSync(`${languagePath}/${file}`).isFile());

//for(let module of modules)
//    router.use('/', require(`${languagePath}/${module}`));

//admin cheker

router.use((req, res, next) => {
    if (req.path == '/login')
        next();
    else if(req.session.admin)
        User.findById(req.session.admin)
            .then(admin => {
                if (admin && admin.role == 'admin'){
                    req.admin = admin;
                    next();
                } else {
                    delete req.session.admin
                    res.redirect('/admin/login');
                }
            })
            .catch(err => next(err));
    else
        res.redirect('/admin/login');
})

//settings loader
router.use((req, res, next) => {
    Settings.get('general localization theme')
        .then(settings => {
            req.title = settings.general.title;
            req.language = settings.localization.languages.admin;
            req.theme = settings.theme;
            req.dateformat = settings.localization.format ? settings.localization.format.date || {} : {};
            req.timeformat = settings.localization.format ? settings.localization.format.time || {} : {};
            next();
        })
        .catch(err => next(err));
})

router.route('/login')
.all((req, res, next) => {
    if (req.session.admin)
        res.redirect('/admin');
    else
        next();
})
.get((req, res) => {
    res.render(`${req.theme}/admin/templates/login`, load.language(req.language, 'admin/login'));
})
.post((req, res) => {
    User.login(req.body.username, req.body.password)
        .then(user => {
            if (user.role == 'admin') {
                req.session.cookie.path = '/admin';
                req.session.cookie.maxAge = 1 * 60 * 60 * 1000;
                req.session.admin = user._id;
                res.status(200).send();
            } else
                res.status(401).send();
        })
        .catch(err => {
            if(err.code == 401)
                res.status(err.code).send(load.language(req.language, 'admin/login').unauthorized)
            else
                next(err);
        });
})

router.get('/', (req, res, next) => {
    res.locals.panel = load.language(req.language, 'admin/panel');
    res.locals.title = res.locals.panel.title;
    res.render(`${req.theme}/admin/templates/panel`, {
        admin: req.admin
    });
})

router.post('/logout', (req, res) => {
    delete req.session.admin;
    res.status(200).send();
})

router.get('/users', (req, res, next) => {
    User.find()
        .then(users => {
            let localeDate = new Intl.DateTimeFormat(req.language, Object.assign(req.dateformat , req.timeformat));
            users = users.reduce((acc, curr, i) => {
                acc[i] = curr.toObject();
                acc[i].created = localeDate.format(acc[i].created);
                return acc;
            }, []);
            res.locals.list = load.language(req.language, 'admin/users/list');
            res.locals.title = res.locals.list.title;
            res.render(`${req.theme}/admin/templates/users/list`, {
                userProperties: load.language(req.language, 'models/user/properties'),
                users
            })
        })
        .catch(err => next(err));
})

router.delete('/users', (req, res) => {
    User.remove({username: req.body.username})
        .then(user => res.status(200).send())
        .catch(err => {
            console.log(err);
            res.status(err.code || 500).send();
        });
})

router.get('/users/add', (req, res) => {
    res.locals.add = load.language(req.language, 'admin/users/add');
    res.locals.title = res.locals.add.title;
    res.render(`${req.theme}/admin/templates/users/add`, {
        userProperties: load.language(req.language, 'models/user/properties')
    });
})

router.post('/users/add', (req, res) => {
    let newUser = new User(req.body);
    newUser.verified = true;
    newUser.save()
        .then(user => res.status(200).send())
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

router.route('/users/edit/:username')
.all((req, res, next) => {
    User.get({username: new RegExp(`^${req.params.username}$`, 'i')})
        .then(user => {
            req.user = user;
            next();
        })
        .catch(err => next(err));
})
.get((req, res) => {
    res.locals.edit = load.language(req.language, 'admin/users/edit');
    res.locals.title = res.locals.edit.title;
    res.render(`${req.theme}/admin/templates/users/edit`, {
        userProperties: load.language(req.language, 'models/user/properties'),
        user: req.user
    });
})
.put((req, res) => {
    req.user.update(req.body)
        .then(user => res.status(200).send())
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

router.get('/settings-general', (req, res, next) => {
    Settings.get()
        .then(settings => {
            res.locals.general = load.language(req.language, 'admin/settings/general');
            res.locals.title = res.locals.general.title;
            res.render(`${req.theme}/admin/templates/settings/general`, {
                settingsProperties: load.language(req.language, 'models/settings/properties'),
                settings: settings.general
            });
        })
        .catch(err => next(err));
})

router.get('/settings-localization', (req, res, next) => {
    Settings.get('localization', {getters: true})
        .then(settings => {
            res.locals.localization = load.language(req.language, 'admin/settings/localization');
            res.locals.title = res.locals.localization.title;
            res.locals.dateformat = req.dateformat;
            res.locals.timeformat = req.timeformat;
            res.locals.locale = req.language;
            settings.localization.languages.all = Utils.languages;
            res.render(`${req.theme}/admin/templates/settings/localization`, {
                settingsProperties: load.language(req.language, 'models/settings/properties'),
                settings: settings.localization
            });
        })
        .catch(err => next(err));
})

router.put('/settings', (req, res, next) => {
    //console.log(req.body);
    Settings.update(req.body)
        .then(settings => {
            res.locals.localization = load.language(req.language, 'admin/settings/localization');
            res.locals.title = res.locals.localization.title;
            settings.localization.languages.all = Utils.languages;
            res.locals.dateformat = req.dateformat;
            res.locals.timeformat = req.timeformat;
            res.locals.locale = req.language;
            res.render(`${req.theme}/admin/templates/settings/localization`, {
                settingsProperties: load.language(req.language, 'models/settings/properties'),
                settings: settings.localization
            });
        })
        .catch(err => next(err));
})

router.get('/components', (req, res, next) => {
    
})

router.route('/components/create')
.get((req, res, next) => {
    
})
.post((req, res, next) => {
    
})

router.route('/components/edit/:component')
.all((req, res, next) => {
    
})
.get((req, res) => {
    
})
.post((req, res, next) => {
    
})

router.get('/pages', (req, res, next) => {

})

router.route('/pages/add')
.get((req, res, next) => {
    Component.find()
        .then(components => {
            res.locals.add = load.language(req.language, 'admin/pages/add');
            res.locals.title = res.locals.add.title;
            res.render(`${req.theme}/admin/templates/pages/add`, {
                components,
                pageProperties: load.language(req.language, 'models/pages/properties')
            })
        })
        .catch(err => next(err))
})
.post((req, res, next) => {
    console.log(req.body);
    let page = new Page({url: req.body.url, title: req.body.title});
    console.log(page.components);
    for(let component of req.body['components.component'])
        page.components.push({component});
    page.save().then(page => console.log(page));
    res.status(200).send();
})

router.route('/pages/edit/:page')
.all((res, req, next) => {

})
.get((req, res, next) => {

})
.put((req, res, next) => {
    
})

module.exports = router;