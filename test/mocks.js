const logger = require('../lib/logger');
const requireAll = require('require-all');
const path = require('path');
const Collection = require('discord.js/src/util/Collection');
const SnowflakeUtil = require('discord.js/src/util/Snowflake');
const { hri } = require('human-readable-ids');
const { EventEmitter } = require('events');
const sinon = require('sinon');
const steam = require('steam');
const Long = require('long');
const CONSTANTS = require('../lib/constants');
const TestHelper = require('./helper');
const db = require('../models');
const Db = require('../lib/db');
const Argument = require('discord.js-commando/src/commands/argument');

Argument.validateInfo = function () {};
const Command = require('discord.js-commando/src/commands/base');

Command.validateInfo = function () {};
const chai = require('chai');

const { assert } = chai;

class MockDotaBot extends EventEmitter {
    constructor(config) {
        super();

        this.config = config;
        this.steamId64 = config.steamId64;
        this.dotaLobbyId = Long.ZERO;
        this.game_name = null;
        this.pass_key = null;
        this.teamCache = {};
        this.steamClient = { logOn: () => {} };
    }

    static Factory(data = {}) {
        return Object.assign(new MockDotaBot(), data);
    }

    async toDatabase(data = {}) {
        this._model = await db.Bot.create(Object.assign({}, this.config, data));
        return this;
    }

    get playerState() {
        return this.teamCache;
    }

    async connect() {}

    async disconnect() {}

    async inviteToLobby() {}

    async sendMessage() {}

    async launchPracticeLobby() {
        return { matchId: TestHelper.randomMatchId() };
    }

    async practiceLobbyKickFromTeam() {}

    async leavePracticeLobby() {}

    async abandonCurrentGame() {}

    async joinChat() {}

    async joinLobbyChat() {}

    async leaveChat() {}

    async leaveLobbyChat() {}

    async joinPracticeLobby(dotaLobbyId, { game_name, pass_key }) {
        this.dotaLobbyId = Long.fromString(dotaLobbyId);
        this.game_name = game_name;
        this.pass_key = pass_key;
    }

    async createPracticeLobby({ game_name, pass_key }) {
        this.dotaLobbyId = TestHelper.randomLong();
        this.game_name = game_name;
        this.pass_key = pass_key;
        return steam.EResult.OK;
    }

    async requestLeagueInfoListAdmins() {}
}

class MockMember {
    constructor(guild) {
        this.id = SnowflakeUtil.generate();
        this.guild = guild;
        this.name = hri.random();
        this.username = this.name;
        this.displayName = this.name;
        this.tag = `${this.name}#${TestHelper.randomNumberString(9999)}`;
        this.roles = new Collection();
        this.hasPermission = sinon.stub();
        this.hasPermission.returns(true);
    }

    static Factory(data = {}) {
        return Object.assign(new MockMember(), data);
    }

    async toDatabase(data = {}) {
        this._model = await db.User.create(Object.assign({}, {
            leagueId: this.guild._model.id,
            steamId64: TestHelper.randomSteamID64(),
            discordId: this.id,
            nickname: TestHelper.randomName(),
            role1: TestHelper.randomNumber(5) + 1,
            role2: TestHelper.randomNumber(5) + 1,
            role3: TestHelper.randomNumber(5) + 1,
            role4: TestHelper.randomNumber(5) + 1,
            role5: TestHelper.randomNumber(5) + 1,
            vouched: true,
            rating: TestHelper.randomNumber(1500) + 500,
            rankTier: TestHelper.randomNumber(80) + 1,
            commends: TestHelper.randomNumber(10),
            reputation: TestHelper.randomNumber(10),
        }, data));
        return this;
    }

    toGuild(guild) {
        this.guild = guild;
        guild.members.set(this.id, this);
        return this;
    }

    async addRole(role) {
        this.roles.set(role.id, role);
        return this;
    }

    toMention() {
        return `<@${this.id}>`;
    }
}

class MockChannel {
    constructor(guild, channelName, channelType) {
        this.id = SnowflakeUtil.generate();
        this.guild = guild;
        this.name = channelName;
        this.type = channelType;
        this.parentID = null;
        this.send = async text => logger.silly(`MockChannel.send ${this.guild.id} ${this.id} ${text}`);
    }

    static Factory(data = {}) {
        return Object.assign(new MockChannel(), data);
    }

    toGuild(guild) {
        this.guild = guild;
        guild.channels.set(this.id, this);
        return this;
    }

    async setParent(category) {
        this.parentID = category.id;
        return this;
    }

    async setPosition() {
        return this;
    }

