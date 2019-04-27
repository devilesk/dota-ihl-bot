require('../common.db');
require('../common');
const {
    getLobby,
    getPlayers,
    getPlayerByUserId,
    getPlayerBySteamId,
    getPlayerByDiscordId,
    getNoFactionPlayers,
    getNotReadyPlayers,
    getReadyPlayers,
    mapPlayers,
    addPlayer,
    removePlayer,
    addPlayers,
    addRoleToPlayers,
    updateLobbyPlayer,
    updateLobbyPlayerBySteamId,
    setPlayerReady,
    setPlayerFaction,
    sortQueuersAsc,
    getQueuers,
    getActiveQueuers,
    getQueuerByUserId,
    getQueuerBySteamId,
    getQueuerByDiscordId,
    mapQueuers,
    mapActiveQueuers,
    hasQueuer,
    addQueuer,
    removeQueuer,
    addQueuers,
    addRoleToQueuers,
    updateLobbyQueuer,
    updateLobbyQueuerBySteamId,
    setQueuerActive,
    removeUserFromQueues,
    removeQueuers,
    calcBalanceTeams,
    setTeams,
    selectCaptainPairFromTiers,
    sortPlayersByCaptainPriority,
    roleToCaptainPriority,
    getCaptainPriorityFromRoles,
    playerToCaptainPriority,
    getPlayersWithCaptainPriority,
    getActiveQueuersWithCaptainPriority,
    checkQueueForCaptains,
    assignCaptains,
    calcDefaultGameMode,
    autoBalanceTeams,
    getDefaultGameMode,
    assignGameMode,
    getDraftingFaction,
    getFactionCaptain,
    isPlayerDraftable,
    isCaptain,
    formatNameForLobby,
    getLobbyNameFromCaptains,
    resetLobbyState,
    connectDotaBot,
    createDotaBotLobby,
    setupLobbyBot,
    setLobbyStateKilled,
    isReadyCheckTimedOut,
    createLobbyState,
    lobbyToLobbyState,
    forceLobbyDraft,
    lobbyQueuerToPlayer,
    returnPlayerToQueue,
    returnPlayersToQueue,
    removeLobbyPlayersFromQueues,
    assignLobbyName,
    runLobby,
    isMessageFromLobby,
} = require('../../lib/lobby');
const MatchTracker = require('../../lib/matchTracker');
const DotaBot = require('../../lib/dotaBot');
const Lobby = require('../../lib/lobby');
const Guild = require('../../lib/guild');
const Db = require('../../lib/db');
const Ihl = require('../../lib/ihl');
const LobbyQueueHandlers = require('../../lib/lobbyQueueHandlers');
const LobbyStateHandlers = require('../../lib/lobbyStateHandlers').LobbyStateHandlers({ DotaBot, Db, Guild, Lobby, MatchTracker });
const MessageListeners = require('../../lib/messageListeners');
const { tapP } = require('../../lib/util/fp');
const {
    findUserById,
    getChallengeBetweenUsers,
} = require('../../lib/db');

let guild;

