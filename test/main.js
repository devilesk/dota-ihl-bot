const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const DotaBot = require('../lib/dotaBot');

sinon.stub(DotaBot.DotaBot.prototype, 'connect').resolves(true);
sinon.stub(DotaBot.DotaBot.prototype, 'disconnect').resolves(true);
sinon.stub(DotaBot.DotaBot.prototype, 'createPracticeLobby').resolves(true);
sinon.stub(DotaBot.DotaBot.prototype, 'leavePracticeLobby').resolves(true);
sinon.stub(DotaBot.DotaBot.prototype, 'abandonCurrentGame').resolves(true);
sinon.stub(DotaBot.DotaBot.prototype, 'inviteToLobby').resolves(true);
sinon.stub(DotaBot.DotaBot.prototype, 'launchPracticeLobby').resolves({ match_id: '4021669313' });

const {
    getPlayers, getLobbyPlayerBySteamId, setPlayerReady, killLobby, getLobby, runLobby, getUserCaptainPriority, autoBalanceTeams, calcBalanceTeams, mapPlayers, setTeams,
} = proxyquire('../lib/lobby', {
    './dotaBot': {
        isDotaLobbyReady: () => true,
    },
});

const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const Promise = require('bluebird');
const db = require('../models');
const {
    resolveUser,
} = require('../lib/guild');
const {
    loadInhouseStates, sendMatchEndMessage,
} = require('../lib/ihlManager');
const {
    setMatchDetails,
} = require('../lib/matchTracker');
const CONSTANTS = require('../lib/constants');
const {
    findOrCreateLeague, findOrCreateLobby, findOrCreateLobbyForGuild, findOrCreateUser, findOrCreateQueue, findUserByDiscordId, findOrCreateBot, findAllLeagues, findInQueueWithUser, updateLeague, findLeague
} = require('../lib/db');
const {
    createInhouseState, checkInhouseQueue, registerUser, joinInhouseQueue, leaveInhouseQueue,
} = require('../lib/ihl');
const RegisterCommand = require('../commands/ihl/register');
const NicknameCommand = require('../commands/ihl/nickname');
const GameModeCommand = require('../commands/ihl/gamemode');
const QueueReadyCommand = require('../commands/queue/queue-ready');
const QueueStatusCommand = require('../commands/queue/queue-status');
const QueueLeaveCommand = require('../commands/queue/queue-leave');
const QueueJoinCommand = require('../commands/queue/queue-join');
const RolesCommand = require('../commands/ihl/roles');
const LeagueUpdateCommand = require('../commands/admin/league-update');

const RepCommand = proxyquire('../commands/ihl/rep', {
    '../../lib/ihlManager': {
        findUser: guild => async member => [{ id: 2 }, { id: '112718237040398336', displayName: 'Ari*' }, CONSTANTS.MATCH_EXACT_DISCORD_NAME],
    },
});
const UnrepCommand = proxyquire('../commands/ihl/unrep', {
    '../../lib/ihlManager': {
        findUser: guild => async member => [{ id: 2 }, { id: '112718237040398336', displayName: 'Ari*' }, CONSTANTS.MATCH_EXACT_DISCORD_NAME],
    },
});
const Commando = require('discord.js-commando');
const dotenv = require('dotenv').config();
const EventEmitter = require('events');
const util = require('util');
const Sequelize = require('sequelize');

const userData = [
    ['76561198015512690', '76864899866697728'],
    ['76561198136290105', '112718237040398336'],
    // ['76561198017839572', '75056758787158016'],
    ['76561198068904086', '361185987373826051'],
    ['76561197978831683', '95704393151680512'],
    ['76561198024087473', '93164485178564608'],
    // ['76561198046078327', '71370425099100160'],
    ['76561198038335275', '108018188054286336'],
    ['76561197995253668', '76783098456444928'],
    // ['76561198026721661', '103292711313899520'],
    ['76561198047112485', '122154474390159362'],
    ['76561198045206080', '149649478691979264'],
    ['76561198151093473', '424329081862225921'],
];


