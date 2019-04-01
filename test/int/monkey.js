const Collection = require('discord.js/src/util/Collection');
const Argument = require('discord.js-commando/src/commands/argument');
Argument.validateInfo = function () {};
const Command = require('discord.js-commando/src/commands/base');
Command.validateInfo = function () {};
const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const SequelizeMocking = require('sequelize-mocking').SequelizeMocking;
const EventEmitter = require('events').EventEmitter;
const hri = require('human-readable-ids').hri;
const db = require('../../models');
const {
    MockDotaBot,
    MockMember,
    MockChannel,
    MockRole,
    MockMessage,
    MockGuild,
    MockClient,
} = require('../../lib/mocks');
const {
    IHLManager,
} = proxyquire('../../lib/ihlManager', {
    './dotaBot': {
        createDotaBot: config => new MockDotaBot(config),
    },
    './matchTracker': {
        createMatchEndMessageEmbed: async match_id => {},
    },
});
const {
    getLobby,
} = require('../../lib/lobby');
const {
    findOrCreateBot,
    findLeague,
    findOrCreateUser,
} = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');
const dotenv = require('dotenv').config({ path: path.join(__dirname, './.env') });
console.log(path.join(__dirname, './.env'));


const getRandomInt = require('../../lib/util/getRandomInt');

const client = new MockClient();
client.initRandomGuilds(1, 2, 5, 3, 20);
const LeagueCreateCommand = require('../../commands/admin/league-create');
const QueueJoinCommand = require('../../commands/queue/queue-join');
const QueueReadyCommand = require('../../commands/queue/queue-ready');
const QueueLeaveCommand = require('../../commands/queue/queue-leave');
const QueueStatusCommand = require('../../commands/queue/queue-status');

let ihlManager;
let lobby_channel;
const leagueCreateCommand = new LeagueCreateCommand(client);
const queueJoinCommand = new QueueJoinCommand(client);
const queueReadyCommand = new QueueReadyCommand(client);
const queueLeaveCommand = new QueueLeaveCommand(client);
const queueStatusCommand = new QueueStatusCommand(client);
const commands = new Collection([
    [1, leagueCreateCommand],
    [2, queueJoinCommand],
    [3, queueReadyCommand],
    [4, queueLeaveCommand],
    [5, queueStatusCommand],
]);

const joinLobby = async () => {
    const guild = client.guilds.first();
    lobby_channel = guild.channels.find(channel => channel.name === 'autobalanced-queue');
    let c = 0;
    for (const member of guild.members.array()) {
        if (c === 20) break;
        const msg = new MockMessage(guild, lobby_channel, member);
        queueJoinCommand.run(msg, {});
        c++;
    }
    setTimeout(readyUp, 1000);
}

const readyUp = async () => {
    const guild = client.guilds.first();
    let c = 0;
    for (const member of guild.members.array()) {
        if (c === 20) break;
        const msg = new MockMessage(guild, lobby_channel, member);
        queueReadyCommand.run(msg, {});
        c++;
    }
}

const randomInput = () => {
    const guild = client.guilds.first();
    const channel = guild.channels.random();
    const member = guild.members.random();
    const command = commands.random();
    const msg = new MockMessage(guild, channel, member);
    command.run(msg, {});
    setTimeout(randomInput, Math.random() * 1000);
}

const onReady = async () => {
    ihlManager.matchTracker.run = async () => {
        if (ihlManager.matchTracker.lobbies.length) {
            const lobbyOrState = ihlManager.matchTracker.lobbies.shift();
            const lobby = await getLobby(lobbyOrState);
            ihlManager.matchTracker.emit(CONSTANTS.EVENT_MATCH_ENDED, lobby);
        }
    }
    for (const guild of client.guilds.array()) {
        const msg = new MockMessage(guild, guild.channels.random(), client.owner);
        await leagueCreateCommand.run(msg, {});
        const league = await findLeague(guild.id);
        await findOrCreateBot(league, getRandomInt(100000000).toString(), hri.random(), hri.random(), hri.random())
        await findOrCreateBot(league, getRandomInt(100000000).toString(), hri.random(), hri.random(), hri.random())
        await findOrCreateBot(league, getRandomInt(100000000).toString(), hri.random(), hri.random(), hri.random())
        for (const member of guild.members.array()) {
            const user = await findOrCreateUser(league, getRandomInt(100000000).toString(), member.id, getRandomInt(70) + 10);
            await user.update({ vouched: true });
        }
    }
    //await joinLobby();
    randomInput();
}

const run = async () => {
    //const mockedSequelize = await SequelizeMocking.createAndLoadFixtureFile(db.sequelize, [], { logging: false });
    ihlManager = new IHLManager(process.env);
    ihlManager.eventEmitter.on('ready', onReady);
    ihlManager.eventEmitter.on(CONSTANTS.STATE_COMPLETED, joinLobby);
    ihlManager.init(client);
};

run();