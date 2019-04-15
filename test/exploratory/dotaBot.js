const dotenv = require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const fs = require('fs');
const path = require('path');
const util = require('util');
const sinon = require('sinon');
const CONSTANTS = require('../../lib/constants');
const DotaBot = require('../../lib/dotaBot');
const TestHelper = require('../helper');

function traceMethodCalls(obj) {
    let proxy;
    let handler = {
        get(target, propKey, receiver) {
            const origMethod = target[propKey];
            if (propKey === 'then') {
                return async function (resolve, reject) {
                    let result = await resolve(target);
                    console.log('Promise: ' + propKey + util.inspect(args) + ' -> ' + util.inspect(result));
                    return result;
                }
            }
            else {
                return function (...args) {
                    let result = origMethod.apply(target, args);
                    console.log(propKey + util.inspect(args) + ' -> ' + util.inspect(result));
                    //console.log(propKey + JSON.stringify(args) + ' -> ' + JSON.stringify(result));
                    return result;
                };
            }
        }
    };
    proxy = new Proxy(obj, handler);
    return proxy;
}

const config = {
    steamid_64: '76561198810968998',
    account_name: 'rd2l1',
    persona_name: 'Inhouse Bot',
    password: 'redditdota2league',
    status: CONSTANTS.BOT_OFFLINE,
    lobby_count: 0,
}

const createDotaBot = (config) => {
    const steamClient = DotaBot.createSteamClient();
    const steamUser = DotaBot.createSteamUser(steamClient);
    const steamFriends = DotaBot.createSteamFriends(steamClient);
    const dotaClient = traceMethodCalls(DotaBot.createDotaClient(steamClient, true, true));
    return new DotaBot.DotaBot(steamClient, steamUser, steamFriends, dotaClient, config);
};

const dotaBot = DotaBot.createDotaBot(config);

function test() {
    sendSteamClientStub = sinon.stub(dotaBot.steamClient, 'send');
    connectSteamClientStub = sinon.stub(dotaBot.steamClient, 'connect').callsFake(function() {
//        console.log('stub emits CONNECTED');
        this._jobs = {};
        this._currentJobID = 0;
        this.sessionID = 0;
        dotaBot.steamClient._connection = new (require('steam/lib/connection'))();
        const data = fs.readFileSync(path.join(__dirname, `fixtures/1555502599723/568043818004381697-EMsg.ChannelEncryptResult`));
        console.log('data', data);
        dotaBot.steamClient._netMsgReceived(data);

        //dotaBot.steamClient.emit('connected');
    });
    launchDotaClientStub = sinon.stub(dotaBot.Dota2, 'launch').callsFake(function() {
        dotaBot.Dota2.emit('ready');
        const data = fs.readFileSync(path.join(__dirname, `fixtures/1555502599723/568043821334659075`));
        console.log('data', data);
        dotaBot.steamClient._netMsgReceived(data);
    });
    logOnToSteamStub = sinon.stub(dotaBot, 'logOnToSteam');
    logOnToSteamStub.resolves(true);
    
}
//test();

function fakeSteamClientConnect() {
    this.disconnect();

    this._jobs = {};
    this._currentJobID = 0;

    this.sessionID = 0;

    var server = { host: null, port: null };
    this.emit('debug', 'connecting to ' + server.host + ':' + server.port);

    this._connection = new (require('steam/lib/connection'))();
    this._connection.on('packet', this._netMsgReceived.bind(this));
    this._connection.on('close', this._disconnected.bind(this));

    var self = this;

    this._connection.on('error', function(err) {
    // it's ok, we'll reconnect after 'close'
    self.emit('debug', 'socket error: ' + err);
    });

    this._connection.on('connect', function() {
        self.emit('debug', 'connected');
        delete self._timeout;
    });

    this._connection.on('end', function() {
    self.emit('debug', 'socket ended');
    });

    this._connection.setTimeout(1000, function() {
    self.emit('debug', 'socket timed out');
    self._connection.destroy();
    });

    //this._connection.connect(server.port, server.host);
    //this._connection.emit('connect');
    let data = fs.readFileSync(path.join(__dirname, `fixtures/1555502599723/568043818004381697-EMsg.ChannelEncryptResult`));
    self._connection.emit('packet', data);
};
function test2() {
    dotaBot.steamClient.on('debug', console.log);
    connectSteamClientStub = sinon.stub(dotaBot.steamClient, 'connect').callsFake(fakeSteamClientConnect);
    connectSteamClientStub = sinon.stub(dotaBot.steamClient, 'send').callsFake(data => console.log('connection send', data));
}
//test2();

