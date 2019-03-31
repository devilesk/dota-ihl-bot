const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const EventEmitter = require('events').EventEmitter;
const db = require('../../models');
const {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    sendMatchEndMessage,
    createClient,
    IHLManager,
} = require('../../lib/ihlManager');
const {
    createNewLeague,
} = require('../../lib/ihl');
const LeagueCreateCommand = require('../../commands/admin/league-create');
class MockIHLCommand {
    constructor() {}
}
const RegisterCommand = proxyquire('../../commands/ihl/register', {
    '../../lib/ihlCommand': MockIHLCommand,
});
const CONSTANTS = require('../../lib/constants');
const dotenv = require('dotenv').config({ path: path.join(__dirname, './.env') });
console.log(path.join(__dirname, './.env'));

const Collection = require('discord.js/src/util/Collection');

class MockChannel {
    constructor(channelName, channelType) {
        
    }
    
    async setParent() {
        return this;
    }
    
    async setPosition() {
        return this;
    }
    
    async setName() {
        return this;
    }
    
    async setTopic() {
        return this;
    }
    
    async overwritePermissions() {
        return this;
    }
}

class MockRole {
    constructor(roleName) {
        
    }
    
    async setName() {
        return this;
    }
    
    async setPermissions() {
        return this;
    }
    
    async setMentionable() {
        return this;
    }
}

const createMockClient = () => {
    const guild = {
        id: '422549177151782925',
        roles: new Collection(),
        channels: new Collection(),
        members: new Collection(),
        createChannel: (channelName, channelType) => new MockChannel(channelName, channelType),
        createRole: ({ roleName }) => new MockRole(roleName),
    }
    const client = new EventEmitter();
    client.registry = {
        registerDefaultTypes: () => client.registry,
        registerGroups: () => client.registry,
        registerDefaultGroups: () => client.registry,
        registerDefaultCommands: () => client.registry,
        registerCommandsIn: () => client.registry,
    };
    client.user = {
        id: '419520125012541441',
        tag: 'rd2l-bot#8499',
    };
    client.guilds = new Collection([['422549177151782925', guild]]);
    client.login = () => client.emit('ready');
    return client;
};

let ihlManager;

describe('LeagueCreateCommand', () => {
    sequelizeMockingMocha(
        db.sequelize,
        [],
        { logging: false },
    );
    
    let guild;
    let inhouseState = {};
    let msg = {
        say: sinon.stub(),
    };
    let cmd;
    beforeEach(done => {
        ihlManager = new IHLManager(process.env);
        const client = createMockClient();
        guild = client.guilds.first();
        cmd = new LeagueCreateCommand(client);
        ihlManager.eventEmitter.on('ready', done);
        ihlManager.init(client);
    });

    it('say Inhouse league created', async () => {
        await cmd.onMsg({ msg, guild });
        assert.isTrue(msg.say.calledWith('Inhouse league created.'));
    });

    it('say Inhouse league already exists', async () => {
        await cmd.onMsg({ msg, inhouseState: {}, guild });
        assert.isTrue(msg.say.calledWith('Inhouse league already exists.'));
    });
});

describe('RegisterCommand', () => {
    sequelizeMockingMocha(
        db.sequelize,
        [],
        { logging: false },
    );
    
    let guild;
    let inhouseState = {};
    let msg = {
        author: {
            id: '76864899866697728',
        },
        say: sinon.stub(),
    };
    let cmd;
    beforeEach(done => {
        ihlManager = new IHLManager(process.env);
        const client = createMockClient();
        guild = client.guilds.first();
        cmd = new RegisterCommand(client);
        msg.say.reset();
        ihlManager.eventEmitter.on('ready', async () => {
            await createNewLeague(guild);
            done();
        });
        ihlManager.init(client);
    });

    it('register with steamid_64', async () => {
        const text = '76561198015512690';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Registered 76561198015512690'));
    });

    it('fail with a bad steamid_64', async () => {
        const text = 'asdf6962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Invalid steam id.'));
    });

    it('register with steam vanity link', async () => {
        const text = 'https://steamcommunity.com/id/devilesk';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Registered 76561198015512690'));
    });

    it('fail with bad steam vanity link', async () => {
        const text = 'https://steamcommunity.com/id/devileskasdfasdfsdadfs';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Invalid steam id.'));
    });

    it('register with steam profiles link', async () => {
        const text = 'https://steamcommunity.com/profiles/76561198015512690';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Registered 76561198015512690'));
    });

    it('fail with a bad steam profiles link', async () => {
        const text = 'https://steamcommunity.com/profiles/asdf6962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Invalid steam id.'));
    });

    it('register with dotabuff link', async () => {
        const text = 'https://www.dotabuff.com/players/55246962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Registered 76561198015512690'));
    });

    it('fail with a bad dotabuff link', async () => {
        const text = 'https://www.dotabuff.com/players/asdf6962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Invalid steam id.'));
    });

    it('register with opendota link', async () => {
        const text = 'https://www.opendota.com/players/55246962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Registered 76561198015512690'));
    });

    it('fail with a bad opendota link', async () => {
        const text = 'https://www.opendota.com/players/asdf6962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Invalid steam id.'));
    });

    it('register with stratz link', async () => {
        const text = 'https://stratz.com/en-us/player/55246962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Registered 76561198015512690'));
    });

    it('fail with a bad stratz link', async () => {
        const text = 'https://stratz.com/en-us/player/asdf6962';
        await cmd.onMsg({ msg, guild }, { text });
        assert.isTrue(msg.say.calledWith('Invalid steam id.'));
    });
});
