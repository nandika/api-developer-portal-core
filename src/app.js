const express = require('express');
const { engine } = require('express-handlebars');
const passport = require('passport');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const authRoute = require('./routes/authRoute');
const devportalRoute = require('./routes/devportalRoute');
const orgContent = require('./routes/orgContentRoute');
const apiContent = require('./routes/apiContentRoute');
const customContent = require('./routes/customPageRoute');
const designRoute = require('./routes/designModeRoute');
const config = require('./config/config');
const { copyStyelSheet, copyStyelSheetMulti } = require('./utils/util');
const registerPartials = require('./middlewares/registerPartials');
const Handlebars = require('handlebars');
const constants = require('./utils/constants');

const app = express();
const secret = crypto.randomBytes(64).toString('hex');
const filePrefix = constants.FILE_PREFIX_APP;

app.engine('.hbs', engine({
    extname: '.hbs'
}));

app.set('view engine', 'hbs');

Handlebars.registerHelper('eq', function (a, b) {
    return (a === b);
});

Handlebars.registerHelper('in', function (value, options) {
    const validValues = options.hash.values.split(',');
    return validValues.includes(value) ? options.fn(this) : options.inverse(this);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Serialize user into the session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
    done(null, user);
});

console.log("Server started at port: " + path.join(__dirname, filePrefix + 'styles'));

app.use(constants.ROUTE.STYLES, express.static(path.join(__dirname, filePrefix + 'styles')));

if (config.mode === constants.DEV_MODE) {
    //register images and stylesheet folders for single tenante scenario
    app.use(constants.ROUTE.IMAGES, express.static(path.join(__dirname, filePrefix + 'images')));
    copyStyelSheet();
} else {
    copyStyelSheetMulti();
}

//backend routes
app.use(constants.ROUTE.DEV_PORTAL, devportalRoute);

if (config.mode === constants.DEV_MODE) {
    app.use(constants.ROUTE.MOCK, express.static(path.join(__dirname, filePrefix + 'mock')));
    app.use(constants.ROUTE.DEFAULT, registerPartials);
    app.use(constants.ROUTE.DEFAULT, designRoute);
} else {
    app.use(constants.ROUTE.DEFAULT, authRoute);
    app.use(constants.ROUTE.DEFAULT, apiContent);
    app.use(constants.ROUTE.DEFAULT, orgContent);
    app.use(constants.ROUTE.DEFAULT, customContent);
}

app.listen(config.port);
