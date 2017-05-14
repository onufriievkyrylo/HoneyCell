global.__base = __dirname;
global.load = require('./lib/loader');

const express = require('express'),
    config = load.config;
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    session = require('express-session'),
    HttpError = load.lib('HttpError'),
    MongoStore = require('connect-mongo')(session);

//mongoose settings
mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://${config.mongodb.uri}/${config.mongodb.db}`)
    .catch(err => console.error(err.message));

//routes
const client = require('./routes/client/client');
const admin = require('./routes/admin/admin');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
    src: path.join(__dirname, 'views'),
    dest: path.join(__dirname, 'views'),
    indentedSyntax: true,
    sourceMap: false
}));

app.use(express.static(path.join(__dirname, 'views')));
app.use(session ({
    secret: config.session.secret,
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        stringify: false
     }),
     cookie: {
         maxAge: config.session.maxAge
     },
    resave: false,
    saveUninitialized: true
}));

app.use('/admin', admin);
//admin 404 error
admin.use((req, res, next) => {
    let err = new HttpError(404, 'Not Found');
    next(err);
});
app.use('/', client);
//client 404 error
client.use(function (req, res, next) {
    let err = new HttpError(404, 'Not Found');
    next(err);
});

//error handler
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.code = err.code || 500;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    if(err.code != 404)
        console.log(err);
    res.status(res.locals.code);
    res.render(`${req.theme}/error`);
});

module.exports = app;