    async setName(name) {
        assert.match(name, /^[0-9a-z-]+$/);
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

    toGuild(guild) {
        this.guild = guild;
        guild.roles.set(this.id, this);
        return this;
    }

    toMember(member) {
        member.roles.set(this.id, this);
        return this;
    }

    static Factory(data = {}) {
        return Object.assign(new MockRole(), data);
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
        this.say = async text => logger.silly(`MockMessage.say ${this.guild.id} ${this.channel.id} ${text}`);
    }

    static Factory(data = {}) {
        return Object.assign(new MockMessage(), data);
    }
}

class MockGuild {
    constructor(id) {
        this.id = id || SnowflakeUtil.generate();
        this.roles = new Collection();
        this.channels = new Collection();
        this.members = new Collection();
        this.me = new MockMember(this);
        this.members.set(this.me.id, this.me);
    }

    static Factory(data = {}) {
        return Object.assign(new MockMessage(), data);
    }

    async toDatabase(data = {}) {
        this._model = await Db.findOrCreateLeague(this.id)([
            { queueType: CONSTANTS.QUEUE_TYPE_DRAFT, queueName: 'player-draft-queue' },
            { queueType: CONSTANTS.QUEUE_TYPE_AUTO, queueName: 'autobalanced-queue' },
        ]);
        this._model.update(data);
        return this;
    }

    toClient(client) {
        client.guilds.set(this.id, this);
        if (client.user) {
            this.members.delete(this.me.id);
            this.me = client.user;
            this.members.set(this.me.id, this.me);
        }
        return this;
    }

    async initDefault() {
        const category = new MockChannel(this, 'inhouses', 'category');
        category.toGuild(this);
        let channel = new MockChannel(this, 'general', 'channel');
        await channel.toGuild(this).setParent(category);
        channel = new MockChannel(this, 'player-draft-queue', 'channel');
        await channel.toGuild(this).setParent(category);
        channel = new MockChannel(this, 'autobalanced-queue', 'channel');
        await channel.toGuild(this).setParent(category);
        const adminRole = new MockRole(this, 'Inhouse Admin');
        adminRole.toGuild(this);
        return this;
    }

    initRandomChannels(num) {
        for (let i = 0; i < num; i++) {
            this.createChannel(hri.random(), 'channel');
        }
    }

    initRandomRoles(num) {
        for (let i = 0; i < num; i++) {
            this.createRole({ roleName: hri.random() });
        }
    }

    initRandomCaptainRoles(num) {
        for (let i = 0; i < num; i++) {
            this.createRole({ roleName: `Tier ${i + 1} Captain` });
        }
    }

    initRandomMembers(num) {
        for (let i = 0; i < num; i++) {
            const member = new MockMember(this);
            this.members.set(member.id, member);
        }
    }

    initRandom(numChannels, numRoles, numCaptainRoles, numMembers) {
        this.initRandomChannels(numChannels);
        this.initRandomRoles(numRoles);
        this.initRandomCaptainRoles(numCaptainRoles);
        this.initRandomMembers(numMembers);
    }

    createChannel(channelName, channelType) {
        const channel = new MockChannel(this, channelName, channelType);
        this.channels.set(channel.id, channel);
        return channel;
    }

    createRole({ roleName }) {
        const role = new MockRole(this, roleName);
        this.roles.set(role.id, role);
        return role;
    }

    member(id) {
        return this.members.get(id);
    }
}

class MockClient extends EventEmitter {
    constructor() {
        super();

        this.owner = new MockMember();
        this.user = new MockMember();
        this.guilds = new Collection();
        this.registry = {
            registerDefaultTypes: () => this.registry,
            registerGroups: () => this.registry,
            registerDefaultGroups: () => this.registry,
            registerDefaultCommands: () => this.registry,
            registerCommandsIn: () => this.registry,
            types: new Collection(),
        };
    }

    async initDefault() {
        const guild = new MockGuild();
        await guild.toClient(this).initDefault();
        return this;
    }

    isOwner(user) {
        return user.id === this.owner.id;
    }

    login() {
        this.emit('ready');
    }

    initRandomGuilds(numGuilds, numChannels, numRoles, numCaptainRoles, numMembers) {
        for (let i = 0; i < numGuilds; i++) {
            const guild = new MockGuild();
            guild.initRandom(numChannels, numRoles, numCaptainRoles, numMembers);
            this.guilds.set(guild.id, guild);
        }
    }
}

const obj = requireAll(path.join(__dirname, '../commands'));
const MockCommandsList = [];
for (const group of Object.values(obj)) {
    for (let command of Object.values(group)) {
        if (typeof command.default === 'function') command = command.default;
        MockCommandsList.push(command);
    }
}

class MockCommands {
    constructor(client) {
        this.client = client;
        this.registry = {};
        for (const command of MockCommandsList) {
            this.registry[command.name.replace('Command', '')] = new command(this.client);
            this[command.name.replace('Command', '')] = async ({ guild, channel, member }, args = {}) => {
                const msg = new MockMessage(guild, channel, member);
                return this.registry[command.name.replace('Command', '')].run(msg, args);
            };
        }
    }
}

module.exports = {
    MockDotaBot,
    MockMember,
    MockChannel,
    MockRole,
    MockMessage,
    MockGuild,
    MockClient,
    MockCommandsList,
    MockCommands,
};
