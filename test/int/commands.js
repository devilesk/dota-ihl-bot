const logger = require('../../lib/logger');
const spawn = require('../../lib/util/spawn');
const Promise = require('bluebird');
const Collection = require('discord.js/src/util/Collection');
const Argument = require('discord.js-commando/src/commands/argument');
Argument.validateInfo = function () {};
const Command = require('discord.js-commando/src/commands/base');
Command.validateInfo = function () {};
const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');
const EventEmitter = require('events').EventEmitter;
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
} = require('../../lib/ihlManager');
const {
    createNewLeague,
} = require('../../lib/ihl');
const DotaBot = require('../../lib/dotaBot');
const {
    findLeague,
    findBot,
    findAllBotsForLeague,
} = require('../../lib/db');
const BotAddCommand = require('../../commands/admin/bot-add');
const BotRemoveCommand = require('../../commands/admin/bot-remove');
const BotListCommand = require('../../commands/admin/bot-list');
const LeagueCreateCommand = require('../../commands/admin/league-create');
const LeagueSeasonCommand = require('../../commands/admin/league-season');
const RegisterCommand = require('../../commands/ihl/register');
const CONSTANTS = require('../../lib/constants');
const dotenv = require('dotenv').config({ path: path.join(__dirname, './.env') });
console.log(path.join(__dirname, './.env'));

before(async () => {
    await spawn('npm', ['run', 'db:init']);
});

sinon.stub(DotaBot, 'createDotaBot').callsFake(async config => {
    return new MockDotaBot(config);
});
sinon.stub(DotaBot, 'loadDotaBotTickets').resolves([]);

let ihlManager;

afterEach(async () => {
    await Promise.all(
        Object.values(db.sequelize.models)
            .map((model) => model.truncate({
                cascade: true,
                restartIdentity: true,
            }))
    );
});

after(() => { db.sequelize.close() })

describe('BotAddCommand', () => {
    let guild;
    let league;
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
        const client = new MockClient();
        client.initRandomGuilds(1, 2, 5, 3, 20);
        guild = client.guilds.first();
        cmd = new BotAddCommand(client);
        msg.say.reset();
        ihlManager.on('ready', async () => {
            await createNewLeague(guild);
            league = await findLeague(guild.id);
            done();
        });
        ihlManager.init(client);
    });

    it('add bot', async () => {
        const steamid_64 = '76561198015512690';
        const account_name = 'account_name';
        const persona_name = 'persona_name';
        const password = 'password';
        await cmd.onMsg({ msg, guild, league }, { steamid_64, account_name, persona_name, password });
        assert.isTrue(msg.say.calledWith(`Bot ${steamid_64} added.`));
    });

    it('add bot then update bot', async () => {
        let bot;
        const steamid_64 = '76561198015512690';
        const account_name = 'account_name';
        const persona_name = 'persona_name';
        const password = 'password';
        await cmd.onMsg({ msg, guild, league }, { steamid_64, account_name, persona_name, password });
        assert.isTrue(msg.say.calledWith(`Bot ${steamid_64} added.`));
        bot = await findBot(1);
        assert.equal(bot.steamid_64, '76561198015512690');
        assert.equal(bot.account_name, 'account_name');
        assert.equal(bot.persona_name, 'persona_name');
        assert.equal(bot.password, 'password');
        msg.say.reset();
        await cmd.onMsg({ msg, guild, league }, { steamid_64, account_name: 'account_name2', persona_name: 'persona_name2', password: 'password2' });
        assert.isTrue(msg.say.calledWith(`Bot ${steamid_64} updated.`));
        bot = await findBot(1);
        assert.equal(bot.steamid_64, '76561198015512690');
        assert.equal(bot.account_name, 'account_name2');
        assert.equal(bot.persona_name, 'persona_name2');
        assert.equal(bot.password, 'password2');
    });
});

describe('BotRemoveCommand', () => {
    let guild;
    let league;
    let inhouseState = {};
    let msg = {
        author: {
            id: '76864899866697728',
        },
        say: sinon.stub(),
    };
    let cmd;
    let addCmd;
    beforeEach(done => {
        ihlManager = new IHLManager(process.env);
        const client = new MockClient();
        client.initRandomGuilds(1, 2, 5, 3, 20);
        guild = client.guilds.first();
        cmd = new BotRemoveCommand(client);
        addCmd = new BotAddCommand(client);
        msg.say.reset();
        ihlManager.on('ready', async () => {
            await createNewLeague(guild);
            league = await findLeague(guild.id);
            done();
        });
        ihlManager.init(client);
    });

    it('remove bot that does not exist', async () => {
        const steamid_64 = '76561198015512690';
        const account_name = 'account_name';
        const persona_name = 'persona_name';
        const password = 'password';
        await cmd.onMsg({ msg, guild, league }, { steamid_64 });
        assert.isTrue(msg.say.calledWith(`Bot ${steamid_64} removed.`));
        const bots = await findAllBotsForLeague(league);
        assert.empty(bots);
    });

    it('add bot then remove bot', async () => {
        let bot;
        let bots;
        const steamid_64 = '76561198015512690';
        const account_name = 'account_name';
        const persona_name = 'persona_name';
        const password = 'password';
        await addCmd.onMsg({ msg, guild, league }, { steamid_64, account_name, persona_name, password });
        assert.isTrue(msg.say.calledWith(`Bot ${steamid_64} added.`));
        bot = await findBot(1);
        assert.equal(bot.steamid_64, '76561198015512690');
        assert.equal(bot.account_name, 'account_name');
        assert.equal(bot.persona_name, 'persona_name');
        assert.equal(bot.password, 'password');
        bots = await findAllBotsForLeague(league);
        assert.lengthOf(bots, 1);
        msg.say.reset();
        await cmd.onMsg({ msg, guild, league }, { steamid_64 });
        assert.isTrue(msg.say.calledWith(`Bot ${steamid_64} removed.`));
        bots = await findAllBotsForLeague(league);
        assert.empty(bots);
    });
});

