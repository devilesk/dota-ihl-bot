require('../common');
const MatchTracker = require('../../lib/matchTracker');
const DotaBot = require('../../lib/dotaBot');
const Ihl = require('../../lib/ihl');
const Lobby = require('../../lib/lobby');
const Guild = require('../../lib/guild');
const Db = require('../../lib/db');
const LobbyQueueHandlers = require('../../lib/lobbyQueueHandlers');
const LobbyStateHandlers = require('../../lib/lobbyStateHandlers');
const MessageListeners = require('../../lib/messageListeners');
const Fp = require('../../lib/util/fp');

describe('Database - with lobby players', () => {
    beforeEach((done) => {
        sequelize_fixtures.loadFiles([
            path.resolve(path.join(__dirname, '../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-challenges.js')),
        ], db, { log: () => {} }).then(() => {
            done();
        });
    });

    const lobbyName = 'funny-yak-74';
    const id = 1;
    let guild;
    let lobby;
    let lobbyStateHandlers;

    beforeEach(async () => {
        guild = new Mocks.MockGuild();
        lobby = await Lobby.getLobby({ id });
        lobbyStateHandlers = Object.assign({
            registerLobbyTimeout: () => {},
            unregisterLobbyTimeout: () => {},
            onCreateLobbyQueue: () => {},
            botLeaveLobby: () => {},
            emit: () => {},
            once: () => {},
            bots: [],
            matchTracker: {},
        },
        LobbyStateHandlers.LobbyStateHandlers({ DotaBot, Db, Guild, Lobby, MatchTracker }),
        LobbyQueueHandlers({ Db, Lobby }),
        MessageListeners({ Db, Guild, Lobby, MatchTracker, Ihl }));
        guild.createRole({ roleName: lobby.lobbyName });
        const users = await db.User.findAll();
        for (const user of users) {
            const member = new Mocks.MockMember(guild);
            member.id = user.discordId;
            guild.members.set(member.id, member);
        }
    });

    describe('lobbyStateHandlers', () => {
        let lobbyState;
        beforeEach(async () => {
            lobbyState = await Lobby.lobbyToLobbyState({
                guild,
                category: 'category',
                readyCheckTimeout: 'readyCheckTimeout',
                captainRankThreshold: 'captainRankThreshold',
                captainRoleRegexp: 'captainRoleRegexp',
                draftOrder: 'ABBABAAB',
                lobbyNameTemplate: 'Inhouse Lobby ${lobbyId}',
            })(lobby);
        });

        describe('STATE_NEW', () => {
            it('return lobby state with STATE_WAITING_FOR_QUEUE', async () => {
                lobbyState.state = CONSTANTS.STATE_NEW;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_WAITING_FOR_QUEUE);
            });
        });

        describe('STATE_WAITING_FOR_QUEUE', () => {
            // TODO
        });

        describe('STATE_BEGIN_READY', () => {
            it('return lobby state with STATE_CHECKING_READY', async () => {
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_CHECKING_READY);
                assert.exists(result.readyCheckTime);
            });

            it('destroy challenges from players', async () => {
                const user1 = await Db.findUserById(4);
                const user2 = await Db.findUserById(3);
                let challenge = await Db.getChallengeBetweenUsers(user1)(user2);
                assert.exists(challenge);
                assert.isTrue(challenge.accepted);
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
                await Lobby.addPlayers(lobbyState)([user1, user2]);
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                challenge = await Db.getChallengeBetweenUsers(user1)(user2);
                assert.notExists(challenge);
            });
        });

        describe('STATE_CHECKING_READY', () => {
            it('return lobby state with STATE_CHECKING_READY when < 10 players ready', async () => {
                const users = await db.User.findAll({ limit: 10 });
                await Lobby.addPlayers(lobbyState)(users);
                lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_CHECKING_READY);
            });

            it('return lobby state with STATE_WAITING_FOR_QUEUE when timed out', async () => {
                const users = await db.User.findAll({ limit: 10 });
                await Lobby.addPlayers(lobbyState)(users);
                lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
                lobbyState.readyCheckTime = 0;
                lobbyState.inhouseState = { readyCheckTimeout: 0 };
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_WAITING_FOR_QUEUE);
            });

            describe('10 ready players', () => {
                beforeEach(async () => {
                    const users = await db.User.findAll({ limit: 10 });
                    await Lobby.addPlayers(lobbyState)(users);
                    for (const user of users) {
                        await Lobby.setPlayerReady(true)(lobbyState)(user.id);
                    }
                });

                it('return lobby state with STATE_SELECTION_PRIORITY when QUEUE_TYPE_DRAFT', async () => {
                    lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
                    lobbyState.queueType = CONSTANTS.QUEUE_TYPE_DRAFT;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                });

                it('return lobby state with STATE_SELECTION_PRIORITY when QUEUE_TYPE_CHALLENGE', async () => {
                    lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
                    lobbyState.queueType = CONSTANTS.QUEUE_TYPE_CHALLENGE;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                });

                it('return lobby state with STATE_AUTOBALANCING when QUEUE_TYPE_AUTO', async () => {
                    lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
                    lobbyState.queueType = CONSTANTS.QUEUE_TYPE_AUTO;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_AUTOBALANCING);
                });
            });
        });

        describe('STATE_ASSIGNING_CAPTAINS', () => {
            beforeEach(async () => {
                guild.createRole({ roleName: 'Tier 0 Captain' });
                guild.createRole({ roleName: 'Inhouse Player' });
            });

            it('return lobby state STATE_SELECTION_PRIORITY when captains already assigned', async () => {
                lobbyState.state = CONSTANTS.STATE_ASSIGNING_CAPTAINS;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                assert.isNumber(lobbyState.captain1UserId);
                assert.isNumber(lobbyState.captain2UserId);
            });

            it('return lobby state STATE_AUTOBALANCING when no captains assigned', async () => {
                lobbyState.state = CONSTANTS.STATE_ASSIGNING_CAPTAINS;
                lobbyState.captain1UserId = null;
                lobbyState.captain2UserId = null;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_AUTOBALANCING);
                assert.isNull(lobbyState.captain1UserId);
                assert.isNull(lobbyState.captain2UserId);
            });

            it('return lobby state STATE_SELECTION_PRIORITY when captains assigned', async () => {
                const users = await db.User.findAll({ limit: 10 });
                await Lobby.addPlayers(lobbyState)(users);
                lobbyState.inhouseState = {
                    guild,
                    captainRoleRegexp: 'Tier ([0-9]+) Captain',
                    captainRankThreshold: 1000,
                };
                const role = await Guild.findOrCreateRole(guild)('Tier 0 Captain');
                await Lobby.mapPlayers(Guild.addRoleToUser(guild)(role))(lobbyState);
                lobbyState.state = CONSTANTS.STATE_ASSIGNING_CAPTAINS;
                lobbyState.captain1UserId = null;
                lobbyState.captain2UserId = null;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                assert.isNumber(result.captain1UserId);
                assert.isNumber(result.captain2UserId);
            });
        });

        describe('STATE_SELECTION_PRIORITY', () => {
            it('set captain factions, STATE_SELECTION_PRIORITY, and selectionPriority', async () => {
                lobbyState.state = CONSTANTS.STATE_SELECTION_PRIORITY;
                const captain1 = await db.User.findOne({ where: { id: 1 } });
                const captain2 = await db.User.findOne({ where: { id: 2 } });
                lobbyState.captain1UserId = captain1.id;
                lobbyState.captain2UserId = captain2.id;
                await Lobby.addPlayer(lobbyState)(captain1);
                await Lobby.addPlayer(lobbyState)(captain2);
                let players1 = await lobby.getFaction1Players();
                assert.isEmpty(players1);
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                players1 = await lobby.getFaction1Players();
                assert.lengthOf(players1, 1);
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players2, 1);
                assert.equal(players1[0].id, captain1.id);
                assert.equal(players2[0].id, captain2.id);
                assert.equal(players1[0].LobbyPlayer.faction, 1);
                assert.equal(players2[0].LobbyPlayer.faction, 2);
                assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                assert.isAbove(result.selectionPriority, 0);
                assert.equal(result.firstPick, 0);
                assert.equal(result.radiantFaction, 0);
            });

            it('return lobby state with STATE_SELECTION_PRIORITY', async () => {
                lobbyState.state = CONSTANTS.STATE_SELECTION_PRIORITY;
                const captain1 = await db.User.findOne({ where: { id: 1 } });
                const captain2 = await db.User.findOne({ where: { id: 2 } });
                lobbyState.captain1UserId = captain1.id;
                lobbyState.captain2UserId = captain2.id;
                await Lobby.addPlayer(lobbyState)(captain1);
                await Lobby.addPlayer(lobbyState)(captain2);
                let players1 = await lobby.getFaction1Players();
                assert.isEmpty(players1);
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                lobbyState.selectionPriority = 1;
                lobbyState.firstPick = 1;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                players1 = await lobby.getFaction1Players();
                assert.lengthOf(players1, 1);
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players2, 1);
                assert.equal(players1[0].id, captain1.id);
                assert.equal(players2[0].id, captain2.id);
                assert.equal(players1[0].LobbyPlayer.faction, 1);
                assert.equal(players2[0].LobbyPlayer.faction, 2);
                assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                assert.equal(result.selectionPriority, 1);
                assert.equal(result.firstPick, 1);
                assert.equal(result.radiantFaction, 0);
            });

            it('return lobby state with STATE_DRAFTING_PLAYERS', async () => {
                lobbyState.state = CONSTANTS.STATE_SELECTION_PRIORITY;
                const captain1 = await db.User.findOne({ where: { id: 1 } });
                const captain2 = await db.User.findOne({ where: { id: 2 } });
                lobbyState.captain1UserId = captain1.id;
                lobbyState.captain2UserId = captain2.id;
                await Lobby.addPlayer(lobbyState)(captain1);
                await Lobby.addPlayer(lobbyState)(captain2);
                let players1 = await lobby.getFaction1Players();
                assert.isEmpty(players1);
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                lobbyState.selectionPriority = 1;
                lobbyState.playerFirstPick = 1;
                lobbyState.firstPick = 1;
                lobbyState.radiantFaction = 1;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                players1 = await lobby.getFaction1Players();
                assert.lengthOf(players1, 1);
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players2, 1);
                assert.equal(players1[0].id, captain1.id);
                assert.equal(players2[0].id, captain2.id);
                assert.equal(players1[0].LobbyPlayer.faction, 1);
                assert.equal(players2[0].LobbyPlayer.faction, 2);
                assert.equal(result.state, CONSTANTS.STATE_DRAFTING_PLAYERS);
                assert.equal(result.selectionPriority, 1);
                assert.equal(result.playerFirstPick, 1);
                assert.equal(result.firstPick, 1);
                assert.equal(result.radiantFaction, 1);
            });
        });

        describe('STATE_DRAFTING_PLAYERS', () => {
            it('return lobby state with STATE_TEAMS_SELECTED when no unassigned players', async () => {
                lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_TEAMS_SELECTED);
            });

            describe('return lobby state with STATE_DRAFTING_PLAYERS', () => {
                it('8 unassigned players', async () => {
                    const users = await db.User.findAll({ limit: 10 });
                    await Lobby.addPlayers(lobbyState)(users);
                    lobbyState.captain1UserId = users[0].id;
                    lobbyState.captain2UserId = users[1].id;
                    await Lobby.setPlayerFaction(1)(lobbyState)(lobbyState.captain1UserId);
                    await Lobby.setPlayerFaction(2)(lobbyState)(lobbyState.captain2UserId);
                    lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
                    lobbyState.playerFirstPick = 1;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_DRAFTING_PLAYERS);
                });

                it('7 unassigned players', async () => {
                    const users = await db.User.findAll({ limit: 10 });
                    await Lobby.addPlayers(lobbyState)(users);
                    lobbyState.captain1UserId = users[0].id;
                    lobbyState.captain2UserId = users[1].id;
                    await Lobby.setPlayerFaction(1)(lobbyState)(lobbyState.captain1UserId);
                    await Lobby.setPlayerFaction(1)(lobbyState)(users[2].id);
                    await Lobby.setPlayerFaction(2)(lobbyState)(lobbyState.captain2UserId);
                    lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
                    lobbyState.playerFirstPick = 1;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_DRAFTING_PLAYERS);
                });
            });
        });

        describe('STATE_AUTOBALANCING', () => {
            it('return lobby state with STATE_TEAMS_SELECTED arranging teams by rankTier', async () => {
                const users = await db.User.findAll({ limit: 10 });
                await Lobby.addPlayers(lobbyState)(users);
                lobbyState.state = CONSTANTS.STATE_AUTOBALANCING;
                let players1 = await lobby.getFaction1Players();
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                assert.isEmpty(players2);
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_TEAMS_SELECTED);
                players1 = await lobby.getFaction1Players();
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players1, 5);
                assert.lengthOf(players2, 5);
            });

            it('return lobby state with STATE_TEAMS_SELECTED arranging teams by rating', async () => {
                const users = await db.User.findAll({ limit: 10 });
                await Lobby.addPlayers(lobbyState)(users);
                lobbyState.state = CONSTANTS.STATE_AUTOBALANCING;
                lobbyState.inhouseState.matchmakingSystem = 'elo';
                let players1 = await lobby.getFaction1Players();
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                assert.isEmpty(players2);
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_TEAMS_SELECTED);
                players1 = await lobby.getFaction1Players();
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players1, 5);
                assert.lengthOf(players2, 5);
            });
        });

        describe('STATE_TEAMS_SELECTED', () => {
            it('return lobby state with STATE_WAITING_FOR_BOT', async () => {
                lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_WAITING_FOR_BOT);
            });
        });

        describe('STATE_WAITING_FOR_BOT', () => {
            it('return lobby state with STATE_BOT_ASSIGNED when assigned a bot', async () => {
                lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                lobbyState.botId = null;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_BOT_ASSIGNED);
                assert.equal(result.botId, 1);
            });

            describe('stub findUnassignedBot', () => {
                let findUnassignedBot;

                beforeEach(async () => {
                    findUnassignedBot = sinon.stub(Db, 'findUnassignedBot');
                });

                afterEach(async () => {
                    Db.findUnassignedBot.restore();
                });

                it('return lobby state with STATE_WAITING_FOR_BOT when not assigned a bot', async () => {
                    lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                    lobbyState.botId = null;
                    findUnassignedBot.resolves(null);
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_WAITING_FOR_BOT);
                    assert.notExists(result.botId);
                });
            });

            it('return lobby state with STATE_BOT_ASSIGNED when bot already assigned', async () => {
                lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                lobbyState.botId = 1;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_BOT_ASSIGNED);
                assert.equal(result.botId, 1);
            });
        });

        describe('STATE_BOT_FAILED', () => {
            it('return lobby state with STATE_BOT_FAILED', async () => {
                lobbyState.state = CONSTANTS.STATE_BOT_FAILED;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_BOT_FAILED);
            });
        });

        describe('STATE_MATCH_IN_PROGRESS', () => {
            it('return lobby state with STATE_MATCH_IN_PROGRESS', async () => {
                lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_MATCH_IN_PROGRESS);
            });
        });

        describe('STATE_MATCH_ENDED', () => {
            it('return lobby state with STATE_MATCH_ENDED', async () => {
                lobbyState.state = CONSTANTS.STATE_MATCH_ENDED;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_MATCH_ENDED);
            });
        });

        describe('STATE_MATCH_STATS', () => {
            it('return lobby state with STATE_COMPLETED', async () => {
                lobbyState.state = CONSTANTS.STATE_MATCH_STATS;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_COMPLETED);
            });
        });

        describe('STATE_KILLED', () => {
            it('return lobby state with STATE_KILLED', async () => {
                lobbyState.state = CONSTANTS.STATE_KILLED;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_KILLED);
            });
        });
    });
});