describe('Database - with lobby players', () => {
    beforeEach((done) => {
        guild = new Mocks.MockGuild();
        sequelize_fixtures.loadFiles([
            path.resolve(path.join(__dirname, '../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyplayers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyqueuers.js')),
        ], db, { log: () => {} }).then(() => {
            done();
        });
    });

    const lobbyName = 'funny-yak-74';
    const id = 1;

    describe('getLobby', () => {
        it('return a Lobby given a { lobbyName }', async () => {
            const lobby = await getLobby({ id });
            assert.equal(lobby.id, id);
        });

        it('return a Lobby given a Lobby db model', async () => {
            const lobby = await getLobby(await getLobby({ id }));
            assert.equal(lobby.id, id);
        });
    });

    describe('Lobby Functions', () => {
        let lobby;
        beforeEach(async () => {
            lobby = await getLobby({ id });
        });

        describe('getPlayers', () => {
            it('return 10 players in the lobby', async () => {
                const players = await getPlayers()(lobby);
                assert.lengthOf(players, 10);
            });
        });

        describe('getPlayerByUserId', () => {
            it('return a player', async () => {
                const player = await getPlayerByUserId(lobby)(1);
                assert.equal(player.id, 1);
            });
        });

        describe('getPlayerBySteamId', () => {
            it('return a player', async () => {
                const steamId64 = '76561198015512690';
                const player = await getPlayerBySteamId(lobby)(steamId64);
                assert.equal(player.steamId64, steamId64);
            });
        });

        describe('getPlayerByDiscordId', () => {
            it('return a player', async () => {
                const discordId = '76864899866697728';
                const player = await getPlayerByDiscordId(lobby)(discordId);
                assert.equal(player.discordId, discordId);
            });
        });

        describe('getNoFactionPlayers', () => {
            it('return players not on a team', async () => {
                const players = await getNoFactionPlayers()(lobby);
                assert.isEmpty(players);
            });
        });

        describe('getNotReadyPlayers', () => {
            it('return players not ready', async () => {
                const players = await getNotReadyPlayers()(lobby);
                assert.isEmpty(players);
            });
        });

        describe('getReadyPlayers', () => {
            it('return players ready', async () => {
                const players = await getReadyPlayers()(lobby);
                assert.lengthOf(players, 10);
            });
        });

        describe('mapPlayers', () => {
            it('apply a function to players', async () => {
                const players = await mapPlayers(player => player.id)(lobby);
                assert.lengthOf(players, 10);
            });
        });

        describe('removePlayer', () => {
            it('remove a lobby player', async () => {
                let players = await getPlayers()(lobby);
                assert.lengthOf(players, 10);
                const result = await removePlayer(lobby)(players[0]);
                assert.equal(result, 1);
                players = await getPlayers()(lobby);
                assert.lengthOf(players, 9);
            });
        });

        describe('addRoleToPlayers', () => {
            beforeEach(async () => {
                lobby.inhouseState = { guild };
                guild.createRole({ roleName: lobby.lobbyName });
                lobby.role = guild.roles.first();
                const players = await Lobby.getPlayers()(lobby);
                for (const player of players) {
                    const member = new Mocks.MockMember(guild);
                    member.id = player.discordId;
                    guild.members.set(member.id, member);
                }
            });

            it('add role to players', async () => {
                const players = await addRoleToPlayers(lobby);
                assert.lengthOf(players, 10);
            });

            it('return lobby when tapped', async () => {
                const result = await tapP(addRoleToPlayers)(lobby);
                assert.strictEqual(result, lobby);
            });
        });

        describe('updateLobbyPlayer', () => {
            it('update lobby player', async () => {
                const data = {
                    heroId: 1,
                    kills: 1,
                    deaths: 1,
                    assists: 1,
                    gpm: 1,
                    xpm: 1,
                };
                await updateLobbyPlayer(data)(lobby)(1);
                const player = await getPlayerByUserId(lobby)(1);
                assert.equal(player.LobbyPlayer.heroId, 1);
                assert.equal(player.LobbyPlayer.kills, 1);
                assert.equal(player.LobbyPlayer.deaths, 1);
                assert.equal(player.LobbyPlayer.assists, 1);
                assert.equal(player.LobbyPlayer.gpm, 1);
                assert.equal(player.LobbyPlayer.xpm, 1);
            });
        });

        describe('updateLobbyPlayerBySteamId', () => {
            it('update lobby player', async () => {
                const steamId64 = '76561198015512690';
                const data = {
                    heroId: 1,
                    kills: 1,
                    deaths: 1,
                    assists: 1,
                    gpm: 1,
                    xpm: 1,
                };
                await updateLobbyPlayerBySteamId(data)(lobby)(steamId64);
                const player = await getPlayerBySteamId(lobby)(steamId64);
                assert.equal(player.LobbyPlayer.heroId, 1);
                assert.equal(player.LobbyPlayer.kills, 1);
                assert.equal(player.LobbyPlayer.deaths, 1);
                assert.equal(player.LobbyPlayer.assists, 1);
                assert.equal(player.LobbyPlayer.gpm, 1);
                assert.equal(player.LobbyPlayer.xpm, 1);
            });
        });

        describe('setPlayerReady', () => {
            it('set lobby player ready false', async () => {
                await setPlayerReady(false)(lobby)(1);
                const player = await getPlayerByUserId(lobby)(1);
                assert.isFalse(player.LobbyPlayer.ready);
            });
        });

        describe('setPlayerFaction', () => {
            it('set lobby player faction', async () => {
                await setPlayerFaction(2)(lobby)(1);
                const player = await getPlayerByUserId(lobby)(1);
                assert.equal(player.LobbyPlayer.faction, 2);
            });
        });

        describe('sortQueuersAsc', () => {
            it('sort queuers by created date', async () => {
                const queuers = [
                    { id: 1, LobbyQueuer: { createdAt: 100 } },
                    { id: 2, LobbyQueuer: { createdAt: 20 } },
                    { id: 3, LobbyQueuer: { createdAt: 200 } },
                    { id: 4, LobbyQueuer: { createdAt: 75 } },
                ];
                const sortedQueuers = await sortQueuersAsc(queuers);
                assert.equal(sortedQueuers[0].id, 2);
                assert.equal(sortedQueuers[1].id, 4);
                assert.equal(sortedQueuers[2].id, 1);
                assert.equal(sortedQueuers[3].id, 3);
            });
        });

        describe('getQueuers', () => {
            it('return 10 users in the lobby queue', async () => {
                const queuers = await getQueuers()(lobby);
                assert.lengthOf(queuers, 10);
            });
        });

        describe('getActiveQueuers', () => {
            it('return 9 active users in the lobby queue', async () => {
                const queuers = await getActiveQueuers()(lobby);
                assert.lengthOf(queuers, 9);
            });
        });

        describe('getQueuerByUserId', () => {
            it('return user in the lobby queue', async () => {
                const user = await getQueuerByUserId(lobby)(1);
                assert.exists(user);
            });
        });

        describe('getQueuerBySteamId', () => {
            it('return user in the lobby queue', async () => {
                const user = await getQueuerBySteamId(lobby)('76561198015512690');
                assert.exists(user);
            });
        });

        describe('getQueuerByDiscordId', () => {
            it('return user in the lobby queue', async () => {
                const user = await getQueuerByDiscordId(lobby)('76864899866697728');
                assert.exists(user);
            });
        });

        describe('mapQueuers', () => {
            it('apply a function to queuers', async () => {
                const players = await mapQueuers(player => player.id)(lobby);
                assert.lengthOf(players, 10);
            });
        });

        describe('mapActiveQueuers', () => {
            it('apply a function to active queuers', async () => {
                const players = await mapActiveQueuers(player => player.id)(lobby);
                assert.lengthOf(players, 9);
            });
        });

        describe('hasQueuer', () => {
            it('return user in queue true', async () => {
                const user = await getQueuerByUserId(lobby)(1);
                const result = await hasQueuer(lobby)(user);
                assert.isTrue(result);
            });
        });

        describe('removeQueuer', () => {
            it('remove a lobby queuer', async () => {
                let queuers = await getPlayers()(lobby);
                assert.lengthOf(queuers, 10);
                const result = await removeQueuer(lobby)(queuers[0]);
                assert.equal(result, 1);
                queuers = await getQueuers()(lobby);
                assert.lengthOf(queuers, 9);
            });
        });

        describe('addRoleToQueuers', () => {
            beforeEach(async () => {
                lobby.inhouseState = { guild };
                guild.createRole({ roleName: lobby.lobbyName });
                lobby.role = guild.roles.first();
                const queuers = await Lobby.getQueuers()(lobby);
                for (const queuer of queuers) {
                    const member = new Mocks.MockMember(guild);
                    member.id = queuer.discordId;
                    guild.members.set(member.id, member);
                }
            });
            it('add role to queuers', async () => {
                const queuers = await addRoleToQueuers(lobby);
                assert.lengthOf(queuers, 10);
            });
        });

        describe('updateLobbyQueuer', () => {
            it('update lobby queuer', async () => {
                const data = { active: false };
                await updateLobbyQueuer(data)(lobby)(1);
                const queuer = await getQueuerByUserId(lobby)(1);
                assert.isFalse(queuer.LobbyQueuer.active);
            });
        });

        describe('updateLobbyQueuerBySteamId', () => {
            it('update lobby queuer', async () => {
                const steamId64 = '76561198015512690';
                const data = { active: false };
                await updateLobbyQueuerBySteamId(data)(lobby)(steamId64);
                const queuer = await getQueuerBySteamId(lobby)(steamId64);
                assert.isFalse(queuer.LobbyQueuer.active);
            });
        });

        describe('setQueuerActive', () => {
            it('set lobby queuer active false', async () => {
                await setQueuerActive(false)(lobby)(1);
                const queuer = await getQueuerByUserId(lobby)(1);
                assert.isFalse(queuer.LobbyQueuer.active);
            });
        });

        describe('removeUserFromQueues', () => {
            it('remove user from all queues', async () => {
                const queuer = await getQueuerByUserId(lobby)(1);
                let queues = await queuer.getQueues();
                assert.lengthOf(queues, 2);
                await removeUserFromQueues(queuer);
                queues = await queuer.getQueues();
                assert.isEmpty(queues);
            });
        });

        describe('removeQueuers', () => {
            it('remove user from all queues', async () => {
                let queuers = await lobby.getQueuers();
                assert.isNotEmpty(queuers);
                await removeQueuers(lobby);
                queuers = await lobby.getQueuers();
                assert.isEmpty(queuers);
            });
        });

        describe('calcBalanceTeams', () => {
            it('balance teams', async () => {
                const players = await getPlayers()(lobby);
                const teams = await calcBalanceTeams(player => player.rankTier)(players);
                assert.lengthOf(teams, 2);
                assert.lengthOf(teams[0], 5);
                assert.lengthOf(teams[1], 5);
            });

            it('balance teams', async () => {
                const players = [
                    { rankTier: 1 },
                    { rankTier: 2 },
                    { rankTier: 3 },
                    { rankTier: 4 },
                    { rankTier: 5 },
                    { rankTier: 6 },
                    { rankTier: 7 },
                    { rankTier: 8 },
                    { rankTier: 9 },
                    { rankTier: 10 },
                ];
                const teams = await calcBalanceTeams(player => player.rankTier)(players);
                assert.lengthOf(teams, 2);
                assert.lengthOf(teams[0], 5);
                assert.lengthOf(teams[1], 5);
                assert.equal(Math.abs(teams[0].reduce((total, player) => total + player.rankTier, 0) - teams[1].reduce((total, player) => total + player.rankTier, 0)), 1);
            });
        });

        describe('setTeams', () => {
            it('set player factions', async () => {
                let players = await getPlayers()(lobby);
                assert.lengthOf(players, 10);
                team_1 = players.slice(5);
                team_2 = players.slice(0, 5);
                const result = await setTeams(lobby)([team_1, team_2]);
                players = await getPlayers()(lobby);
                assert.lengthOf(players, 10);
                assert.equal(players[0].LobbyPlayer.faction, 2);
                assert.equal(players[1].LobbyPlayer.faction, 2);
                assert.equal(players[2].LobbyPlayer.faction, 2);
                assert.equal(players[3].LobbyPlayer.faction, 2);
                assert.equal(players[4].LobbyPlayer.faction, 2);
                assert.equal(players[5].LobbyPlayer.faction, 1);
                assert.equal(players[6].LobbyPlayer.faction, 1);
                assert.equal(players[7].LobbyPlayer.faction, 1);
                assert.equal(players[8].LobbyPlayer.faction, 1);
                assert.equal(players[9].LobbyPlayer.faction, 1);
            });
        });

        describe('selectCaptainPairFromTiers', () => {
            const playerRatingFunction = player => player.rankTier;

            it('return an empty array when tiers empty', async () => {
                const captains = selectCaptainPairFromTiers(0)(playerRatingFunction)({});
                assert.isEmpty(captains);
            });

            it('return an empty array when captains not within threshold', async () => {
                const tiers = { 0: [{ rankTier: 0 }, { rankTier: 1 }] };
                const captains = selectCaptainPairFromTiers(0)(playerRatingFunction)(tiers);
                assert.isEmpty(captains);
            });

            it('return a captain pair', async () => {
                const tiers = { 0: [{ rankTier: 0 }, { rankTier: 1 }] };
                const captains = selectCaptainPairFromTiers(1)(playerRatingFunction)(tiers);
                assert.lengthOf(captains, 2);
            });

            it('return a tier 1 captain pair when tier 0 exceeds threshold', async () => {
                const tiers = {
                    0: [{ rankTier: 0 }, { rankTier: 1 }],
                    1: [{ rankTier: 10 }, { rankTier: 10 }],
                };
                const captains = selectCaptainPairFromTiers(0)(playerRatingFunction)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rankTier, 10);
            });

            it('return a tier 1 captain pair when tier 0 empty', async () => {
                const tiers = {
                    0: [],
                    1: [{ rankTier: 10 }, { rankTier: 10 }],
                };
                const captains = selectCaptainPairFromTiers(0)(playerRatingFunction)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rankTier, 10);
            });

            it('return a tier 0 captain pair when 2 in tier 0', async () => {
                const tiers = {
                    0: [{ rankTier: 0 }, { rankTier: 0 }],
                    1: [{ rankTier: 10 }, { rankTier: 10 }],
                };
                const captains = selectCaptainPairFromTiers(0)(playerRatingFunction)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rankTier, 0);
            });

            it('return a tier 0 captain pair when 3 in tier 0', async () => {
                const tiers = {
                    0: [{ rankTier: 0 }, { rankTier: 1 }, { rankTier: 1 }],
                    1: [{ rankTier: 10 }, { rankTier: 10 }],
                };
                const captains = selectCaptainPairFromTiers(0)(playerRatingFunction)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rankTier, 1);
            });
        });

        describe('sortPlayersByCaptainPriority', () => {
            it('return tiers object', async () => {
                const playersWithCaptainPriority = [
                    [{ id: 1 }, 0],
                    [{ id: 2 }, 0],
                    [{ id: 3 }, 1],
                    [{ id: 4 }, 1],
                    [{ id: 5 }, 2],
                    [{ id: 6 }, 1],
                    [{ id: 7 }, Infinity],
                ];
                const tiers = sortPlayersByCaptainPriority(playersWithCaptainPriority);
                assert.hasAllKeys(tiers, ['0', '1', '2']);
                assert.lengthOf(tiers['0'], 2);
                assert.lengthOf(tiers['1'], 3);
                assert.lengthOf(tiers['2'], 1);
            });
        });

        describe('roleToCaptainPriority', () => {
            it('return 0', async () => {
                const regexp = new RegExp('Tier ([0-9]+) Captain');
                const priority = roleToCaptainPriority(regexp)({ name: 'Tier 0 Captain' });
                assert.equal(priority, 0);
            });

            it('return 10', async () => {
                const regexp = new RegExp('Tier ([0-9]+) Captain');
                const priority = roleToCaptainPriority(regexp)({ name: 'Tier 10 Captain' });
                assert.equal(priority, 10);
            });

            it('return undefined', async () => {
                const regexp = new RegExp('Tier ([0-9]+) Captain');
                const priority = roleToCaptainPriority(regexp)({ name: 'Tier A Captain' });
                assert.isNull(priority);
            });
        });

        describe('getCaptainPriorityFromRoles', () => {
            it('return 0', async () => {
                const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                const priority = getCaptainPriorityFromRoles(captainRoleRegexp, roles);
                assert.equal(priority, 0);
            });

            it('return Infinity when no tier roles', async () => {
                const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                const roles = [{ name: 'Tier X Captain' }, { name: 'Inhouse Player' }];
                const priority = getCaptainPriorityFromRoles(captainRoleRegexp, roles);
                assert.equal(priority, Infinity);
            });

            it('return Infinity when no roles', async () => {
                const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                const roles = [];
                const priority = getCaptainPriorityFromRoles(captainRoleRegexp, roles);
                assert.equal(priority, Infinity);
            });
        });

        describe('Uses getUserRoles', () => {
            let getRoles;
            let getUserRoles;

            beforeEach(async () => {
                getRoles = sinon.stub();
                getUserRoles = sinon.stub(Guild, 'getUserRoles');
                getUserRoles.callsFake(guild => getRoles);
            });

            afterEach(async () => {
                Guild.getUserRoles.restore();
            });

            describe('playerToCaptainPriority', () => {
                it('return player with captain priority 0 from roles', async () => {
                    const guild = 'guild';
                    const user = 'user';
                    const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                    const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(user).resolves(roles);
                    const [player, priority] = await playerToCaptainPriority(guild)(captainRoleRegexp)(user);
                    assert.isTrue(getRoles.calledOnceWith(user));
                    assert.equal(player, user);
                    assert.equal(priority, 0);
                });

                it('return player with captain priority Infinity from no matching roles', async () => {
                    const guild = 'guild';
                    const user = 'user';
                    const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                    const roles = [{ name: 'Tier X Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(user).resolves(roles);
                    const [player, priority] = await playerToCaptainPriority(guild)(captainRoleRegexp)(user);
                    assert.isTrue(getRoles.calledOnceWith(user));
                    assert.equal(player, user);
                    assert.equal(priority, Infinity);
                });

                it('return player with captain priority Infinity from no roles', async () => {
                    const guild = 'guild';
                    const user = 'user';
                    const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                    const roles = [];
                    getRoles.withArgs(user).resolves(roles);
                    const [player, priority] = await playerToCaptainPriority(guild)(captainRoleRegexp)(user);
                    assert.isTrue(getRoles.calledOnceWith(user));
                    assert.equal(player, user);
                    assert.equal(priority, Infinity);
                });
            });

            describe('getPlayersWithCaptainPriority', () => {
                it('return players with captain priority from roles', async () => {
                    const guild = 'guild';
                    const user = 'user';
                    const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                    const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(sinon.match.any).resolves([]).withArgs(sinon.match.has('id', 1)).resolves(roles);
                    const players = await getPlayersWithCaptainPriority(guild)(captainRoleRegexp)(lobby);
                    assert.equal(getRoles.callCount, 10);
                    players.forEach(([player, priority]) => {
                        if (player.id === 1) {
                            assert.equal(priority, 0);
                        }
                        else {
                            assert.equal(priority, Infinity);
                        }
                    });
                });
            });

            describe('getActiveQueuersWithCaptainPriority', () => {
                it('return actively queuing players with captain priority', async () => {
                    const guild = 'guild';
                    const user = 'user';
                    const captainRoleRegexp = 'Tier ([0-9]+) Captain';
                    const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(sinon.match.any).resolves([]).withArgs(sinon.match.has('id', 1)).resolves(roles);
                    const queuers = await getActiveQueuersWithCaptainPriority(guild)(captainRoleRegexp)(lobby);
                    assert.lengthOf(queuers, 9);
                    assert.equal(getRoles.callCount, 9);
                    queuers.forEach(([player, priority]) => {
                        if (player.id === 1) {
                            assert.equal(priority, 0);
                        }
                        else {
                            assert.equal(priority, Infinity);
                        }
                    });
                });
            });

            describe('checkQueueForCaptains', () => {
                it('return an empty array', async () => {
                    const guild = 'guild';
                    const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(sinon.match.any).resolves([]).withArgs(sinon.match.has('id', 1)).resolves(roles);
                    lobby.inhouseState = {
                        guild,
                        captainRoleRegexp: 'Tier ([0-9]+) Captain',
                        captainRankThreshold: 1000,
                    };
                    const captains = await checkQueueForCaptains(lobby);
                    assert.isEmpty(captains);
                });

                it('return captain pair', async () => {
                    const guild = 'guild';
                    const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(sinon.match.any).resolves([]).withArgs(sinon.match.has('id', 1).or(sinon.match.has('id', 3))).resolves(roles);
                    lobby.inhouseState = {
                        guild,
                        captainRoleRegexp: 'Tier ([0-9]+) Captain',
                        captainRankThreshold: 1000,
                    };
                    const captains = await checkQueueForCaptains(lobby);
                    assert.lengthOf(captains, 2);
                    assert.isTrue((captains[0].id === 1 && captains[1].id === 3) || (captains[0].id === 3 && captains[1].id === 1));
                });
            });

            describe('assignCaptains', () => {
                it('return an empty array', async () => {
                    const guild = 'guild';
                    const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(sinon.match.any).resolves([]).withArgs(sinon.match.has('id', 1)).resolves(roles);
                    lobby.inhouseState = {
                        guild,
                        captainRoleRegexp: 'Tier ([0-9]+) Captain',
                        captainRankThreshold: 1000,
                    };
                    const captains = await assignCaptains(lobby);
                    assert.isEmpty(captains);
                });

                it('return captain pair', async () => {
                    const guild = 'guild';
                    const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                    getRoles.withArgs(sinon.match.any).resolves([]).withArgs(sinon.match.has('id', 1).or(sinon.match.has('id', 3))).resolves(roles);
                    lobby.inhouseState = {
                        guild,
                        captainRoleRegexp: 'Tier ([0-9]+) Captain',
                        captainRankThreshold: 1000,
                    };
                    const captains = await assignCaptains(lobby);
                    assert.lengthOf(captains, 2);
                    assert.isTrue((captains[0].id === 1 && captains[1].id === 3) || (captains[0].id === 3 && captains[1].id === 1));
                });
            });
        });

        describe('calcDefaultGameMode', () => {
            it('return default game mode when empty', async () => {
                const gameModePreferences = [];
                const gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(gameModePreferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
            });

            it('return default game mode when tied 1', async () => {
                const game_mode_preferences = [
                    CONSTANTS.DOTA_GAMEMODE_CM,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                ];
                let gameMode;
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CM);
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
            });

            it('return default game mode when tied 2', async () => {
                const game_mode_preferences = [
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_CM,
                    CONSTANTS.DOTA_GAMEMODE_CM,
                    CONSTANTS.DOTA_GAMEMODE_AP,
                    CONSTANTS.DOTA_GAMEMODE_AP,
                ];
                let gameMode;
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CM);
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_AP)(game_mode_preferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_AP);
            });

            it('return only game mode', async () => {
                const gameModePreferences = [CONSTANTS.DOTA_GAMEMODE_CD];
                const gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(gameModePreferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
            });

            it('return most game mode', async () => {
                const gameModePreferences = [
                    CONSTANTS.DOTA_GAMEMODE_CM,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_AP,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_AP,
                ];
                let gameMode;
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(gameModePreferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_AP)(gameModePreferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
                gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(gameModePreferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
        });

        describe('autoBalanceTeams', () => {
            it('set teams using rankTier', async () => {
                let players = await getPlayers()(lobby);
                assert.lengthOf(players, 10);
                for (const player of players) {
                    await setPlayerFaction(0)(lobby)(player.id);
                }
                players = await getPlayers()(lobby);
                players.forEach(player => assert.equal(player.LobbyPlayer.faction, 0));
                await autoBalanceTeams(player => player.rankTier)(lobby);
                players = await getPlayers()(lobby);
                let team_1_count = 0;
                let team_2_count = 0;
                for (const player of players) {
                    if (player.LobbyPlayer.faction == 1) {
                        team_1_count++;
                    }
                    else if (player.LobbyPlayer.faction == 2) {
                        team_2_count++;
                    }
                }
                assert.equal(team_1_count, 5);
                assert.equal(team_2_count, 5);
            });

            it('set teams using rating', async () => {
                let players = await getPlayers()(lobby);
                assert.lengthOf(players, 10);
                for (const player of players) {
                    await setPlayerFaction(0)(lobby)(player.id);
                }
                players = await getPlayers()(lobby);
                players.forEach(player => assert.equal(player.LobbyPlayer.faction, 0));
                await autoBalanceTeams(player => player.rating)(lobby);
                players = await getPlayers()(lobby);
                let team_1_count = 0;
                let team_2_count = 0;
                for (const player of players) {
                    if (player.LobbyPlayer.faction == 1) {
                        team_1_count++;
                    }
                    else if (player.LobbyPlayer.faction == 2) {
                        team_2_count++;
                    }
                }
                assert.equal(team_1_count, 5);
                assert.equal(team_2_count, 5);
            });
        });

        describe('getDefaultGameMode', () => {
            it('return only game mode', async () => {
                const gameModePreferences = [CONSTANTS.DOTA_GAMEMODE_CD];
                const gameMode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(gameModePreferences);
                assert.equal(gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
        });

        describe('assignGameMode', () => {
            it('return game mode preferred by lobby players', async () => {
                lobby.inhouseState = {};
                assert.equal(lobby.gameMode, CONSTANTS.DOTA_GAMEMODE_CM);
                const lobbyState = await assignGameMode(lobby);
                assert.equal(lobbyState.gameMode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
        });

        describe('getDraftingFaction', () => {
            it('return 0 when all players have a team', async () => {
                const draftOrder = 'ABBABAAB';
                const faction = await getDraftingFaction(draftOrder)(lobby);
                assert.equal(faction, 0);
            });

            it('return 1 when on first pick', async () => {
                const draftOrder = 'ABBABAAB';
                let faction = await getDraftingFaction(draftOrder)(lobby);
                const players = await lobby.getPlayers();
                players.forEach(player => player.LobbyPlayer = { faction: 0 });
                players[0].LobbyPlayer = { faction: 1 };
                players[1].LobbyPlayer = { faction: 2 };
                await lobby.setPlayers(players, { through: { faction: 0 } });
                const noTeam = await lobby.getNoFactionPlayers();
                assert.equal(noTeam.length, 8);
                await lobby.update({ playerFirstPick: 1 });
                faction = await getDraftingFaction(draftOrder)(lobby);
                assert.equal(faction, 1);
            });

            it('return 2 when on last pick', async () => {
                const draftOrder = 'ABBABAAB';
                let faction = await getDraftingFaction(draftOrder)(lobby);
                const players = await lobby.getPlayers();
                players[0].LobbyPlayer.faction = 0;
                await players[0].LobbyPlayer.save();
                const noTeam = await lobby.getNoFactionPlayers();
                assert.equal(noTeam.length, 1);
                await lobby.update({ playerFirstPick: 1 });
                faction = await getDraftingFaction(draftOrder)(lobby);
                assert.equal(faction, 2);
            });
        });

        describe('getFactionCaptain', () => {
            it('return null when faction 0', async () => {
                const captain = await getFactionCaptain(lobby)(0);
                assert.isNull(captain);
            });

            it('return captain 1 when faction 1', async () => {
                const captain = await getFactionCaptain(lobby)(1);
                assert.equal(lobby.captain1UserId, captain.id);
            });

            it('return captain 2 when faction 2', async () => {
                const captain = await getFactionCaptain(lobby)(2);
                assert.equal(lobby.captain2UserId, captain.id);
            });
        });

        describe('isPlayerDraftable', () => {
            it('return INVALID_DRAFT_CAPTAIN when player is captain 1', async () => {
                const player = await getPlayerByUserId(lobby)(lobby.captain1UserId);
                const result = await isPlayerDraftable(lobby)(player);
                assert.equal(result, CONSTANTS.INVALID_DRAFT_CAPTAIN);
            });

            it('return INVALID_DRAFT_CAPTAIN when player is captain 2', async () => {
                const player = await getPlayerByUserId(lobby)(lobby.captain2UserId);
                const result = await isPlayerDraftable(lobby)(player);
                assert.equal(result, CONSTANTS.INVALID_DRAFT_CAPTAIN);
            });

            it('return INVALID_DRAFT_PLAYER when player is on a team', async () => {
                const players = await lobby.getFaction1Players();
                const nonCaptainPlayers = players.filter(player => player.id !== lobby.captain1UserId && player.id !== lobby.captain2UserId);
                const result = await isPlayerDraftable(lobby)(nonCaptainPlayers[0]);
                assert.equal(result, CONSTANTS.INVALID_DRAFT_PLAYER);
            });

            it('return PLAYER_DRAFTED when player is not on a team', async () => {
                const players = await lobby.getPlayers();
                players[1].LobbyPlayer.faction = 0;
                await players[1].LobbyPlayer.save();
                const result = await isPlayerDraftable(lobby)(players[1]);
                assert.equal(result, CONSTANTS.PLAYER_DRAFTED);
            });
        });

        describe('isCaptain', () => {
            it('return true when user is captain 1', async () => {
                const player = await getPlayerByUserId(lobby)(lobby.captain1UserId);
                const result = isCaptain(lobby)(player);
                assert.isTrue(result);
            });

            it('return true when user is captain 2', async () => {
                const player = await getPlayerByUserId(lobby)(lobby.captain2UserId);
                const result = isCaptain(lobby)(player);
                assert.isTrue(result);
            });

            it('return false when user is not a captain', async () => {
                const player = await getPlayerByUserId(lobby)(2);
                const result = isCaptain(lobby)(player);
                assert.isFalse(result);
            });
        });

        describe('formatNameForLobby', () => {
            it('return alphanumeric characters', async () => {
                const result = formatNameForLobby('te-st_1-2-3');
                assert.equal(result, 'test123');
            });

            it('return max length 15 characters', async () => {
                const result = formatNameForLobby('te-st_1-2-3abcdefghijklmnopqrstuvwxyz');
                assert.equal(result, 'test123abcdefgh');
            });
        });

        describe('getLobbyNameFromCaptains', () => {
            it('return combined lobby name', async () => {
                const result = await getLobbyNameFromCaptains('te-st_1-2-3', 'te-st_4-5-6', 1);
                assert.equal(result, 'test123-test456-1');
            });

            it('return combined lobby name with counter 2', async () => {
                const result = await getLobbyNameFromCaptains('te-st_1-2-3', 'te-st_4-5-6', 2);
                assert.equal(result, 'test123-test456-3');
            });
        });

        describe('resetLobbyState', () => {
            it('set STATE_CHECKING_READY state to STATE_BEGIN_READY', async () => {
                lobby.state = CONSTANTS.STATE_CHECKING_READY;
                const lobbyState = await resetLobbyState({ state: lobby.state, id: lobby.id });
                assert.equal(lobbyState.state, CONSTANTS.STATE_BEGIN_READY);
                lobby = await getLobby({ id: lobby.id });
                assert.equal(lobby.state, CONSTANTS.STATE_BEGIN_READY);
            });

            it('set STATE_BOT_STARTED state to STATE_WAITING_FOR_BOT', async () => {
                lobby.state = CONSTANTS.STATE_BOT_STARTED;
                const lobbyState = await resetLobbyState({ state: lobby.state, id: lobby.id });
                assert.equal(lobbyState.state, CONSTANTS.STATE_WAITING_FOR_BOT);
                lobby = await getLobby({ id: lobby.id });
                assert.equal(lobby.state, CONSTANTS.STATE_WAITING_FOR_BOT);
            });

            it('set STATE_WAITING_FOR_PLAYERS state to STATE_WAITING_FOR_BOT', async () => {
                lobby.state = CONSTANTS.STATE_WAITING_FOR_PLAYERS;
                const lobbyState = await resetLobbyState({ state: lobby.state, id: lobby.id });
                assert.equal(lobbyState.state, CONSTANTS.STATE_WAITING_FOR_BOT);
                lobby = await getLobby({ id: lobby.id });
                assert.equal(lobby.state, CONSTANTS.STATE_WAITING_FOR_BOT);
            });

            it('set null state to STATE_NEW', async () => {
                lobby.state = null;
                const lobbyState = await resetLobbyState({ state: lobby.state, id: lobby.id });
                assert.equal(lobbyState.state, CONSTANTS.STATE_NEW);
                lobby = await getLobby({ id: lobby.id });
                assert.equal(lobby.state, CONSTANTS.STATE_NEW);
            });
        });

        describe('setupLobbyBot', () => {
            it('setup bot and dota lobby', async () => {
            });
        });

        describe('isReadyCheckTimedOut', () => {
            it('return true', async () => {
                const result = isReadyCheckTimedOut({
                    inhouseState: { readyCheckTimeout: 0 },
                    readyCheckTime: Date.now() - 100,
                });
                assert.isTrue(result);
            });
            it('return false', async () => {
                const result = isReadyCheckTimedOut({
                    inhouseState: { readyCheckTimeout: 1000 },
                    readyCheckTime: Date.now(),
                });
                assert.isFalse(result);
            });
        });

        describe('createLobbyState', () => {
            it('return lobbyState object', async () => {
                const lobbyState = {
                    inhouseState: {
                        guild: 'guild',
                        category: 'category',
                        readyCheckTimeout: 'readyCheckTimeout',
                        captainRankThreshold: 'captainRankThreshold',
                        captainRoleRegexp: 'captainRoleRegexp',
                        defaultGameMode: 'cm',
                        matchmakingSystem: 'elo',
                        leagueid: 1,
                        readyCheckTime: 'readyCheckTime',
                    },
                    channel: { id: 'channel' },
                    role: { id: 'role' },
                    state: 'state',
                    botId: 'botId',
                    queueType: 'queueType',
                    lobbyName: 'lobbyName',
                    dotaLobbyId: 'dotaLobbyId',
                    password: 'password',
                    captain1UserId: 'captain1UserId',
                    captain2UserId: 'captain2UserId',
                    matchId: 'matchId',
                };
                const result = createLobbyState(lobbyState)({ channel: lobbyState.channel, role: lobbyState.role })(lobbyState);
                lobbyState.channelId = 'channel';
                lobbyState.roleId = 'role';
                assert.deepEqual(result, lobbyState);
            });
        });

        describe('lobbyToLobbyState', () => {
            it('return lobbyState', async () => {
                const lobbyState = await lobbyToLobbyState({
                    guild,
                    category: 'category',
                    readyCheckTimeout: 'readyCheckTimeout',
                    captainRankThreshold: 'captainRankThreshold',
                    captainRoleRegexp: 'captainRoleRegexp',
                    defaultGameMode: 'defaultGameMode',
                    matchmakingSystem: 'matchmakingSystem',
                    leagueid: 123,
                })(lobby);
                assert.exists(lobbyState);
            });

            it('throws when rejects', async () => {
                await assert.isRejected(lobbyToLobbyState({
                    guild: { roles: { get: sinon.spy() } },
                    category: 'category',
                    readyCheckTimeout: 'readyCheckTimeout',
                    captainRankThreshold: 'captainRankThreshold',
                    captainRoleRegexp: 'captainRoleRegexp',
                })(lobby));
            });
        });

        describe('forceLobbyDraft', () => {
            it('set lobbyState to draft', async () => {
                const lobbyState = {
                    state: CONSTANTS.STATE_ASSIGNING_CAPTAINS,
                    botId: 1,
                    dotaBot: { disconnect: sinon.spy() },
                };
                const result = await forceLobbyDraft(lobbyState, { id: 1 }, { id: 2 });
                chai.assert.equal(result.captain1UserId, 1);
                chai.assert.equal(result.captain2UserId, 2);
            });

            it('do not set lobbyState to draft', async () => {
                const lobbyState = {
                    state: CONSTANTS.STATE_NEW,
                    botId: 1,
                    dotaBot: { disconnect: sinon.spy() },
                };
                const result = await forceLobbyDraft(lobbyState, { id: 1 }, { id: 2 });
                chai.assert.notExists(result.captain1UserId, 1);
                chai.assert.notExists(result.captain2UserId, 2);
                chai.assert.equal(result.botId, 1);
                chai.assert.isFalse(result.dotaBot.disconnect.calledOnce);
            });
        });
    });
});

describe('Database - no lobby players', () => {
    beforeEach((done) => {
        guild = new Mocks.MockGuild();
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

    describe('Lobby Functions', () => {
        let lobby;
        beforeEach(async () => {
            lobby = await getLobby({ id });
        });

        describe('getPlayers', () => {
            it('return 0 players in the lobby', async () => {
                const players = await getPlayers()(lobby);
                assert.isEmpty(players);
            });
        });

        describe('addPlayer', () => {
            it('add player to lobby', async () => {
                const user = await db.User.findOne({ where: { id: 1 } });
                const result = await addPlayer(lobby)(user);
                assert.lengthOf(result, 1);
                const players = await getPlayers()(lobby);
                assert.lengthOf(players, 1);
            });
        });

        describe('addPlayers', () => {
            it('add players to lobby', async () => {
                const users = await db.User.findAll({ limit: 10 });
                const result = await addPlayers(lobby)(users);
                assert.lengthOf(result, 10);
                const players = await getPlayers()(lobby);
                assert.lengthOf(players, 10);
            });
        });

        describe('addQueuer', () => {
            it('add user to queue', async () => {
                const user = await db.User.findOne({ where: { id: 1 } });
                const result = await addQueuer(lobby)(user);
                assert.lengthOf(result, 1);
                const queuers = await getQueuers()(lobby);
                assert.lengthOf(queuers, 1);
            });
        });

        describe('addQueuers', () => {
            it('add users to queue', async () => {
                const users = await db.User.findAll({ limit: 10 });
                const result = await addQueuers(lobby)(users);
                assert.lengthOf(result, 10);
                const queuers = await getQueuers()(lobby);
                assert.lengthOf(queuers, 10);
            });
        });

        describe('lobbyQueuerToPlayer', () => {
            it('convert queuer to player and set queue activity', async () => {
                const lobby2 = await getLobby({ id: 2 });
                const user = await db.User.findOne({ where: { id: 1 } });
                const result = await addQueuer(lobby)(user);
                await addQueuer(lobby2)(user);
                let queues = await user.getQueues();
                assert.lengthOf(queues, 2);
                assert.isTrue(queues[0].LobbyQueuer.active);
                assert.isTrue(queues[1].LobbyQueuer.active);
                assert.lengthOf(result, 1);
                let players = await getPlayers()(lobby);
                assert.isEmpty(players);
                await lobbyQueuerToPlayer(lobby)(user);
                players = await getPlayers()(lobby);
                assert.lengthOf(players, 1);
                assert.equal(players[0].id, user.id);
                queues = await user.getQueues();
                assert.lengthOf(queues, 2);
                assert.isFalse(queues[0].LobbyQueuer.active);
                assert.isFalse(queues[1].LobbyQueuer.active);
            });
        });

        describe('returnPlayerToQueue', () => {
            it('convert queue back to player and set activity', async () => {
                const lobby2 = await getLobby({ id: 2 });
                const user = await db.User.findOne({ where: { id: 1 } });
                const result = await addQueuer(lobby)(user);
                await addQueuer(lobby2)(user);
                let queues = await user.getQueues();
                assert.lengthOf(queues, 2);
                assert.isTrue(queues[0].LobbyQueuer.active);
                assert.isTrue(queues[1].LobbyQueuer.active);
                assert.lengthOf(result, 1);
                let players = await getPlayers()(lobby);
                assert.isEmpty(players);
                await lobbyQueuerToPlayer(lobby)(user);
                players = await getPlayers()(lobby);
                assert.lengthOf(players, 1);
                assert.equal(players[0].id, user.id);
                queues = await user.getQueues();
                assert.lengthOf(queues, 2);
                assert.isFalse(queues[0].LobbyQueuer.active);
                assert.isFalse(queues[1].LobbyQueuer.active);
                await returnPlayerToQueue(lobby)(user);
                players = await getPlayers()(lobby);
                assert.isEmpty(players);
                queues = await user.getQueues();
                assert.lengthOf(queues, 2);
                assert.isTrue(queues[0].LobbyQueuer.active);
                assert.isTrue(queues[1].LobbyQueuer.active);
            });
        });

        describe('returnPlayersToQueue', () => {
            // TODO
        });

        describe('LobbyQueueHandlers', () => {
            let lobbyState;
            beforeEach(async () => {
                lobbyState = await lobbyToLobbyState({
                    guild,
                    category: 'category',
                    readyCheckTimeout: 'readyCheckTimeout',
                    captainRankThreshold: 'captainRankThreshold',
                    captainRoleRegexp: 'captainRoleRegexp',
                })(lobby);
            });

            describe('QUEUE_TYPE_DRAFT', () => {
                let lobbyQueueHandlers;
                beforeEach(async () => {
                    sinon.stub(Lobby, 'checkQueueForCaptains');
                    lobbyQueueHandlers = Object.assign({},
                        LobbyQueueHandlers({ Db, Lobby }),
                        MessageListeners({ Db, Guild, Lobby, MatchTracker, Ihl }));
                });

                afterEach(async () => {
                    Lobby.checkQueueForCaptains.restore();
                });

                it('nothing when less than 10 queuers', async () => {
                    const result = await lobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_DRAFT](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                });

                it('nothing when no suitable captains', async () => {
                    const users = await db.User.findAll({ limit: 10 });
                    await addQueuers(lobby)(users);
                    Lobby.checkQueueForCaptains.resolves([]);
                    const result = await lobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_DRAFT](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                    assert.isTrue(Lobby.checkQueueForCaptains.calledOnce);
                });

                it('pop queue when at least 10 players and suitable captains', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users);
                    let queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 11);
                    Lobby.checkQueueForCaptains.resolves([users[0], users[1]]);
                    let players = await getPlayers()(lobby);
                    assert.isEmpty(players);
                    const result = await lobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_DRAFT](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_BEGIN_READY);
                    assert.isTrue(Lobby.checkQueueForCaptains.calledOnce);
                    assert.equal(result.captain1UserId, users[0].id);
                    assert.equal(result.captain2UserId, users[1].id);
                    players = await getPlayers()(lobby);
                    assert.lengthOf(players, 10);
                    queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 1);
                    const lobbies = await queuers[0].getLobbies();
                    assert.isEmpty(lobbies);
                });
            });

            describe('QUEUE_TYPE_AUTO', () => {
                it('nothing when less than 10 queuers', async () => {
                    const result = await LobbyQueueHandlers({ Db, Guild, Lobby })[CONSTANTS.QUEUE_TYPE_AUTO](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                });

                it('pop queue when at least 10 players', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users);
                    let queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 11);
                    let players = await getPlayers()(lobby);
                    assert.isEmpty(players);
                    const result = await LobbyQueueHandlers({ Db, Guild, Lobby })[CONSTANTS.QUEUE_TYPE_AUTO](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_BEGIN_READY);
                    players = await getPlayers()(lobby);
                    assert.lengthOf(players, 10);
                    queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 1);
                    const lobbies = await queuers[0].getLobbies();
                    assert.isEmpty(lobbies);
                });
            });

            describe('QUEUE_TYPE_CHALLENGE', () => {
                it('kill lobby when missing captain', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users.slice(0, 9));
                    lobbyState.captain1UserId = users[0].id;
                    lobbyState.captain2UserId = users[10].id;
                    const result = await LobbyQueueHandlers({ Db, Guild, Lobby })[CONSTANTS.QUEUE_TYPE_CHALLENGE](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_PENDING_KILL);
                    const queuers = await getQueuers()(lobbyState);
                    assert.isEmpty(queuers);
                });

                it('nothing when captain queuer inactive', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users.slice(0, 9));
                    lobbyState.captain1UserId = users[0].id;
                    lobbyState.captain2UserId = users[1].id;
                    const queues = await users[0].getQueues();
                    for (const queue of queues) {
                        queue.LobbyQueuer.active = false;
                        await queue.LobbyQueuer.save();
                    }
                    const result = await LobbyQueueHandlers({ Db, Guild, Lobby })[CONSTANTS.QUEUE_TYPE_CHALLENGE](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                });

                it('pop queue when at least 10 players and captains exist', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users);
                    lobbyState.captain1UserId = users[0].id;
                    lobbyState.captain2UserId = users[1].id;
                    const result = await LobbyQueueHandlers({ Db, Guild, Lobby })[CONSTANTS.QUEUE_TYPE_CHALLENGE](lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_BEGIN_READY);
                    assert.equal(result.captain1UserId, users[0].id);
                    assert.equal(result.captain2UserId, users[1].id);
                    players = await getPlayers()(lobby);
                    assert.lengthOf(players, 10);
                    queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 1);
                    const lobbies = await queuers[0].getLobbies();
                    assert.isEmpty(lobbies);
                });
            });
        });

        describe('removeLobbyPlayersFromQueues', () => {
            // TODO
        });

        describe('LobbyStateTransitions', () => {
            // TODO
        });

        describe('assignLobbyName', () => {
            it('nothing when QUEUE_TYPE_CHALLENGE', async () => {
                const lobbyState = { id, lobbyName, queueType: CONSTANTS.QUEUE_TYPE_CHALLENGE, inhouseState: { lobbyNameTemplate: 'Inhouse Lobby ${lobbyId}' } };
                const result = await assignLobbyName(lobbyState);
                assert.equal(result.lobbyName, 'inhouse-lobby-1');
            });

            it('return renamed lobby state', async () => {
                const lobbyState = { id, lobbyName, inhouseState: { lobbyNameTemplate: 'Inhouse Lobby ${lobbyId}' } };
                const result = await assignLobbyName(lobbyState);
                assert.notEqual(lobbyState.lobbyName, result.lobbyName);
                const lobby2 = await getLobby({ id: result.id });
                assert.exists(lobby2);
            });
        });

        describe('runLobby', () => {
            it('run lobby state', async () => {
                // TODO
            });
        });

        describe('isMessageFromLobby', () => {
            // TODO
        });
    });
});
