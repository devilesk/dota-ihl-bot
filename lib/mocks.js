const Collection = require('discord.js/src/util/Collection');
const SnowflakeUtil = require('discord.js/src/util/Snowflake');
const hri = require('human-readable-ids').hri;
const EventEmitter = require('events').EventEmitter;
const sinon = require('sinon');
const dota2 = require('dota2');
const getRandomInt = require('./util/getRandomInt');

class MockDotaBot extends EventEmitter {
    constructor(config) {
        super();
        
        this.config = config;
        this.lobby_id = null;
        this.game_name = null;
        this.pass_key = null;
        this.factionCache = {};
        this.steamClient = {
            logOn: () => {},
        }
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
    
    async practiceLobbyKickFromTeam() {}
    
    async leavePracticeLobby() {}
    
    async abandonCurrentGame() {}
    
    async joinChat() {}
    
    async joinLobbyChat() {}
    
    async leaveChat() {}
    
    async joinPracticeLobby(lobby_id, { game_name, pass_key }) {
        this.lobby_id = lobby_id;
        this.game_name = game_name;
        this.pass_key = pass_key;
    }
    
    async createPracticeLobby({ game_name, pass_key }) {
        this.lobby_id = getRandomInt(100000000).toString();
        this.game_name = game_name;
        this.pass_key = pass_key;
        return dota2.EResult.k_EResultOK;
    }
}

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

class MockGuild {
    constructor() {
        this.id = SnowflakeUtil.generate();
        this.roles = new Collection();
        this.channels = new Collection();
        this.members = new Collection();
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
            this.createRole({ roleName: `Tier ${i+1} Captain` });
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
        
        this.owner = {
            id: SnowflakeUtil.generate(),
            tag: 'owner#1111',
        };
        this.user = {
            id: SnowflakeUtil.generate(),
            tag: 'bot#8499',
        };
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
    
    isOwner(user) {
        return user.id === this.owner.id;;
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

module.exports = {
    MockDotaBot,
    MockMember,
    MockChannel,
    MockRole,
    MockMessage,
    MockGuild,
    MockClient,
}