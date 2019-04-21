require('../common');
const Collection = require('discord.js/src/util/Collection');
const Argument = require('discord.js-commando/src/commands/argument');

Argument.validateInfo = function () {};
const Command = require('discord.js-commando/src/commands/base');

Command.validateInfo = function () {};
const {
    MockDotaBot,
    MockMember,
    MockChannel,
    MockRole,
    MockMessage,
    MockGuild,
    MockClient,
} = require('../mocks');
const { IHLManager } = require('../../lib/ihlManager');
const Ihl = require('../../lib/ihl');
const DotaBot = require('../../lib/dotaBot');
const {
    findLeague,
    findBot,
    findAllBotsForLeague,
} = require('../../lib/db');
const BotAddCommand = require('../../commands/owner/bot-add');
const BotRemoveCommand = require('../../commands/owner/bot-remove');
const BotListCommand = require('../../commands/admin/bot-list');
const LeagueCreateCommand = require('../../commands/owner/league-create');
const LeagueSeasonCommand = require('../../commands/admin/league-season');
const RegisterCommand = require('../../commands/ihl/register');

const afterRecord = (scopes) => {
    scopes.forEach((scope) => {
        scope.path = scope.path.replace(`key=${process.env.STEAM_API_KEY}&`, '');
    });
    return scopes;
};
const prepareScope = (scope) => {
    scope.filteringPath = path => path.replace(`key=${process.env.STEAM_API_KEY}&`, '');
};