describe('BotListCommand', () => {
    let guild;
    let league;
    let inhouseState = {};
    let msg = {
        author: {
            id: '76864899866697728',
        },
        say: sinon.stub(),
    };
    let cmd;
    let addCmd;
    beforeEach(done => {
        ihlManager = new IHLManager(process.env);
        const client = new MockClient();
        client.initRandomGuilds(1, 2, 5, 3, 20);
        guild = client.guilds.first();
        cmd = new BotListCommand(client);
        addCmd = new BotAddCommand(client);
        msg.say.reset();
        ihlManager.on('ready', async () => {
            await createNewLeague(guild);
            league = await findLeague(guild.id);
            done();
        });
        ihlManager.init(client);
    });

    it('list no bots', async () => {
        const steamid_64 = '76561198015512690';
        const account_name = 'account_name';
        const persona_name = 'persona_name';
        const password = 'password';
        await cmd.onMsg({ msg, guild, league });
        sinon.assert.calledWith(msg.say, {
            embed: {
                color: 3447003,
                fields: [
                    {
                        name: 'Bots',
                        value: '',
                        inline: false,
                    }
                ],
            }
        });
    });

    it('add bot then list bots', async () => {
        let bot;
        const steamid_64 = '76561198015512690';
        const account_name = 'account_name';
        const persona_name = 'persona_name';
        const password = 'password';
        await addCmd.onMsg({ msg, guild, league }, { steamid_64, account_name, persona_name, password });
        assert.isTrue(msg.say.calledWith(`Bot ${steamid_64} added.`));
        bot = await findBot(1);
        assert.equal(bot.steamid_64, '76561198015512690');
        assert.equal(bot.account_name, 'account_name');
        assert.equal(bot.persona_name, 'persona_name');
        assert.equal(bot.password, 'password');
        msg.say.reset();
        await cmd.onMsg({ msg, guild, league });
        sinon.assert.calledWith(msg.say, {
            embed: {
                color: 3447003,
                fields: [
                    {
                        name: 'Bots',
                        value: `**76561198015512690**
Account Name: account_name
Display Name: persona_name
Status: BOT_OFFLINE`,
                        inline: false,
                    }
                ],
            }
        });
    });
});

describe('LeagueCreateCommand', () => {
    let guild;
    let inhouseState = {};
    let msg = {
        say: sinon.stub(),
    };
    let cmd;
    beforeEach(done => {
        ihlManager = new IHLManager(process.env);
        const client = new MockClient();
        client.initRandomGuilds(1, 2, 5, 3, 20);
        guild = client.guilds.first();
        cmd = new LeagueCreateCommand(client);
        ihlManager.on('ready', done);
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

describe('LeagueSeasonCommand', () => {
    let guild;
    let inhouseState = {};
    let msg = {
        say: sinon.stub(),
    };
    let cmd;
    let addCmd;
    beforeEach(done => {
        ihlManager = new IHLManager(process.env);
        const client = new MockClient();
        client.initRandomGuilds(1, 2, 5, 3, 20);
        guild = client.guilds.first();
        cmd = new LeagueSeasonCommand(client);
        addCmd = new LeagueCreateCommand(client);
        ihlManager.on('ready', done);
        ihlManager.init(client);
    });

    it('create new season with name Test', async () => {
        let league;
        const name = 'Test';
        await addCmd.onMsg({ msg, guild });
        assert.isTrue(msg.say.calledWith('Inhouse league created.'));
        league = await findLeague(guild.id);
        assert.equal(league.current_season_id, 1);
        msg.say.reset();
        await cmd.onMsg({ msg, guild }, { name });
        assert.isTrue(msg.say.calledWith(`New season ${name} started.`));
        league = await findLeague(guild.id);
        assert.equal(league.current_season_id, 2);
    });
});

describe('RegisterCommand', () => {
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
        const client = new MockClient();
        client.initRandomGuilds(1, 2, 5, 3, 20);
        guild = client.guilds.first();
        cmd = new RegisterCommand(client);
        msg.say.reset();
        ihlManager.on('ready', async () => {
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

    it('register with account_id', async () => {
        const text = '55246962';
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