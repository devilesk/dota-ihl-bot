require('../common');
const MatchTracker = require('../../lib/matchTracker');
const DotaBot = require('../../lib/dotaBot');
const Lobby = require('../../lib/lobby');
const Guild = require('../../lib/guild');
const Db = require('../../lib/db');
const LobbyQueueHandlers = require('../../lib/lobbyQueueHandlers')({ Db, Guild, Lobby });
const LobbyStateHandlers = require('../../lib/lobbyStateHandlers');
const Fp = require('../../lib/util/fp');

describe('Database - with lobby players', () => {
    beforeEach(done => {
        sequelize_fixtures.loadFiles([
            path.resolve(path.join(__dirname, '../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-challenges.js')),
        ], db, { log: () => {} }).then(function(){
            done();
        });
    });
        
    const lobby_name = 'funny-yak-74';
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
        }, LobbyStateHandlers.LobbyStateHandlers({ DotaBot, Db, Guild, Lobby, MatchTracker, LobbyQueueHandlers }));
        guild.createRole({ roleName: lobby.lobby_name });
        const users = await db.User.findAll();
        for (const user of users) {
            const member = new Mocks.MockMember(guild);
            member.id = user.discord_id;
            guild.members.set(member.id, member);
        }
    });

    describe('lobbyStateHandlers', () => {
        let lobbyState;
        beforeEach(async () => {
            lobbyState = await Lobby.lobbyToLobbyState({
                guild,
                category: 'category',
                ready_check_timeout: 'ready_check_timeout',
                captain_rank_threshold: 'captain_rank_threshold',
                captain_role_regexp: 'captain_role_regexp',
                draft_order: 'ABBABAAB',
                lobby_name_template: 'Inhouse Lobby ${lobby_id}',
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
                assert.exists(result.ready_check_time);
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
                lobbyState.ready_check_time = 0;
                lobbyState.inhouseState = {
                    ready_check_timeout: 0,
                };
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
                    lobbyState.queue_type = CONSTANTS.QUEUE_TYPE_DRAFT;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                });

                it('return lobby state with STATE_SELECTION_PRIORITY when QUEUE_TYPE_CHALLENGE', async () => {
                    lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
                    lobbyState.queue_type = CONSTANTS.QUEUE_TYPE_CHALLENGE;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                });

                it('return lobby state with STATE_AUTOBALANCING when QUEUE_TYPE_AUTO', async () => {
                    lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
                    lobbyState.queue_type = CONSTANTS.QUEUE_TYPE_AUTO;
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
                assert.isNumber(lobbyState.captain_1_user_id);
                assert.isNumber(lobbyState.captain_2_user_id);
            });

            it('return lobby state STATE_AUTOBALANCING when no captains assigned', async () => {
                lobbyState.state = CONSTANTS.STATE_ASSIGNING_CAPTAINS;
                lobbyState.captain_1_user_id = null;
                lobbyState.captain_2_user_id = null;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_AUTOBALANCING);
                assert.isNull(lobbyState.captain_1_user_id);
                assert.isNull(lobbyState.captain_2_user_id);
            });

            it('return lobby state STATE_SELECTION_PRIORITY when captains assigned', async () => {
                const users = await db.User.findAll({ limit: 10 });
                await Lobby.addPlayers(lobbyState)(users);
                lobbyState.inhouseState = {
                    guild,
                    captain_role_regexp: 'Tier ([0-9]+) Captain',
                    captain_rank_threshold: 1000,
                }
                const role = await Guild.findOrCreateRole(guild)('Tier 0 Captain');
                await Lobby.mapPlayers(Guild.addRoleToUser(guild)(role))(lobbyState);
                lobbyState.state = CONSTANTS.STATE_ASSIGNING_CAPTAINS;
                lobbyState.captain_1_user_id = null;
                lobbyState.captain_2_user_id = null;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                assert.isNumber(result.captain_1_user_id);
                assert.isNumber(result.captain_2_user_id);
            });
        });
        
        describe('STATE_SELECTION_PRIORITY', () => {
            it('set captain factions, STATE_SELECTION_PRIORITY, and selection_priority', async () => {
                lobbyState.state = CONSTANTS.STATE_SELECTION_PRIORITY;
                const captain_1 = await db.User.findOne({ where: { id: 1 } });
                const captain_2 = await db.User.findOne({ where: { id: 2 } });
                lobbyState.captain_1_user_id = captain_1.id;
                lobbyState.captain_2_user_id = captain_2.id;
                await Lobby.addPlayer(lobbyState)(captain_1);
                await Lobby.addPlayer(lobbyState)(captain_2);
                let players1 = await lobby.getFaction1Players();
                assert.isEmpty(players1);
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                players1 = await lobby.getFaction1Players();
                assert.lengthOf(players1, 1);
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players2, 1);
                assert.equal(players1[0].id, captain_1.id);
                assert.equal(players2[0].id, captain_2.id);
                assert.equal(players1[0].LobbyPlayer.faction, 1);
                assert.equal(players2[0].LobbyPlayer.faction, 2);
                assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                assert.isAbove(result.selection_priority, 0);
                assert.equal(result.first_pick, 0);
                assert.equal(result.radiant_faction, 0);
            });
            
            it('return lobby state with STATE_SELECTION_PRIORITY', async () => {
                lobbyState.state = CONSTANTS.STATE_SELECTION_PRIORITY;
                const captain_1 = await db.User.findOne({ where: { id: 1 } });
                const captain_2 = await db.User.findOne({ where: { id: 2 } });
                lobbyState.captain_1_user_id = captain_1.id;
                lobbyState.captain_2_user_id = captain_2.id;
                await Lobby.addPlayer(lobbyState)(captain_1);
                await Lobby.addPlayer(lobbyState)(captain_2);
                let players1 = await lobby.getFaction1Players();
                assert.isEmpty(players1);
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                lobbyState.selection_priority = 1;
                lobbyState.first_pick = 1;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                players1 = await lobby.getFaction1Players();
                assert.lengthOf(players1, 1);
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players2, 1);
                assert.equal(players1[0].id, captain_1.id);
                assert.equal(players2[0].id, captain_2.id);
                assert.equal(players1[0].LobbyPlayer.faction, 1);
                assert.equal(players2[0].LobbyPlayer.faction, 2);
                assert.equal(result.state, CONSTANTS.STATE_SELECTION_PRIORITY);
                assert.equal(result.selection_priority, 1);
                assert.equal(result.first_pick, 1);
                assert.equal(result.radiant_faction, 0);
            });
            
            it('return lobby state with STATE_DRAFTING_PLAYERS', async () => {
                lobbyState.state = CONSTANTS.STATE_SELECTION_PRIORITY;
                const captain_1 = await db.User.findOne({ where: { id: 1 } });
                const captain_2 = await db.User.findOne({ where: { id: 2 } });
                lobbyState.captain_1_user_id = captain_1.id;
                lobbyState.captain_2_user_id = captain_2.id;
                await Lobby.addPlayer(lobbyState)(captain_1);
                await Lobby.addPlayer(lobbyState)(captain_2);
                let players1 = await lobby.getFaction1Players();
                assert.isEmpty(players1);
                let players2 = await lobby.getFaction2Players();
                assert.isEmpty(players1);
                lobbyState.selection_priority = 1;
                lobbyState.player_first_pick = 1;
                lobbyState.first_pick = 1;
                lobbyState.radiant_faction = 1;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                players1 = await lobby.getFaction1Players();
                assert.lengthOf(players1, 1);
                players2 = await lobby.getFaction2Players();
                assert.lengthOf(players2, 1);
                assert.equal(players1[0].id, captain_1.id);
                assert.equal(players2[0].id, captain_2.id);
                assert.equal(players1[0].LobbyPlayer.faction, 1);
                assert.equal(players2[0].LobbyPlayer.faction, 2);
                assert.equal(result.state, CONSTANTS.STATE_DRAFTING_PLAYERS);
                assert.equal(result.selection_priority, 1);
                assert.equal(result.player_first_pick, 1);
                assert.equal(result.first_pick, 1);
                assert.equal(result.radiant_faction, 1);
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
                    lobbyState.captain_1_user_id = users[0].id;
                    lobbyState.captain_2_user_id = users[1].id;
                    await Lobby.setPlayerFaction(1)(lobbyState)(lobbyState.captain_1_user_id);
                    await Lobby.setPlayerFaction(2)(lobbyState)(lobbyState.captain_2_user_id);
                    lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
                    lobbyState.player_first_pick = 1;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_DRAFTING_PLAYERS);
                });

                it('7 unassigned players', async () => {
                    const users = await db.User.findAll({ limit: 10 });
                    await Lobby.addPlayers(lobbyState)(users);
                    lobbyState.captain_1_user_id = users[0].id;
                    lobbyState.captain_2_user_id = users[1].id;
                    await Lobby.setPlayerFaction(1)(lobbyState)(lobbyState.captain_1_user_id);
                    await Lobby.setPlayerFaction(1)(lobbyState)(users[2].id);
                    await Lobby.setPlayerFaction(2)(lobbyState)(lobbyState.captain_2_user_id);
                    lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
                    lobbyState.player_first_pick = 1;
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_DRAFTING_PLAYERS);
                });
            });
        });
        
        describe('STATE_AUTOBALANCING', () => {
            it('return lobby state with STATE_TEAMS_SELECTED arranging teams by rank_tier', async () => {
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
                lobbyState.inhouseState.matchmaking_system = 'elo'
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
                lobbyState.bot_id = null;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_BOT_ASSIGNED);
                assert.equal(result.bot_id, 1);
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
                    lobbyState.bot_id = null;
                    findUnassignedBot.resolves(null);
                    const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_WAITING_FOR_BOT);
                    assert.notExists(result.bot_id);
                });
            });
            
            it('return lobby state with STATE_BOT_ASSIGNED when bot already assigned', async () => {
                lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                lobbyState.bot_id = 1;
                const result = await lobbyStateHandlers[lobbyState.state](lobbyState);
                assert.equal(result.state, CONSTANTS.STATE_BOT_ASSIGNED);
                assert.equal(result.bot_id, 1);
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