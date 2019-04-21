require('../common');
const DotaBot = require('../../lib/dotaBot');
const MatchTracker = require('../../lib/matchTracker');
const IHLManager = require('../../lib/ihlManager');
const Ihl = require('../../lib/ihl');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');

describe('IHLManager', () => {
    let client;
    let ihlManager;
    let guild;
    let commands;

    before(async () => {
        ({ nockDone } = await nockBack('int_ihlManager.json'));
        sinon.stub(MatchTracker, 'createMatchEndMessageEmbed').callsFake(async match_id => `Match ${match_id} end message embed`);
        sinon.stub(DotaBot, 'createDotaBot').callsFake(async config => new Mocks.MockDotaBot(config));
        sinon.stub(DotaBot, 'loadDotaBotTickets').resolves([]);
    });

    beforeEach(async () => {
        client = new Mocks.MockClient();
        await client.initDefault();
        guild = client.guilds.first();
        await guild.toDatabase({ captain_rank_threshold: 100 });
        ihlManager = new IHLManager.IHLManager(process.env);
        await ihlManager.init(client);
    });

    after(async () => {
        await nockDone();
        MatchTracker.createMatchEndMessageEmbed.restore();
        DotaBot.createDotaBot.restore();
        DotaBot.loadDotaBotTickets.restore();
    });

    describe('findUser', () => {
        let member;

        beforeEach(async () => {
            member = new Mocks.MockMember(guild);
            await member.toGuild(guild).toDatabase();
        });

        it('return user matching discord id', async () => {
            const [user, discord_user, result_type] = await IHLManager.findUser(guild)(`<@${member.id}>`);
            assert.equal(user.id, 1);
            assert.equal(discord_user, member);
            assert.equal(result_type, CONSTANTS.MATCH_EXACT_DISCORD_MENTION);
        });

        it('return user matching discord name', async () => {
            const [user, discord_user, result_type] = await IHLManager.findUser(guild)(member.name);
            assert.equal(user.id, 1);
            assert.equal(discord_user.id, member.id);
            assert.equal(result_type, CONSTANTS.MATCH_EXACT_DISCORD_NAME);
        });
    });

    describe('Lobbies', () => {
        let nockDone;

        const selectionCommands = [
            ['First', 'First', 'Radiant'],
            ['First', 'First', 'Dire'],
            ['First', 'Second', 'Radiant'],
            ['First', 'Second', 'Dire'],
            ['First', 'Radiant', 'First'],
            ['First', 'Radiant', 'Second'],
            ['First', 'Dire', 'First'],
            ['First', 'Dire', 'Second'],
            ['Second', 'First', 'Radiant'],
            ['Second', 'First', 'Dire'],
            ['Second', 'Second', 'Radiant'],
            ['Second', 'Second', 'Dire'],
            ['Second', 'Radiant', 'First'],
            ['Second', 'Radiant', 'Second'],
            ['Second', 'Dire', 'First'],
            ['Second', 'Dire', 'Second'],
        ];

        beforeEach(async () => {
            commands = new Mocks.MockCommands(client);
            for (let i = 0; i < 10; i++) {
                const member = new Mocks.MockMember(guild);
                await member.toGuild(guild).toDatabase();
            }
            sinon.stub(DotaBot, 'startDotaLobby');
        });

        afterEach(async () => {
            DotaBot.startDotaLobby.restore();
        });

        it('autobalanced-queue', async () => {
            channel = guild.channels.find(channel => channel.name === 'autobalanced-queue');
            for (const [id, member] of guild.members) {
                if (guild.me.id !== member.id) await commands.QueueJoin({ guild, channel, member });
            }
            await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_CHECKING_READY);
            for (const [id, member] of guild.members) {
                if (guild.me.id !== member.id) await commands.QueueReady({ guild, channel, member });
            }
            await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_WAITING_FOR_BOT);
            DotaBot.startDotaLobby.resolves(6450130);
            await commands.BotAdd({ guild, channel, member: client.owner }, {
                steamid_64: TestHelper.randomNumberString(),
                account_name: TestHelper.randomName(),
                persona_name: TestHelper.randomName(),
                password: TestHelper.randomName(),
            });
            await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_COMPLETED);
            await TestHelper.waitForEvent(ihlManager)('empty');
        });

        selectionCommands.forEach((selectionCommand) => {
            it(`player-draft-queue selection priority: ${selectionCommand.join(',')}`, async () => {
                let lobbyState;
                const captain_role = new Mocks.MockRole(guild, 'Tier 1 Captain');
                const captain_1 = guild.members.array()[1];
                await captain_1._model.update({ rank_tier: 20 });
                const captain_2 = guild.members.array()[2];
                await captain_2._model.update({ rank_tier: 20 });
                captain_role.toGuild(guild).toMember(captain_1).toMember(captain_2);
                channel = guild.channels.find(channel => channel.name === 'player-draft-queue');
                for (const [id, member] of guild.members) {
                    if (guild.me.id !== member.id) await commands.QueueJoin({ guild, channel, member });
                }
                await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_CHECKING_READY);
                for (const [id, member] of guild.members) {
                    if (guild.me.id !== member.id) await commands.QueueReady({ guild, channel, member });
                }
                lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_SELECTION_PRIORITY);
                await commands[selectionCommand[0]]({ guild, channel, member: lobbyState.selection_priority === 1 ? captain_2 : captain_1 });
                lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_SELECTION_PRIORITY);
                await commands[selectionCommand[1]]({ guild, channel, member: lobbyState.selection_priority === 1 ? captain_1 : captain_2 });
                lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_SELECTION_PRIORITY);
                await commands[selectionCommand[2]]({ guild, channel, member: lobbyState.selection_priority === 1 ? captain_2 : captain_1 });
                for (let i = 2; i < 10; i++) {
                    lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_DRAFTING_PLAYERS);
                    const { draft_order } = lobbyState.inhouseState;
                    const captain = ((draft_order[i - 2] === 'A' && lobbyState.player_first_pick === 1) || (draft_order[i - 2] === 'B' && lobbyState.player_first_pick === 2)) ? captain_1 : captain_2;
                    await commands.Pick({ guild, channel, member: captain }, { member: guild.members.array()[i + 1].toMention() });
                }
                await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_WAITING_FOR_BOT);
                DotaBot.startDotaLobby.resolves(6450130);
                await commands.BotAdd({ guild, channel, member: client.owner }, {
                    steamid_64: TestHelper.randomNumberString(),
                    account_name: TestHelper.randomName(),
                    persona_name: TestHelper.randomName(),
                    password: TestHelper.randomName(),
                });
                await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_COMPLETED);
                await TestHelper.waitForEvent(ihlManager)('empty');
            });
        });

        it('challenge-queue', async () => {
            let lobbyState;
            const captain_1 = guild.members.array()[1];
            const captain_2 = guild.members.array()[2];
            channel = guild.channels.find(channel => channel.name === 'general');
            await commands.Challenge({ guild, channel, member: captain_1 }, { member: captain_2 });
            await commands.Challenge({ guild, channel, member: captain_2 }, { member: captain_1 });
            lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_WAITING_FOR_QUEUE);
            channel = guild.channels.find(channel => channel.name === lobbyState.lobby_name);
            for (let i = 2; i < 10; i++) {
                await commands.QueueJoin({ guild, channel, member: guild.members.array()[i + 1] });
            }
            await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_CHECKING_READY);
            for (const [id, member] of guild.members) {
                if (guild.me.id !== member.id) await commands.QueueReady({ guild, channel, member });
            }
            lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_SELECTION_PRIORITY);
            await commands.First({ guild, channel, member: lobbyState.selection_priority === 1 ? captain_2 : captain_1 });
            lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_SELECTION_PRIORITY);
            await commands.First({ guild, channel, member: lobbyState.selection_priority === 1 ? captain_1 : captain_2 });
            lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_SELECTION_PRIORITY);
            await commands.Radiant({ guild, channel, member: lobbyState.selection_priority === 1 ? captain_2 : captain_1 });
            for (let i = 2; i < 10; i++) {
                lobbyState = await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_DRAFTING_PLAYERS);
                const { draft_order } = lobbyState.inhouseState;
                const captain = ((draft_order[i - 2] === 'A' && lobbyState.player_first_pick === 1) || (draft_order[i - 2] === 'B' && lobbyState.player_first_pick === 2)) ? captain_1 : captain_2;
                await commands.Pick({ guild, channel, member: captain }, { member: guild.members.array()[i + 1].toMention() });
            }
            await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_WAITING_FOR_BOT);
            DotaBot.startDotaLobby.resolves(6450130);
            await commands.BotAdd({ guild, channel, member: client.owner }, {
                steamid_64: TestHelper.randomNumberString(),
                account_name: TestHelper.randomName(),
                persona_name: TestHelper.randomName(),
                password: TestHelper.randomName(),
            });
            await TestHelper.waitForEvent(ihlManager)(CONSTANTS.STATE_COMPLETED);
            await TestHelper.waitForEvent(ihlManager)('empty');
        });
    });
});
