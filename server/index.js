require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const logger = require('../lib/logger');
const path = require('path');
const fs = require('fs');
const serve = require('koa-static');
const views = require('koa-views');
const Koa = require('koa');
const Router = require('koa-router');
const passport = require('koa-passport');
const SteamStrategy = require('passport-steam').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const got = require('got');
const Ihl = require('../lib/ihl');
const Db = require('../lib/db');
const getSteamProfile = require('../lib/util/getSteamProfile');
const checkEnvironmentVariables = require('../lib/util/checkEnvironmentVariables');

const fsPromises = fs.promises;
const app = new Koa();
const router = new Router();

checkEnvironmentVariables([
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
    'STEAM_API_KEY',
    'CLIENT_ID',
    'CLIENT_SECRET',
    'CALLBACK_URL',
    'PORT',
    'STEAM_RETURN_URL',
    'STEAM_REALM',
]);

const { PORT, STEAM_RETURN_URL, STEAM_REALM, STEAM_API_KEY, CLIENT_ID, CLIENT_SECRET, CALLBACK_URL } = process.env;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Steam profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Use the SteamStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use('steam', new SteamStrategy({
        returnURL: STEAM_RETURN_URL,
        realm: STEAM_REALM,
        apiKey: STEAM_API_KEY,
        passReqToCallback: true
    },
    function(req, identifier, profile, done) {
        /*req.steam = {
            id: profile.id,
            name: profile.displayName,
            avatar: profile.avatarmedium,
        }*/
        profile.identifier = identifier;
        return done(null, profile);
    }
));

const scope = ['identify', 'connections'];

passport.use('discord', new DiscordStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        passReqToCallback: true,
        scope
    },
    async function (req, accessToken, refreshToken, profile, done) {
        profile.accessToken = accessToken;
        const steamId = profile.connections.filter(connection => connection.type === 'steam').map(connection => connection.id)[0];
        if (steamId) {
            steamProfile = await getSteamProfile(steamId);
            if (steamProfile) {
                profile.steam = {
                    id: steamProfile.steamid,
                    name: steamProfile.personaname,
                    avatar: steamProfile.avatarmedium,
                    profileUrl: steamProfile.profileurl,
                }
            }
        }
        return done(null, profile);
}));

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(ctx, next) {
    if (ctx.isAuthenticated()) { return next(); }
    ctx.redirect('/'+ ctx.session.guildId);
}

app.keys = ['newest secret key', 'older secret key'];

app.use(session(app));
app.use(passport.initialize());
app.use(passport.session());

app.use(views(path.join(__dirname, '/views'), { extension: 'ejs' }));

router.get('/account', ensureAuthenticated, async (ctx) => {
    await ctx.render('account', { user: ctx.state.user });
});

router.get('/logout', async (ctx) => {
    const guildId = ctx.session.guildId;
    ctx.logout();
    ctx.redirect('/' + guildId);
});

router.post('/register', ensureAuthenticated, async (ctx) => {
    const { guildId, steamId, discordId } = ctx.request.body;
    const user = await Ihl.registerUser(guildId, steamId, discordId);
    console.log('registered user', user ? user.id : null);
    ctx.redirect('/' + ctx.session.guildId);
});

/*router.get('/auth/steam',
    passport.authenticate('steam', { failureRedirect: '/' }),
    async (ctx) => {
        ctx.redirect('/');
    }
);

router.get('/auth/steam/return',
    passport.authenticate('steam', { failureRedirect: '/' }),
    async (ctx) => {
        ctx.redirect('/');
    }
);*/

router.get('/auth/discord',
    passport.authenticate('discord', { failureRedirect: '/', scope }),
    async (ctx) => {
        //ctx.redirect('/');
        logger.debug('authenticating...');
    }
);

router.get('/auth/discord/return',
    passport.authenticate('discord', { failureRedirect: '/' }),
    async (ctx) => {
        //console.log(ctx.state.user.connections);
        ctx.redirect('/' + ctx.session.guildId);
    }
);

router.get('/auth/steam',
    passport.authorize('steam', { failureRedirect: '/' })
);

router.get('/auth/steam/return',
    passport.authorize('steam', { failureRedirect: '/' }),
    async (ctx) => {
        const user = ctx.state.user;
        const account = ctx.state.account;
        // Associate the Twitter account with the logged-in user.
        account.discordId = user.id;
        user.steam = {
            id: account.id,
            name: account._json.personaname,
            avatar: account._json.avatarmedium,
            profileUrl: account._json.profileurl,
        };
        ctx.redirect('/' + ctx.session.guildId);
    }
);
  
router.get('/logs', ensureAuthenticated, async (ctx, next) => {
    const dir = 'logs'
    let files = await fsPromises.readdir(dir);
    files = files.map(fileName => ({
        name: fileName,
        time: fs.statSync(path.join(dir, fileName)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time)
    .filter(v => v.name.endsWith('.log'))
    .map(v => v.name);
    const fileName = path.join(dir, files[0]);
    let data = await fsPromises.readFile(fileName, 'utf8');
    data = data ? data.trim('\n').split('\n').map(v => JSON.parse(v)) : [];
    await ctx.render('log', { fileName, data });
});

router.get('/:guildId', async (ctx) => {
    ctx.session.guildId = ctx.params.guildId;
    let registered = false;
    if (ctx.state.user) {
        const user = await Db.findUserByDiscordId(ctx.params.guildId)(ctx.state.user.id);
        if (user) {
            const steamProfile = await getSteamProfile(user.steamid_64);
            ctx.state.user.steam = {
                id: steamProfile.steamid,
                name: steamProfile.personaname,
                avatar: steamProfile.avatarmedium,
                profileUrl: steamProfile.profileurl,
            }
            registered = true;
        }
    }
    await ctx.render('index', { user: ctx.state.user, guildId: ctx.params.guildId, registered });
});

router.get('/', async (ctx) => {
    if (ctx.session.guildId) {
        ctx.redirect('/' + ctx.session.guildId);
    }
    else {
        await ctx.render('index', { guildId: null });
    }
});

const server = app
    .use(serve(__dirname + '/static'))
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(PORT, () => {
        console.log(`Server listening on port: ${PORT}`);
    });

module.exports = server;