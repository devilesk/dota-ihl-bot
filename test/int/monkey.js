const logger = require('../../lib/logger');
const spawn = require('../../lib/util/spawn');
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
const { EventEmitter } = require('events');
const { hri } = require('human-readable-ids');
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
const Lobby = require('../../lib/lobby');
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
const PickCommand = require('../../commands/ihl/pick');

let ihlManager;
let lobby_channel;
const leagueCreateCommand = new LeagueCreateCommand(client);
const queueJoinCommand = new QueueJoinCommand(client);
const queueReadyCommand = new QueueReadyCommand(client);
const queueLeaveCommand = new QueueLeaveCommand(client);
const queueStatusCommand = new QueueStatusCommand(client);
const pickCommand = new PickCommand(client);
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

const testAutobalance = () => {
    const guild = client.guilds.first();
    lobby_channel = guild.channels.find(channel => channel.name === 'autobalanced-queue');
    const members = guild.members.array();
    for (let i = 0; i < 10; i++) {
        const member = members[i];
        const msg = new MockMessage(guild, lobby_channel, member);
        queueJoinCommand.run(msg, {});
    }
    ihlManager.on(CONSTANTS.STATE_CHECKING_READY, () => {
        for (let i = 0; i < 10; i++) {
            const member = members[i];
            const msg = new MockMessage(guild, lobby_channel, member);
            queueReadyCommand.run(msg, {});
        }
    });
}

const testDraft = () => {
    const guild = client.guilds.first();
    lobby_channel = guild.channels.find(channel => channel.name === 'player-draft-queue');
    const members = guild.members.array();
    for (let i = 0; i < 10; i++) {
        const member = members[i];
        const msg = new MockMessage(guild, lobby_channel, member);
        queueJoinCommand.run(msg, {});
    }
    ihlManager.once(CONSTANTS.STATE_CHECKING_READY, () => {
        for (let i = 0; i < 10; i++) {
            const member = members[i];
            const msg = new MockMessage(guild, lobby_channel, member);
            queueReadyCommand.run(msg, {});
        }
    });
    ihlManager.once(CONSTANTS.STATE_DRAFTING_PLAYERS, (lobbyState) => {
        randomDraft(lobbyState);
    });
}

const randomDraft = async lobbyState => {
    const lobby = await Lobby.getLobby(lobbyState);
    logger.debug(`randomDraft ${lobby.lobby_name} ${lobby.captain_1_user_id} ${lobby.captain_2_user_id}`);
    const guild = client.guilds.first();
    lobby_channel = guild.channels.find(channel => channel.name === lobby.lobby_name);
    const members = guild.members.array();
    const r = getRandomInt(2);
    let captain;
    if (r === 0) {
        captain = await Lobby.getPlayerByUserId(lobbyState)(lobby.captain_1_user_id);
    }
    else {
        captain = await Lobby.getPlayerByUserId(lobbyState)(lobby.captain_2_user_id);
    }
    logger.debug(`randomDraft captain ${captain} ${captain.discord_id}`);
    let msg;
    msg = new MockMessage(guild, lobby_channel, guild.members.get(captain.discord_id));
    pickCommand.run(msg, { member: guild.members.random().displayName });
    if (lobby.state === CONSTANTS.STATE_DRAFTING_PLAYERS) {
        setTimeout(async () => randomDraft(lobbyState), Math.random() * 1000);
    }
}

const onReady = async () => {
    ihlManager.matchTracker.run = async () => {
        if (ihlManager.matchTracker.lobbies.length) {
            const lobbyOrState = ihlManager.matchTracker.lobbies.shift();
            const lobby = await Lobby.getLobby(lobbyOrState);
            ihlManager.matchTracker.emit(CONSTANTS.EVENT_MATCH_ENDED, lobby);
        }
    }
    for (const guild of client.guilds.array()) {
        const msg = new MockMessage(guild, guild.channels.random(), client.owner);
        await leagueCreateCommand.run(msg, {});
        const league = await findLeague(guild.id);
        await league.update({ captain_rank_threshold: 100 });
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
    //testAutobalance();
    //testDraft();
}

const run = async () => {
    await spawn('npm', ['run', 'db:init']);
    //const mockedSequelize = await SequelizeMocking.createAndLoadFixtureFile(db.sequelize, [], { logging: false });
    ihlManager = new IHLManager(process.env);
    ihlManager.on('ready', onReady);
    ihlManager.on(CONSTANTS.STATE_COMPLETED, joinLobby);
    ihlManager.init(client);
};

run();