async function run(dotaBot) {
    await DotaBot.connectDotaBot(dotaBot);
    //console.log('run connected');
    
    await DotaBot.createDotaBotLobby({ lobby_name: 'lobby_name', password: 'password', leagueid: 10163, game_mode: 'DOTA_GAMEMODE_CM', first_pick: 1, radiant_faction: 1 })(dotaBot);
    await dotaBot.leaveLobbyChat();
    await dotaBot.leavePracticeLobby();
    await DotaBot.disconnectDotaBot(dotaBot);
    //console.log('createPracticeLobby');
    //
    console.log('run done');
    process.exit(0);
}
run(dotaBot);

function intercept(dotaBot) {
    const dir = path.join(__dirname, `fixtures/${Date.now()}`);
    fs.mkdirSync(dir);
    console.log(dir);
    dotaBot.steamClient._connection.on('packet', data => {
        const filename = TestHelper.randomSnowflake() + '-in';
        console.log('PACKET RECEIVED', filename);
        fs.writeFile(path.join(dir, filename), data, function (err) {
            if(err) {
                return console.log(err);
            }
        });
    });
    const origClientSend = dotaBot.steamClient.send;
    dotaBot.steamClient.send = function () {
        // copy arguments
        const args = [].slice.call(arguments, 0);
        const filename = TestHelper.randomSnowflake() + '-out.json';
        console.log('DATA SENT', filename, args);
        fs.writeFile(path.join(dir, filename), JSON.stringify(args), 'utf8', function (err) {
            if(err) {
                return console.log(err);
            }
        });
        return origClientSend.apply(this, args);
    };
    const origConnectionSend = dotaBot.steamClient._connection.send;
    dotaBot.steamClient._connection.send = function () {
        // copy arguments
        const args = [].slice.call(arguments, 0);
        const data = args[0];
        const filename = TestHelper.randomSnowflake() + '-out';
        console.log('BYTES SENT', filename);
        fs.writeFile(path.join(dir, filename), data, function (err) {
            if(err) {
                return console.log(err);
            }
        });
        return origConnectionSend.apply(this, args);
    };
    const origDota2Emit = dotaBot.Dota2.emit;
    dotaBot.Dota2.emit = function () {
        // copy arguments
        const args = [].slice.call(arguments, 0);
        const filename = TestHelper.randomSnowflake() + '-emit.json';
        console.log('DOTA2', ...args);
        fs.writeFile(path.join(dir, filename), JSON.stringify(args), function (err) {
            if(err) {
                return console.log(err);
            }
        });
        return origDota2Emit.apply(this, args);
    };
    const origDota2SendToGC = dotaBot.Dota2.sendToGC;
    dotaBot.Dota2.sendToGC = function () {
        // copy arguments
        const args = [].slice.call(arguments, 0);
        const filename = TestHelper.randomSnowflake() + '-sendToGC.json';
        console.log('SENDTOGC', ...args);
        fs.writeFile(path.join(dir, filename), JSON.stringify(args), function (err) {
            if(err) {
                return console.log(err);
            }
        });
        return origDota2SendToGC.apply(this, args);
    };
    dotaBot.steamClient._connection.on('connect', () => console.log('CONNECTED'));
    dotaBot.steamClient._connection.on('error', () => console.log('ERROR'));
    dotaBot.steamClient._connection.on('end', () => console.log('END'));
}
intercept(dotaBot);