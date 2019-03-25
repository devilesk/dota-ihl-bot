const SnowflakeUtil = require('discord.js/src/util/Snowflake');
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

class MockDotaBot extends EventEmitter {
    constructor(config) {
        super();
        
        this.config = config;
        this.lobby_id = null;
        this.game_name = null;
        this.pass_key = null;
        this.factionCache = {};
    }
    
    get playerState() {
        return this.factionCache;
    }
    
    async connect() {}
    
    async disconnect() {}
    
    async inviteToLobby() {}
    
    async sendMessage() {}
    
    async launchPracticeLobby() {
        return {
            match_id: getRandomInt(100000000).toString()
        }
    }
    
    async leavePracticeLobby() {}
    
    async abandonCurrentGame() {}
    
    async joinPracticeLobby(lobby_id, { game_name, pass_key }) {
        this.lobby_id = lobby_id;
        this.game_name = game_name;
        this.pass_key = pass_key;
    }
    
    async createPracticeLobby({ game_name, pass_key }) {
        this.lobby_id = getRandomInt(100000000).toString();
        this.game_name = game_name;
        this.pass_key = pass_key;
    }
}

const {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    sendMatchEndMessage,
    createClient,
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
    createInhouseState,
} = require('../../lib/ihl');
const {
    getLobby,
} = require('../../lib/lobby');
const {
    findChannel,
} = require('../../lib/guild');
const {
    findOrCreateBot,
    findLeague,
    findLobbyByDiscordChannel,
    findOrCreateUser,
} = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');
const dotenv = require('dotenv').config({ path: path.join(__dirname, './.env') });
console.log(path.join(__dirname, './.env'));
const Collection = require('discord.js/src/util/Collection');

const getRandomInt = max => Math.floor(Math.random() * Math.floor(max));

class MockMember {
    constructor(guild) {
        this.id = SnowflakeUtil.generate();
        this.guild = guild;
        this.name = hri.random();
        this.username = this.name;
        this.displayName = this.name;
        this.roles = new Collection();
        for (let i = 0; i < getRandomInt(5); i++) {
            const role = guild.roles.random();
            this.roles.set(role.id, role);
        }
    }
    
    async addRole(role) {
        this.roles.set(role.id, role);
        return this;
    }
}

class MockChannel {
    constructor(guild, channelName, channelType) {
        this.id = SnowflakeUtil.generate();
        this.guild = guild;
        this.name = channelName;
        this.type = channelType;
        this.send = sinon.stub();
        this.send.resolves(true);
    }
    
    async setParent() {
        return this;
    }
    
    async setPosition() {
        return this;
    }
    
    async setName(name) {
        this.name = name;
        return this;
    }
    
    async setTopic() {
        return this;
    }
    
    async overwritePermissions() {
        return this;
    }
    
    async delete() {
        return this;
    }
}

class MockRole {
    constructor(guild, roleName) {
        this.id = SnowflakeUtil.generate();
        this.guild = guild;
        this.name = roleName;
    }
    
    async setName(name) {
        this.name = name;
        return this;
    }
    
    async setPermissions() {
        return this;
    }
    
    async setMentionable() {
        return this;
    }
    
    async delete() {
        return this;
    }
}

class MockMessage {
    constructor(guild, channel, member) {
        this.guild = guild;
        this.channel = channel;
        this.author = member;
        this.member = member;
        this.say = sinon.stub();
        this.say.resolves(true);
    }
}

const createMockGuild = () => {
    const guild = {
        id: SnowflakeUtil.generate(),
        roles: new Collection(),
        channels: new Collection(),
        members: new Collection(),
    }
    guild.createChannel = (channelName, channelType) => {
        const channel = new MockChannel(guild, channelName, channelType);
        guild.channels.set(channel.id, channel);
        return channel;
    }
    guild.createRole = ({ roleName }) => {
        const role = new MockRole(guild, roleName);
        guild.roles.set(role.id, role);
        return role;
    }
    guild.member = id => guild.members.get(id);
    for (let i = 0; i < 2; i++) {
        guild.createChannel(hri.random(), 'channel');
    }
    for (let i = 0; i < 5; i++) {
        guild.createRole({ roleName: hri.random() });
    }
    for (let i = 0; i < 3; i++) {
        guild.createRole({ roleName: `Tier ${i+1} Captain` });
    }
    for (let i = 0; i < 20; i++) {
        const member = new MockMember(guild);
        guild.members.set(member.id, member);
    }
    return guild;
}

const createMockClient = () => {
    const client = new EventEmitter();
    client.registry = {
        registerDefaultTypes: () => client.registry,
        registerGroups: () => client.registry,
        registerDefaultGroups: () => client.registry,
        registerDefaultCommands: () => client.registry,
        registerCommandsIn: () => client.registry,
        types: new Collection(),
    };
    client.owner = {
        id: SnowflakeUtil.generate(),
        tag: 'owner#1111',
    };
    client.user = {
        id: SnowflakeUtil.generate(),
        tag: 'bot#8499',
    };
    client.isOwner = user => user.id === client.owner.id;
    client.guilds = new Collection();
    for (let i = 0; i < 1; i++) {
        const guild = createMockGuild();
        client.guilds.set(guild.id, guild);
    }
    client.login = () => client.emit('ready');
    return client;
};
const client = createMockClient();
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