describe('Commands', () => {
    let ihlManager;

    before(async () => {
        ({ nockDone } = await nockBack('int_commands.json', { before: prepareScope, afterRecord }));
        sinon.stub(DotaBot, 'createDotaBot').callsFake(async config => new MockDotaBot(config));
        sinon.stub(DotaBot, 'loadDotaBotTickets').resolves([]);
    });

    after(async () => {
        await nockDone();
        DotaBot.createDotaBot.restore();
        DotaBot.loadDotaBotTickets.restore();
    });

    describe('BotAddCommand', () => {
        let guild;
        let league;
        const inhouseState = {};
        const msg = {
            author: { id: '76864899866697728' },
            say: sinon.stub(),
        };
        let cmd;
        beforeEach(async () => {
            ihlManager = new IHLManager(process.env);
            const client = new MockClient();
            client.initRandomGuilds(1, 2, 5, 3, 20);
            guild = client.guilds.first();
            cmd = new BotAddCommand(client);
            msg.say.reset();
            await ihlManager.init(client);
            await Ihl.createNewLeague(guild);
            league = await findLeague(guild.id);
        });

        it('add bot', async () => {
            const steamId64 = '76561198015512690';
            const accountName = 'accountName';
            const personaName = 'personaName';
            const password = 'password';
            await cmd.onMsg({ msg, guild, league }, { steamId64, accountName, personaName, password });
            assert.isTrue(msg.say.calledWith(`Bot ${steamId64} added.`));
        });

        it('add bot then update bot', async () => {
            let bot;
            const steamId64 = '76561198015512690';
            const accountName = 'accountName';
            const personaName = 'personaName';
            const password = 'password';
            await cmd.onMsg({ msg, guild, league }, { steamId64, accountName, personaName, password });
            assert.isTrue(msg.say.calledWith(`Bot ${steamId64} added.`));
            bot = await findBot(1);
            assert.equal(bot.steamId64, '76561198015512690');
            assert.equal(bot.accountName, 'accountName');
            assert.equal(bot.personaName, 'personaName');
            assert.equal(bot.password, 'password');
            msg.say.reset();
            await cmd.onMsg({ msg, guild, league }, { steamId64, accountName: 'account_name2', personaName: 'persona_name2', password: 'password2' });
            assert.isTrue(msg.say.calledWith(`Bot ${steamId64} updated.`));
            bot = await findBot(1);
            assert.equal(bot.steamId64, '76561198015512690');
            assert.equal(bot.accountName, 'account_name2');
            assert.equal(bot.personaName, 'persona_name2');
            assert.equal(bot.password, 'password2');
        });
    });

    describe('BotRemoveCommand', () => {
        let guild;
        let league;
        const inhouseState = {};
        const msg = {
            author: { id: '76864899866697728' },
            say: sinon.stub(),
        };
        let cmd;
        let addCmd;
        beforeEach(async () => {
            ihlManager = new IHLManager(process.env);
            const client = new MockClient();
            client.initRandomGuilds(1, 2, 5, 3, 20);
            guild = client.guilds.first();
            cmd = new BotRemoveCommand(client);
            addCmd = new BotAddCommand(client);
            msg.say.reset();
            await ihlManager.init(client);
            await Ihl.createNewLeague(guild);
            league = await findLeague(guild.id);
        });

        it('remove bot that does not exist', async () => {
            const steamId64 = '76561198015512690';
            const accountName = 'accountName';
            const personaName = 'personaName';
            const password = 'password';
            await cmd.onMsg({ msg, guild, league }, { steamId64 });
            assert.isTrue(msg.say.calledWith('No bot removed.'));
            const bots = await findAllBotsForLeague(league);
            assert.empty(bots);
        });

        it('add bot then remove bot', async () => {
            let bot;
            let bots;
            const steamId64 = '76561198015512690';
            const accountName = 'accountName';
            const personaName = 'personaName';
            const password = 'password';
            await addCmd.onMsg({ msg, guild, league }, { steamId64, accountName, personaName, password });
            assert.isTrue(msg.say.calledWith(`Bot ${steamId64} added.`));
            bot = await findBot(1);
            assert.equal(bot.steamId64, '76561198015512690');
            assert.equal(bot.accountName, 'accountName');
            assert.equal(bot.personaName, 'personaName');
            assert.equal(bot.password, 'password');
            bots = await findAllBotsForLeague(league);
            assert.lengthOf(bots, 1);
            msg.say.reset();
            await cmd.onMsg({ msg, guild, league }, { steamId64 });
            assert.isTrue(msg.say.calledWith(`Bot ${steamId64} removed.`));
            bots = await findAllBotsForLeague(league);
            assert.empty(bots);
        });
    });

    describe('BotListCommand', () => {
        let guild;
        let league;
        const inhouseState = {};
        const msg = {
            author: { id: '76864899866697728' },
            say: sinon.stub(),
        };
        let cmd;
        let addCmd;
        beforeEach(async () => {
            ihlManager = new IHLManager(process.env);
            const client = new MockClient();
            client.initRandomGuilds(1, 2, 5, 3, 20);
            guild = client.guilds.first();
            cmd = new BotListCommand(client);
            addCmd = new BotAddCommand(client);
            msg.say.reset();
            await ihlManager.init(client);
            await Ihl.createNewLeague(guild);
            league = await findLeague(guild.id);
        });

        it('list no bots', async () => {
            const steamId64 = '76561198015512690';
            const accountName = 'accountName';
            const personaName = 'personaName';
            const password = 'password';
            await cmd.onMsg({ msg, guild, league });
            sinon.assert.calledWith(msg.say, {
                embed: {
                    color: 3447003,
                    fields: [
                        {
                            name: 'Bots',
                            value: 'No bots.',
                            inline: false,
                        },
                    ],
                },
            });
        });

        it('add bot then list bots', async () => {
            let bot;
            const steamId64 = '76561198015512690';
            const accountName = 'accountName';
            const personaName = 'personaName';
            const password = 'password';
            await addCmd.onMsg({ msg, guild, league }, { steamId64, accountName, personaName, password });
            assert.isTrue(msg.say.calledWith(`Bot ${steamId64} added.`));
            bot = await findBot(1);
            assert.equal(bot.steamId64, '76561198015512690');
            assert.equal(bot.accountName, 'accountName');
            assert.equal(bot.personaName, 'personaName');
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
Account Name: accountName
Display Name: personaName
Status: BOT_OFFLINE
Tickets: `,
                            inline: false,
                        },
                    ],
                },
            });
        });
    });

    describe('LeagueCreateCommand', () => {
        let guild;
        const inhouseState = {};
        const msg = { say: sinon.stub() };
        let cmd;
        beforeEach(async () => {
            ihlManager = new IHLManager(process.env);
            const client = new MockClient();
            client.initRandomGuilds(1, 2, 5, 3, 20);
            guild = client.guilds.first();
            cmd = new LeagueCreateCommand(client);
            await ihlManager.init(client);
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
        const inhouseState = {};
        const msg = { say: sinon.stub() };
        let cmd;
        let addCmd;
        beforeEach(async () => {
            ihlManager = new IHLManager(process.env);
            const client = new MockClient();
            client.initRandomGuilds(1, 2, 5, 3, 20);
            guild = client.guilds.first();
            cmd = new LeagueSeasonCommand(client);
            addCmd = new LeagueCreateCommand(client);
            await ihlManager.init(client);
        });

        it('create new season with name Test', async () => {
            let league;
            const name = 'Test';
            await addCmd.onMsg({ msg, guild });
            assert.isTrue(msg.say.calledWith('Inhouse league created.'));
            league = await findLeague(guild.id);
            assert.equal(league.currentSeasonId, 1);
            msg.say.reset();
            await cmd.onMsg({ msg, guild }, { name });
            assert.isTrue(msg.say.calledWith(`New season ${name} started.`));
            league = await findLeague(guild.id);
            assert.equal(league.currentSeasonId, 2);
        });
    });

    describe('RegisterCommand', () => {
        let nockDone;
        let guild;
        const inhouseState = {};
        const msg = {
            member: { id: '76864899866697728', displayName: 'Test' },
            author: { id: '76864899866697728', displayName: 'Test' },
            say: sinon.stub(),
        };
        let cmd;
        beforeEach(async () => {
            ihlManager = new IHLManager(process.env);
            const client = new MockClient();
            client.initRandomGuilds(1, 2, 5, 3, 20);
            guild = client.guilds.first();
            cmd = new RegisterCommand(client);
            msg.say.reset();
            await ihlManager.init(client);
            await Ihl.createNewLeague(guild);
        });

        it('register with steamId64', async () => {
            const text = '76561198015512690';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Registered Test 76561198015512690.'));
        });

        it('register with accountId', async () => {
            const text = '55246962';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Registered Test 76561198015512690.'));
        });

        it('fail with a bad steamId64', async () => {
            const text = 'asdf';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Invalid steam id.'));
        });

        it('register with steam vanity link', async () => {
            const text = 'https://steamcommunity.com/id/devilesk';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Registered Test 76561198015512690.'));
        });

        it('fail with bad steam vanity link', async () => {
            const text = 'https://steamcommunity.com/id/devileskasdfasdfsdadfs';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Invalid steam id.'));
        });

        it('register with steam profiles link', async () => {
            const text = 'https://steamcommunity.com/profiles/76561198015512690';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Registered Test 76561198015512690.'));
        });

        it('fail with a bad steam profiles link', async () => {
            const text = 'https://steamcommunity.com/profiles/asdf';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Invalid steam id.'));
        });

        it('register with dotabuff link', async () => {
            const text = 'https://www.dotabuff.com/players/55246962';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Registered Test 76561198015512690.'));
        });

        it('fail with a bad dotabuff link', async () => {
            const text = 'https://www.dotabuff.com/players/asdf';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Invalid steam id.'));
        });

        it('register with opendota link', async () => {
            const text = 'https://www.opendota.com/players/55246962';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Registered Test 76561198015512690.'));
        });

        it('fail with a bad opendota link', async () => {
            const text = 'https://www.opendota.com/players/asdf';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Invalid steam id.'));
        });

        it('register with stratz link', async () => {
            const text = 'https://stratz.com/en-us/player/55246962';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Registered Test 76561198015512690.'));
        });

        it('fail with a bad stratz link', async () => {
            const text = 'https://stratz.com/en-us/player/asdf';
            await cmd.onMsg({ msg, guild }, { text });
            assert.isTrue(msg.say.calledWith('Invalid steam id.'));
        });
    });
});
