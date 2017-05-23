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

router.post('/login', (req, res) => {
    User.login(req.body.username, req.body.password)
        .then(user => {
            if (user.role == 'admin') {
                req.session.cookie.path = '/admin';
                req.session.cookie.maxAge = 1 * 60 * 60 * 1000;
                req.session.admin = user.id;
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

//admin cheker
router.use((req, res, next) => {
    if(req.session.admin)
        User.findById(req.session.admin)
            .then(admin => {
                if (admin && admin.role == 'admin'){
                    res.locals.admin = admin;
                    res.locals.common = load.language(req.language, 'admin/common');
                    next();
                } else {
                    delete req.session.admin
                    res.render(`${req.theme}/admin/login`, load.language(req.language, 'admin/login'));
                }
            })
            .catch(err => next(err));
    else
        res.render(`${req.theme}/admin/login`, load.language(req.language, 'admin/login'));
})

router.get('/', (req, res, next) => {
    res.locals.title = 'title? AdMiN PaNeL';
    res.render(`${req.theme}/admin/panel`, {

    });
})

router.post('/logout', (req, res) => {
    delete req.session.admin;
    res.status(200).send();
})

router.route('/users')
.delete((req, res, next) => {
    User.remove({username: req.body.username})
        .then(user => res.status(200).send())
        .catch(err => next(err));
})
.all((req, res, next) => {
    console.log(req.query.search)
    req.query.length = parseInt(req.query.length)
    req.query.length = req.query.length > 0 ? req.query.length : 10
    req.query.page = parseInt(req.query.page) || 1
    User.count()
        .then(count => {
            req.pagetotal = Math.ceil(count / req.query.length);
            req.query.page = req.query.page > req.pagetotal ? 1 : req.query.page;
            return User.find()
                .sort(req.query.sort)
                .skip(req.query.length * (req.query.page - 1))
                .limit(req.query.length)
                .then(users => {
                    let localeDate = new Intl.DateTimeFormat(req.language, Object.assign(req.dateformat , req.timeformat));
                    req.users = users.reduce((acc, curr, i) => {
                        acc[i] = curr.toObject();
                        acc[i].created = localeDate.format(acc[i].created);
                        return acc;
                    }, []);
                    next();
                })
        })
        .catch(err => next(err));
})
.get((req, res) => {
    res.locals.list = load.language(req.language, 'admin/users/list');
    res.locals.title = res.locals.list.title;
    res.locals.table = {
        pagetotal: req.pagetotal,
        length: req.query.length,
        page: req.query.page,
        sort: {
            direction: req.query.sort && req.query.sort[0] == '-'? 'descending' : 'ascending',
            column: req.query.sort ? req.query.sort.replace(/^-/, '') : 'created'
        }
    }
    res.render(`${req.theme}/admin/users/list`, {
        userProperties: load.language(req.language, 'models/user/properties'),
        users: req.users
    })
})
.post((req, res) => {
    res.status(200).json({
        users: req.users,
        table: {
            pagetotal: req.pagetotal,
            length: req.query.length,
            page: req.query.page,
            sort: {
                direction: req.query.sort && req.query.sort[0] == '-'? 'descending' : 'ascending',
                column: req.query.sort ? req.query.sort.replace(/^-/, '') : 'created'
            }
        }
    });
})

router.get('/users/add', (req, res) => {
    res.locals.add = load.language(req.language, 'admin/users/add');
    res.locals.title = res.locals.add.title;
    res.render(`${req.theme}/admin/users/add`, {
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
    res.render(`${req.theme}/admin/users/edit`, {
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
            res.render(`${req.theme}/admin/settings/general`, {
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
            res.render(`${req.theme}/admin/settings/localization`, {
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
            res.render(`${req.theme}/admin/settings/localization`, {
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
            res.render(`${req.theme}/admin/pages/add`, {
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