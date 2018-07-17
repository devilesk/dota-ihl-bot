const express = require('express');
const session = require('express-session');
const passport = require('passport');
const Strategy = require('passport-discord').Strategy;

const app = express();
const SteamID = require('steamid');
const dotenv = require('dotenv').config();
const { registerUser } = require('./lib/ihl');
const logger = require('./lib/logger');

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

const scopes = ['identify', 'connections'];

const checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.send('not logged in :(');
    return null;
};

passport.use(new Strategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: scopes,
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
app.get('/', passport.authenticate('discord', {
    scope: scopes,
    state: '422549177151782925',
}), () => {
    logger.debug('authenticating');
});
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    logger.debug('auth success');
    const discord_id = req.user.id;
    logger.debug(`discord_id ${discord_id}`);
    const guild_id = req.query.state;
    logger.debug(`guild_id ${guild_id}`);
    const steamConnection = req.user.connections.find(connection => connection.type === 'steam');
    if (steamConnection) {
        const sid = new SteamID(steamConnection.id);
        sid.instance = SteamID.Instance.DESKTOP; // 1
        const steamid_64 = sid.getSteamID64();
        logger.debug(`steamid_64 ${steamid_64}`);
        registerUser(guild_id, steamid_64, discord_id)
            .then(() => res.redirect('/info'))
            .catch(console.error);
    }
    else {
        logger.debug('No steam');
        res.redirect('/error');
    }
});
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});
app.get('/info', checkAuth, (req, res) => {
    // console.log(req.user)
    res.json(req.user);
});

app.listen(3000, '0.0.0.0', (err) => {
    if (err) {
        logger.debug(err);
        return err;
    }
    logger.debug('Listening');
    return null;
});