describe('Database', () => {
    let sandbox = null;
    let client;

    before(function (done) {
        Promise.try(async () => {
            client = new Commando.CommandoClient({
                commandPrefix: process.env.COMMAND_PREFIX,
                owner: process.env.OWNER_DISCORD_ID,
                disableEveryone: true,
                commandEditableDuration: 0,
                unknownCommandResponse: false,
            });

            client.on('ready', () => {
                done();
            });
            client.on('error', () => {
                console.log('Timeout');
            });
            client.login(process.env.TOKEN);
        });
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });
    
    after(() => {
        client.destroy();
    });

    sequelizeMockingMocha(
        db.sequelize,
        [],
        { logging: false },
    );

    describe('League', () => {
        let guild;
        let league;
        let bot;
        const users = [];
        let lobby;
        let eventEmitter;

        beforeEach(async () => {
            league = await findOrCreateLeague('422549177151782925');
            bot = await findOrCreateBot(league, '76561198810968998', 'testBot', 'testBot', 'password');
            lobby = await findOrCreateLobbyForGuild(league.guild_id, 'test');
            guild = client.guilds.get(league.guild_id);
            eventEmitter = new EventEmitter();
        });

        it('registerUser', async () => {
            const user = await registerUser(guild.id, '76561198017839572', '75056758787158016');
            assert.exists(user);
            assert.equal(user.steamid_64, '76561198017839572');
            assert.equal(user.discord_id, '75056758787158016');
        });

        /*it('RegisterCommand', async () => {
            const command = sinon.createStubInstance(RegisterCommand);
            command.run.restore();
            const msg = {
                channel: {
                    guild,
                },
                author: {
                    id: '75056758787158016',
                },
                say: sinon.stub().resolves(true),
            };
            const text = 'https://www.dotabuff.com/players/57573844';
            const user = await command.run(msg, { text });
            assert.exists(user);
            assert.equal(user.steamid_64, '76561198017839572');
            assert.equal(user.discord_id, '75056758787158016');
        });

        it('NicknameCommand', async () => {
            const command = sinon.createStubInstance(NicknameCommand);
            command.run.restore();
            const msg = {
                channel: {
                    guild,
                },
                author: {
                    id: userData[0][1],
                },
                say: sinon.stub().resolves(true),
            };
            let user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
            const text = 'Arteezy';
            user = await command.run(msg, { text });
            assert.exists(user);
            assert.equal(user.steamid_64, userData[0][0]);
            assert.equal(user.discord_id, userData[0][1]);
            assert.equal(user.nickname, text);
        });

        it('GameModeCommand', async () => {
            const command = sinon.createStubInstance(GameModeCommand);
            command.run.restore();
            const msg = {
                channel: {
                    guild,
                },
                author: {
                    id: userData[0][1],
                },
                say: sinon.stub().resolves(true),
            };
            let user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
            const text = 'cd';
            user = await command.run(msg, { text });
            assert.exists(user);
            assert.equal(user.steamid_64, userData[0][0]);
            assert.equal(user.discord_id, userData[0][1]);
            assert.equal(user.game_mode_preference, CONSTANTS.DOTA_GAMEMODE_CD);
        });

        it('RolesCommand', async () => {
            const command = sinon.createStubInstance(RolesCommand);
            command.run.restore();
            const msg = {
                channel: {
                    guild,
                },
                author: {
                    id: userData[0][1],
                },
                say: sinon.stub().resolves(true),
            };
            let user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
            const text = '1,2,3,4,5';
            user = await command.run(msg, { text });
            assert.exists(user);
            assert.equal(user.steamid_64, userData[0][0]);
            assert.equal(user.discord_id, userData[0][1]);
            assert.equal(user.role_1, 0);
            assert.equal(user.role_2, 1);
            assert.equal(user.role_3, 2);
            assert.equal(user.role_4, 3);
            assert.equal(user.role_5, 4);
        });

        it('RepCommand', async () => {
            const command = sinon.createStubInstance(RepCommand);
            command.run.restore();
            const msg = {
                channel: {
                    guild,
                },
                author: {
                    id: userData[0][1],
                },
                say: sinon.stub().resolves(true),
            };
            let user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
            const user2 = await findOrCreateUser(league, userData[1][0], userData[1][1], 50);
            const member = 'Ari';
            const [rep, created] = await command.run(msg, { member });
            assert.exists(rep);
            assert.exists(created);
            assert.isTrue(created);
        });

        it('UnrepCommand', async () => {
            const command = sinon.createStubInstance(UnrepCommand);
            command.run.restore();
            const msg = {
                channel: {
                    guild,
                },
                author: {
                    id: userData[0][1],
                },
                say: sinon.stub().resolves(true),
            };
            let user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
            const user2 = await findOrCreateUser(league, userData[1][0], userData[1][1], 50);
            const member = 'Ari';
            let count = await command.run(msg, { member });
            assert.exists(count);
            assert.equal(count, 0);

            const repCommand = sinon.createStubInstance(RepCommand);
            repCommand.run.restore();
            const [rep, created] = await repCommand.run(msg, { member });
            assert.exists(rep);
            assert.exists(created);
            assert.isTrue(created);

            count = await command.run(msg, { member });
            assert.exists(count);
            assert.equal(count, 1);
        });

        it('LeagueUpdateCommand', async () => {
            const command = sinon.createStubInstance(LeagueUpdateCommand);
            command.run.restore();
            const msg = {
                channel: {
                    guild,
                },
                author: {
                    id: userData[0][1],
                },
                say: sinon.stub().resolves(true),
            };
            let user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
            const setting = 'category';
            const value = 'test';
            
            let league2 = await findLeague(guild.id);
            assert.equal(league2.category_name, 'inhouses');
            
            await command.run(msg, { setting, value });
            
            await updateLeague(guild.id)({
                category_name: 'test'
            });
            league2 = await findLeague(guild.id);
            assert.equal(league2.category_name, 'test');
        });*/

        it('getLobby', async () => {
            const lobby1 = await findOrCreateLobby(league, 'test');
            const lobby2 = await getLobby({
                lobby_name: 'test',
            });
            const lobby3 = await getLobby(lobby1);
            assert.exists(lobby1);
            assert.exists(lobby2);
            assert.exists(lobby3);
            assert.equal(lobby1.lobby_name, 'test');
            assert.equal(lobby1.lobby_name, lobby2.lobby_name);
            assert.equal(lobby1.lobby_name, lobby3.lobby_name);
            assert.instanceOf(lobby1, Sequelize.Model);
            assert.instanceOf(lobby2, Sequelize.Model);
            assert.instanceOf(lobby3, Sequelize.Model);
        });

        it('getUserCaptainPriority', async () => {
            for (let i = 0; i < 10; i++) {
                const priority = getUserCaptainPriority(guild, league.captain_role_regexp, await resolveUser(guild, userData[i][1]));
            }
        });

        it('createInhouseState', async () => {
            let inhouseState;
            inhouseState = await createInhouseState({
                league, guild, categoryName: 'Inhouse', channelName: 'general', adminRoleName: 'Inhouse Admin',
            });
        });

        it('findAllLeagues', async () => {
            const leagues = await findAllLeagues();
            assert.lengthOf(leagues, 1);
        });

        it('updateLeague', async () => {
            let league2 = await findLeague(guild.id);
            assert.equal(league2.category_name, 'inhouses');
            await updateLeague(guild.id)({
                category_name: 'test'
            });
            league2 = await findLeague(guild.id);
            assert.equal(league2.category_name, 'test');
        });

        it('loadInhouseStates', async () => {
            const inhouseStates = await loadInhouseStates(eventEmitter)(client.guilds)(findAllLeagues());
            assert.exists(inhouseStates);
            assert.lengthOf(inhouseStates, 1);
        });

        describe('Inhouse', () => {
            let inhouseState;

            beforeEach(async () => {
                inhouseState = await createInhouseState({
                    league, guild, categoryName: 'Inhouse', channelName: 'general', adminRoleName: 'Inhouse Admin',
                });
            });

            afterEach(async () => {
                if (inhouseState && inhouseState.lobbies) {
                    for (let i = 0; i < inhouseState.lobbies.length; i++) {
                        const lobbyState = inhouseState.lobbies[0];
                        await killLobby(lobbyState);
                    }
                }
            });

            it('findInQueueWithUser', async () => {
                for (let i = 0; i < 10; i++) {
                    const user = await findOrCreateUser(league, userData[i][0], userData[i][1], 50);
                    users.push(user);
                    await findOrCreateQueue(user);
                }
                const queues = await findInQueueWithUser();
                assert.lengthOf(queues, 10);
                return queues.forEach(queue => assert.exists(queue.User));
            });

            it('checkInhouseQueue', async () => {
                for (let i = 0; i < 10; i++) {
                    const user = await findOrCreateUser(league, userData[i][0], userData[i][1], 50);
                    users.push(user);
                    await findOrCreateQueue(user);
                }
                inhouseState = await checkInhouseQueue(eventEmitter)(inhouseState);
            });

            it('joinInhouseQueue - not joined', async () => {
                const user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
                const spy = sinon.spy(eventEmitter, 'emit');
                await joinInhouseQueue(inhouseState, user, eventEmitter);
                assert.isTrue(spy.calledOnce);
                assert.isTrue(spy.calledWith(CONSTANTS.EVENT_QUEUE_JOINED, sinon.match.any, 1));
                eventEmitter.emit.restore();
            });

            it('joinInhouseQueue - already joined', async () => {
                const user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
                const spy = sinon.spy(eventEmitter, 'emit');
                await joinInhouseQueue(inhouseState, user, eventEmitter);
                await joinInhouseQueue(inhouseState, user, eventEmitter);
                assert.isTrue(spy.calledTwice);
                assert.isTrue(spy.firstCall.calledWith(CONSTANTS.EVENT_QUEUE_JOINED, sinon.match.any, 1));
                assert.isTrue(spy.secondCall.calledWith(CONSTANTS.EVENT_QUEUE_ALREADY_JOINED));
                eventEmitter.emit.restore();
            });

            it('joinInhouseQueue - multiple joined', async () => {
                const user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
                const user2 = await findOrCreateUser(league, userData[1][0], userData[1][1], 50);
                const spy = sinon.spy(eventEmitter, 'emit');
                await joinInhouseQueue(inhouseState, user, eventEmitter);
                await joinInhouseQueue(inhouseState, user2, eventEmitter);
                assert.isTrue(spy.calledTwice);
                assert.isTrue(spy.firstCall.calledWith(CONSTANTS.EVENT_QUEUE_JOINED, sinon.match.any, 1));
                assert.isTrue(spy.secondCall.calledWith(CONSTANTS.EVENT_QUEUE_JOINED, sinon.match.any, 2));
                eventEmitter.emit.restore();
            });

            it('leaveInhouseQueue - not joined', async () => {
                const user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
                const spy = sinon.spy(eventEmitter, 'emit');
                await leaveInhouseQueue(inhouseState, user, eventEmitter);
                assert.isTrue(spy.calledOnce);
                assert.isTrue(spy.calledWith(CONSTANTS.EVENT_QUEUE_NOT_JOINED, sinon.match.any));
                eventEmitter.emit.restore();
            });

            it('leaveInhouseQueue - already joined', async () => {
                const user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
                const spy = sinon.spy(eventEmitter, 'emit');
                await joinInhouseQueue(inhouseState, user, eventEmitter);
                await leaveInhouseQueue(inhouseState, user, eventEmitter);
                assert.isTrue(spy.calledTwice);
                assert.isTrue(spy.calledWith(CONSTANTS.EVENT_QUEUE_LEFT, sinon.match.any, 0));
                eventEmitter.emit.restore();
            });

            it('leaveInhouseQueue - multiple joined', async () => {
                const user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
                const user2 = await findOrCreateUser(league, userData[1][0], userData[1][1], 50);
                const spy = sinon.spy(eventEmitter, 'emit');
                await joinInhouseQueue(inhouseState, user, eventEmitter);
                await joinInhouseQueue(inhouseState, user2, eventEmitter);
                await leaveInhouseQueue(inhouseState, user, eventEmitter);
                assert.isTrue(spy.calledThrice);
                assert.isTrue(spy.calledWith(CONSTANTS.EVENT_QUEUE_LEFT, sinon.match.any, 1));
                eventEmitter.emit.restore();
            });

            describe('Lobby', () => {
                let lobbyState;

                beforeEach(async () => {
                    console.log('beforeEach start');
                    for (let i = 0; i < 10; i++) {
                        const user = await findOrCreateUser(league, userData[i][0], userData[i][1], 50);
                        users.push(user);
                        await findOrCreateQueue(user);
                    }
                    inhouseState = await checkInhouseQueue(eventEmitter)(inhouseState);
                    lobbyState = inhouseState.lobbies[0];
                    console.log('beforeEach end');
                });

                it('setPlayerReady', async () => {
                    const steamid_64 = userData[0][0];
                    let lobbyPlayer = await db.LobbyPlayer.scope({ method: ['steamid_64', steamid_64] }).findOne();
                    assert.isFalse(lobbyPlayer.ready);
                    await setPlayerReady(true)(lobbyState)(lobbyPlayer.User.id);
                    lobbyPlayer = await db.LobbyPlayer.scope({ method: ['steamid_64', steamid_64] }).findOne();
                    assert.isTrue(lobbyPlayer.ready);
                });

                it('all players ready', function (done) {
                    Promise.try(async () => {
                        for (let i = 0; i < 10; i++) {
                            let lobbyPlayer = await db.LobbyPlayer.scope({ method: ['steamid_64', userData[i][0]] }).findOne();
                            await setPlayerReady(true)(lobbyState)(lobbyPlayer.User.id);
                            console.log('set player ready', userData[i][0]);
                            lobbyState = await runLobby(lobbyState, eventEmitter);
                        }
                        assert.equal(lobbyState.state, CONSTANTS.STATE_MATCH_IN_PROGRESS);
                        lobbyState = await runLobby(lobbyState, eventEmitter);
                        assert.equal(lobbyState.state, CONSTANTS.STATE_MATCH_ENDED);
                        done();
                    });
                });

                it('sendMatchEndMessage', function (done) {
                    Promise.try(async () => {
                        for (let i = 0; i < 10; i++) {
                            let lobbyPlayer = await db.LobbyPlayer.scope({ method: ['steamid_64', userData[i][0]] }).findOne();
                            await setPlayerReady(true)(lobbyState)(lobbyPlayer.User.id);
                            console.log('set player ready', userData[i][0]);
                            lobbyState = await runLobby(lobbyState, eventEmitter);
                        }
                        assert.equal(lobbyState.state, CONSTANTS.STATE_MATCH_IN_PROGRESS);
                        lobbyState = await runLobby(lobbyState, eventEmitter);
                        assert.equal(lobbyState.state, CONSTANTS.STATE_MATCH_ENDED);
                        await setMatchDetails(lobbyState);
                        await sendMatchEndMessage([inhouseState], lobbyState);
                        done();
                    });
                });

                it('lobby.addPlayers', async () => {
                    const lobby = await getLobby(lobbyState);
                    const user = await findOrCreateUser(league, userData[0][0], userData[0][1], 50);
                    lobby.addPlayers([user], { through: { faction: 1 } });
                    lobby.addPlayers([user], { through: { faction: 2 } });
                });

                it('calcBalanceTeams', async () => {
                    const playersWithRank = await mapPlayers(player => [player, parseInt(player.rank_tier)])(lobbyState);
                    const [team_1, team_2] = await calcBalanceTeams(playersWithRank);
                    assert.lengthOf(team_1, 5);
                    assert.lengthOf(team_2, 5);
                    const lobby = await getLobby(lobbyState);
                    console.log(team_1[0], team_1[0] instanceof Sequelize.Model, team_1[0].id);
                    await setTeams(lobbyState)([team_1, team_2]);
                });

                it('autoBalanceTeams', async () => {
                    await autoBalanceTeams(lobbyState);
                });
            });
        });
    });
});
