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
const {
    createNewLeague,
} = require('../../lib/ihl');
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

describe('findUser', () => {
    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../../testdata/int-ihlManager.js')),
        ],
        { logging: false },
    );
    
    beforeEach(done => {
        ihlManager = new IHLManager(process.env);
        const client = createMockClient();
        ihlManager.eventEmitter.on('ready', done);
        ihlManager.init(client);
    });

    it('return user matching discord id', async () => {
        const guild = {
            id: '422549177151782925',
            members: [],
        }
        guild.members.get = sinon.stub();
        guild.members.get.withArgs('76864899866697728').returns('discord_user');
        const [user, discord_user, result_type] = await findUser(guild)('<@76864899866697728>');
        assert.equal(user.id, 1);
        assert.equal(discord_user, 'discord_user');
        assert.equal(result_type, CONSTANTS.MATCH_EXACT_DISCORD_MENTION);
    });
    
    it('return user matching discord name', async () => {
        const guild = {
            id: '422549177151782925',
            members: [
                {
                    id: '76864899866697728',
                    displayName: 'Test',
                }
            ],
        }
        const [user, discord_user, result_type] = await findUser(guild)('test');
        assert.equal(user.id, 1);
        assert.equal(discord_user.id, '76864899866697728');
        assert.equal(result_type, CONSTANTS.MATCH_EXACT_DISCORD_NAME);
    });
});

describe('ihlManager', () => {

    
    let client;
    
    before(() => {
        console.log('0');
        client = createMockClient();
    });
    
    beforeEach(() => {
        console.log('db');
    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../../testdata/int-ihlManager.js')),
        ],
        { logging: false },
    );
    });
    
    describe.only('#init', () => {
        before(() => {
            console.log('1a');
            ihlManager = new IHLManager(process.env);
        });
    
        it('emit ready', done => {
            ihlManager.eventEmitter.on('ready', () => {
                done();
            });
            ihlManager.init(client);
        });
    });
    
    describe.only('post init', () => {
        before(done => {
            console.log('1b');
            ihlManager = new IHLManager(process.env);
            client = createMockClient();
            ihlManager.eventEmitter.on('ready', done);
            ihlManager.init(client);
        });
        
        it('emit ready', () => {
            assert.isTrue(true);
        });
    });
});