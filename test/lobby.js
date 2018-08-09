const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const db = require('../models');
const {
    getLobby,
    getPlayers,
    getPlayerByUserId,
    getPlayerBySteamId,
    getPlayerByDiscordId,
    getNoTeamPlayers,
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
    setPlayerTeam,
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
    disconnectDotaBot,
    createDotaBotLobby,
    setupLobbyBot,
    killLobby,
    isReadyCheckTimedOut,
    startLobby,
    createLobbyState,
    lobbyToLobbyState,
    forceLobbyDraft,
    lobbyQueuerToPlayer,
    returnPlayerToQueue,
    returnPlayersToQueue,
    LobbyQueueHandlers,
    removeLobbyPlayersFromQueues,
    LobbyStateTransitions,
    transitionLobbyState,
    assignLobbyName,
    renameLobbyChannel,
    renameLobbyRole,
    LobbyStateHandlers,
    runLobby,
} = proxyquire('../lib/lobby', {
    './dotaBot': {
        isDotaLobbyReady: () => true,
    },
    './guild': require('../lib/guildStub'),
});
const {
    tapP,
} = require('../lib/util/fp');
const CONSTANTS = require('../lib/constants');

const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

describe('Database - with lobby players', () => {
    let sandbox = null;

    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-lobbyplayers.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-lobbyqueuers.js')),
        ],
        { logging: false },
    );

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });

    const lobby_name = 'funny-yak-74';
    
    describe('getLobby', () => {
        it('return a Lobby given a { lobby_name }', async () => {
            const lobby = await getLobby({ lobby_name });
            assert.equal(lobby.lobby_name, lobby_name);
        });
    
        it('return a Lobby given a Lobby db model', async () => {
            const lobby = await getLobby(await getLobby({ lobby_name: lobby_name }));
            assert.equal(lobby.lobby_name, lobby_name);
        });
    });
    
    describe('Lobby Functions', () => {
        let lobby;
        beforeEach(async () => {
            lobby = await getLobby({ lobby_name });
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
                const steamid_64 = '76561198015512690';
                const player = await getPlayerBySteamId(lobby)(steamid_64);
                assert.equal(player.steamid_64, steamid_64);
            });
        });

        describe('getPlayerByDiscordId', () => {
            it('return a player', async () => {
                const discord_id = '76864899866697728';
                const player = await getPlayerByDiscordId(lobby)(discord_id);
                assert.equal(player.discord_id, discord_id);
            });
        });

        describe('getNoTeamPlayers', () => {
            it('return players not on a team', async () => {
                const players = await getNoTeamPlayers()(lobby);
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
                    hero_id: 1,
                    kills: 1,
                    deaths: 1,
                    assists: 1,
                    gpm: 1,
                    xpm: 1,
                }
                await updateLobbyPlayer(data)(lobby)(1);
                const player = await getPlayerByUserId(lobby)(1);
                assert.equal(player.LobbyPlayer.hero_id, 1);
                assert.equal(player.LobbyPlayer.kills, 1);
                assert.equal(player.LobbyPlayer.deaths, 1);
                assert.equal(player.LobbyPlayer.assists, 1);
                assert.equal(player.LobbyPlayer.gpm, 1);
                assert.equal(player.LobbyPlayer.xpm, 1);
            });
        });
        
        describe('updateLobbyPlayerBySteamId', () => {
            it('update lobby player', async () => {
                const steamid_64 = '76561198015512690';
                const data = {
                    hero_id: 1,
                    kills: 1,
                    deaths: 1,
                    assists: 1,
                    gpm: 1,
                    xpm: 1,
                }
                await updateLobbyPlayerBySteamId(data)(lobby)(steamid_64);
                const player = await getPlayerBySteamId(lobby)(steamid_64);
                assert.equal(player.LobbyPlayer.hero_id, 1);
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
        
        describe('setPlayerTeam', () => {
            it('set lobby player faction', async () => {
                await setPlayerTeam(2)(lobby)(1);
                const player = await getPlayerByUserId(lobby)(1);
                assert.equal(player.LobbyPlayer.faction, 2);
            });
        });
        
        describe('sortQueuersAsc', () => {
            it('sort queuers by created date', async () => {
                const queuers = [
                    { id: 1, LobbyQueuer: { created_at: 100 } },
                    { id: 2, LobbyQueuer: { created_at: 20 } },
                    { id: 3, LobbyQueuer: { created_at: 200 } },
                    { id: 4, LobbyQueuer: { created_at: 75 } },
                ]
                const sortedQueuers = await sortQueuersAsc(queuers);
                assert.equal(sortedQueuers[0].id, 2);
                assert.equal(sortedQueuers[1].id, 4)
                assert.equal(sortedQueuers[2].id, 1)
                assert.equal(sortedQueuers[3].id, 3)
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
            it('add role to queuers', async () => {
                const queuers = await addRoleToQueuers(lobby);
                assert.lengthOf(queuers, 10);
            });
        });
        
        describe('updateLobbyQueuer', () => {
            it('update lobby queuer', async () => {
                const data = {
                    active: false,
                }
                await updateLobbyQueuer(data)(lobby)(1);
                const queuer = await getQueuerByUserId(lobby)(1);
                assert.isFalse(queuer.LobbyQueuer.active);
            });
        });
        
        describe('updateLobbyQueuerBySteamId', () => {
            it('update lobby queuer', async () => {
                const steamid_64 = '76561198015512690';
                const data = {
                    active: false,
                }
                await updateLobbyQueuerBySteamId(data)(lobby)(steamid_64);
                const queuer = await getQueuerBySteamId(lobby)(steamid_64);
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
                const teams = await calcBalanceTeams(players);
                assert.lengthOf(teams, 2);
                assert.lengthOf(teams[0], 5);
                assert.lengthOf(teams[1], 5);
            });
            
            it('balance teams', async () => {
                const players = [
                    { rank_tier: 1 },
                    { rank_tier: 2 },
                    { rank_tier: 3 },
                    { rank_tier: 4 },
                    { rank_tier: 5 },
                    { rank_tier: 6 },
                    { rank_tier: 7 },
                    { rank_tier: 8 },
                    { rank_tier: 9 },
                    { rank_tier: 10 },
                ];
                const teams = await calcBalanceTeams(players);
                assert.lengthOf(teams, 2);
                assert.lengthOf(teams[0], 5);
                assert.lengthOf(teams[1], 5);
                assert.equal(Math.abs(teams[0].reduce((total, player) => total + player.rank_tier, 0) - teams[1].reduce((total, player) => total + player.rank_tier, 0)), 1);
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
            it('return an empty array when tiers empty', async () => {
                const captains = selectCaptainPairFromTiers(0)({});
                assert.isEmpty(captains);
            });

            it('return an empty array when captains not within threshold', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }]
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                assert.isEmpty(captains);
            });

            it('return a captain pair', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }]
                }
                const captains = selectCaptainPairFromTiers(1)(tiers);
                assert.lengthOf(captains, 2);
            });

            it('return a tier 1 captain pair when tier 0 exceeds threshold', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rank_tier, 10);
            });

            it('return a tier 1 captain pair when tier 0 empty', async () => {
                const tiers = {
                    '0': [],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rank_tier, 10);
            });

            it('return a tier 0 captain pair when 2 in tier 0', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 0 }],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rank_tier, 0);
            });

            it('return a tier 0 captain pair when 3 in tier 0', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }, { rank_tier: 1 }],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                assert.lengthOf(captains, 2);
                assert.equal(captains[0].rank_tier, 1);
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
                assert.isUndefined(priority);
            });
        });
        
        describe('getCaptainPriorityFromRoles', () => {
            it('return 0', async () => {
                const captain_role_regexp = 'Tier ([0-9]+) Captain';
                const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                const priority = getCaptainPriorityFromRoles(captain_role_regexp, roles);
                assert.equal(priority, 0);
            });

            it('return Infinity when no tier roles', async () => {
                const captain_role_regexp = 'Tier ([0-9]+) Captain';
                const roles = [{ name: 'Tier X Captain' }, { name: 'Inhouse Player' }];
                const priority = getCaptainPriorityFromRoles(captain_role_regexp, roles);
                assert.equal(priority, Infinity);
            });

            it('return Infinity when no roles', async () => {
                const captain_role_regexp = 'Tier ([0-9]+) Captain';
                const roles = [];
                const priority = getCaptainPriorityFromRoles(captain_role_regexp, roles);
                assert.equal(priority, Infinity);
            });
        });
        
        describe('playerToCaptainPriority', () => {
            it('return player with captain priority from roles', async () => {
                const guild = 'guild';
                const user = 'user';
                const captain_role_regexp = 'Tier ([0-9]+) Captain';
                const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                const getUserRoles = sinon.stub();
                getUserRoles.withArgs(guild, user).resolves(roles);
                const [player, priority] = await playerToCaptainPriority(getUserRoles)(guild)(captain_role_regexp)(user);
                assert.isTrue(getUserRoles.calledOnceWith(guild, user));
                assert.equal(player, user);
                assert.equal(priority, 0);
            });
        });
        
        describe('getPlayersWithCaptainPriority', () => {
            // TODO
        });
        
        describe('getActiveQueuersWithCaptainPriority', () => {
            // TODO
        });
        
        describe('checkQueueForCaptains', () => {
            // TODO
        });
        
        describe('assignCaptains', () => {
            // TODO
        });
        
        describe('calcDefaultGameMode', () => {
            it('return default game mode when empty', async () => {
                const game_mode_preferences = [];
                const game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
            
            it('return default game mode when tied 1', async () => {
                const game_mode_preferences = [
                    CONSTANTS.DOTA_GAMEMODE_CM,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                ];
                let game_mode;
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CM);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
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
                let game_mode;
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CM);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_AP)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_AP);
            });
            
            it('return only game mode', async () => {
                const game_mode_preferences = [CONSTANTS.DOTA_GAMEMODE_CD];
                const game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
            
            it('return most game mode', async () => {
                const game_mode_preferences = [
                    CONSTANTS.DOTA_GAMEMODE_CM,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_AP,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                    CONSTANTS.DOTA_GAMEMODE_AP,
                ];
                let game_mode;
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_AP)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
        });
        
        describe('autoBalanceTeams', () => {
            // TODO
        });
        
        describe('getDefaultGameMode', () => {
            it('return only game mode', async () => {
                const game_mode_preferences = [CONSTANTS.DOTA_GAMEMODE_CD];
                const game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
        });
        
        describe('assignGameMode', () => {
            it('return game mode preferred by lobby players', async () => {
                assert.equal(lobby.game_mode, CONSTANTS.DOTA_GAMEMODE_CM);
                const lobbyState = await assignGameMode(lobby);
                assert.equal(lobbyState.game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
        });
        
        describe('getDraftingFaction', () => {
            it('return 0 when all players have a team', async () => {
                const draftOrder = [1,2,2,1,2,1,1,2];
                const faction = await getDraftingFaction(draftOrder)(lobby);
                console.log(faction);
            });
            
            it('return 1 when on first pick', async () => {
                const draftOrder = [1,2,2,1,2,1,1,2];
                let faction = await getDraftingFaction(draftOrder)(lobby);
                const players = await lobby.getPlayers();
                players.forEach(player => player.LobbyPlayer = { faction: 0 });
                players[0].LobbyPlayer = { faction: 1 };
                players[1].LobbyPlayer = { faction: 2 };
                await lobby.setPlayers(players, { through: { faction: 0 } });
                const noTeam = await lobby.getNoTeamPlayers();
                assert.equal(noTeam.length, 8);
                faction = await getDraftingFaction(draftOrder)(lobby);
                assert.equal(faction, 1);
            });
            
            it('return 2 when on last pick', async () => {
                const draftOrder = [1,2,2,1,2,1,1,2];
                let faction = await getDraftingFaction(draftOrder)(lobby);
                const players = await lobby.getPlayers();
                players[0].LobbyPlayer.faction = 0;
                await players[0].LobbyPlayer.save();
                const noTeam = await lobby.getNoTeamPlayers();
                assert.equal(noTeam.length, 1);
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
                assert.equal(lobby.captain_1_user_id, captain.id);
            });
            
            it('return captain 2 when faction 2', async () => {
                const captain = await getFactionCaptain(lobby)(2);
                assert.equal(lobby.captain_2_user_id, captain.id);
            });
        });
        
        describe('isPlayerDraftable', () => {
            it('return INVALID_DRAFT_CAPTAIN when player is captain 1', async () => {
                const player = await getPlayerByUserId(lobby)(lobby.captain_1_user_id);
                const result = await isPlayerDraftable(lobby)(player);
                assert.equal(result, CONSTANTS.INVALID_DRAFT_CAPTAIN);
            });
            
            it('return INVALID_DRAFT_CAPTAIN when player is captain 2', async () => {
                const player = await getPlayerByUserId(lobby)(lobby.captain_2_user_id);
                const result = await isPlayerDraftable(lobby)(player);
                assert.equal(result, CONSTANTS.INVALID_DRAFT_CAPTAIN);
            });
            
            it('return INVALID_DRAFT_PLAYER when player is on a team', async () => {
                const players = await lobby.getTeam1Players();
                const result = await isPlayerDraftable(lobby)(players[1]);
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
                const player = await getPlayerByUserId(lobby)(lobby.captain_1_user_id);
                const result = isCaptain(lobby)(player);
                assert.isTrue(result);
            });
            
            it('return true when user is captain 2', async () => {
                const player = await getPlayerByUserId(lobby)(lobby.captain_2_user_id);
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
                const lobbyState = await resetLobbyState({ state: lobby.state, lobby_name: lobby.lobby_name });
                assert.equal(lobbyState.state, CONSTANTS.STATE_BEGIN_READY);
                lobby = await getLobby({ lobby_name: lobby.lobby_name });
                assert.equal(lobby.state, CONSTANTS.STATE_BEGIN_READY);
            });
            
            it('set STATE_BOT_STARTED state to STATE_WAITING_FOR_BOT', async () => {
                lobby.state = CONSTANTS.STATE_BOT_STARTED;
                const lobbyState = await resetLobbyState({ state: lobby.state, lobby_name: lobby.lobby_name });
                assert.equal(lobbyState.state, CONSTANTS.STATE_WAITING_FOR_BOT);
                lobby = await getLobby({ lobby_name: lobby.lobby_name });
                assert.equal(lobby.state, CONSTANTS.STATE_WAITING_FOR_BOT);
            });
            
            it('set STATE_WAITING_FOR_PLAYERS state to STATE_WAITING_FOR_BOT', async () => {
                lobby.state = CONSTANTS.STATE_WAITING_FOR_PLAYERS;
                const lobbyState = await resetLobbyState({ state: lobby.state, lobby_name: lobby.lobby_name });
                assert.equal(lobbyState.state, CONSTANTS.STATE_WAITING_FOR_BOT);
                lobby = await getLobby({ lobby_name: lobby.lobby_name });
                assert.equal(lobby.state, CONSTANTS.STATE_WAITING_FOR_BOT);
            });
            
            it('set null state to STATE_NEW', async () => {
                lobby.state = null;
                const lobbyState = await resetLobbyState({ state: lobby.state, lobby_name: lobby.lobby_name });
                assert.equal(lobbyState.state, CONSTANTS.STATE_NEW);
                lobby = await getLobby({ lobby_name: lobby.lobby_name });
                assert.equal(lobby.state, CONSTANTS.STATE_NEW);
            });
        });
        
        describe('setupLobbyBot', () => {
            it('setup bot and dota lobby', async () => {
            });
        });
        
        describe('killLobby', () => {
            it('delete channel', async () => {
                const lobbyState = {
                    lobby_name,
                    channel: {
                        delete: sinon.spy(),
                    }
                }
                const result = await killLobby(lobbyState);
                assert.isNull(result.channel);
                assert.isTrue(lobbyState.channel.delete.calledOnce);
                assert.equal(result.state, CONSTANTS.STATE_KILLED);
            });
            
            it('delete role', async () => {
                const lobbyState = {
                    lobby_name,
                    role: {
                        delete: sinon.spy(),
                    }
                }
                const result = await killLobby(lobbyState);
                assert.isNull(result.role);
                assert.isTrue(lobbyState.role.delete.calledOnce);
                assert.equal(result.state, CONSTANTS.STATE_KILLED);
            });
            
            it('remove players and set queuers active', async () => {
                const lobbyState = {
                    lobby_name: lobby.lobby_name,
                }
                let players = await getPlayers()(lobbyState);
                assert.lengthOf(players, 10);
                const result = await killLobby(lobbyState);
                players = await getPlayers()(lobbyState);
                assert.isEmpty(players);
                let queuers = await getQueuers()(lobbyState);
                for (const queuer of queuers) {
                    assert.isTrue(queuer.LobbyQueuer.active);
                }
                assert.equal(result.state, CONSTANTS.STATE_KILLED);
            });
        });
        
        describe('isReadyCheckTimedOut', () => {
            it('return true', async () => {
                const result = isReadyCheckTimedOut({
                    ready_check_timeout: 0,
                    ready_check_time: Date.now() - 100,
                });
                assert.isTrue(result);
            });
            it('return false', async () => {
                const result = isReadyCheckTimedOut({
                    ready_check_timeout: 1000,
                    ready_check_time: Date.now(),
                });
                assert.isFalse(result);
            });
        });
        
        describe('startLobby', () => {
            it('return match id', async () => {
                const lobbyState = {
                    dotaBot: {
                        launchPracticeLobby: sinon.stub(),
                        leavePracticeLobby: sinon.stub(),
                        abandonCurrentGame: sinon.stub(),
                        disconnect: sinon.spy(),
                        steamid_64: '123',
                    }
                };
                lobbyState.dotaBot.launchPracticeLobby.resolves({ match_id: 'test' });
                lobbyState.dotaBot.leavePracticeLobby.resolves(true);
                lobbyState.dotaBot.abandonCurrentGame.resolves(true);
                const match_id = await startLobby(lobbyState);
                assert.equal(match_id, 'test');
                assert.isTrue(lobbyState.dotaBot.launchPracticeLobby.calledOnce);
                assert.isTrue(lobbyState.dotaBot.leavePracticeLobby.calledOnce);
                assert.isTrue(lobbyState.dotaBot.abandonCurrentGame.calledOnce);
                assert.isTrue(lobbyState.dotaBot.disconnect.calledOnce);
            });
        });
        
        describe('createLobbyState', () => {
            it('return lobbyState object', async () => {
                const lobbyState = {
                    guild: 'guild',
                    category: 'category',
                    channel: 'channel',
                    role: 'role',
                    ready_check_timeout: 'ready_check_timeout',
                    captain_rank_threshold: 'captain_rank_threshold',
                    captain_role_regexp: 'captain_role_regexp',
                    ready_check_time: 'ready_check_time',
                    state: 'state',
                    bot_id: 'bot_id',
                    queue_type: 'queue_type',
                    lobby_name: 'lobby_name',
                    lobby_id: 'lobby_id',
                    password: 'password',
                    captain_1_user_id: 'captain_1_user_id',
                    captain_2_user_id: 'captain_2_user_id',
                    match_id: 'match_id',
                };
                const result = createLobbyState(lobbyState)(lobbyState.channel, lobbyState.role)(lobbyState);
                assert.deepEqual(result, lobbyState);
            });
        });
        
        describe('lobbyToLobbyState', () => {
            it('return lobbyState', async () => {
                const findOrCreateChannelInCategory = sinon.stub();
                findOrCreateChannelInCategory.resolves({ send: sinon.spy(), overwritePermissions: sinon.spy() });
                const _makeRole = sinon.stub();
                _makeRole.resolves({});
                const makeRole = () => () => () => _makeRole;
                const lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })({
                    guild: { roles: { get: sinon.spy() } },
                    category: 'category',
                    ready_check_timeout: 'ready_check_timeout',
                    captain_rank_threshold: 'captain_rank_threshold',
                    captain_role_regexp: 'captain_role_regexp'
                })(lobby);
                assert.exists(lobbyState);
                assert.isTrue(findOrCreateChannelInCategory.calledOnce);
                assert.isTrue(_makeRole.calledOnce);
            });
            
            it('throws when rejects', async () => {
                const findOrCreateChannelInCategory = sinon.stub();
                findOrCreateChannelInCategory.resolves({ send: sinon.spy(), overwritePermissions: sinon.spy() });
                const _makeRole = sinon.stub();
                _makeRole.rejects({});
                const makeRole = () => () => () => _makeRole;
                await assert.isRejected(lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })({
                    guild: { roles: { get: sinon.spy() } },
                    category: 'category',
                    ready_check_timeout: 'ready_check_timeout',
                    captain_rank_threshold: 'captain_rank_threshold',
                    captain_role_regexp: 'captain_role_regexp'
                })(lobby));
                assert.isTrue(_makeRole.calledOnce);
            });
        });
        
        describe('forceLobbyDraft', () => {
            it('set lobbyState to draft', async () => {
                const lobbyState = {
                    state: CONSTANTS.STATE_ASSIGNING_CAPTAINS,
                    bot_id: 1,
                    dotaBot: {
                        disconnect: sinon.spy(),
                    }
                }
                const result = await forceLobbyDraft(lobbyState, { id: 1 }, { id: 2 });
                chai.assert.equal(result.captain_1_user_id, 1);
                chai.assert.equal(result.captain_2_user_id, 2);
                chai.assert.isNull(result.bot_id);
                chai.assert.isTrue(result.dotaBot.disconnect.calledOnce);
            });
            
            it('do not set lobbyState to draft', async () => {
                const lobbyState = {
                    state: CONSTANTS.STATE_NEW,
                    bot_id: 1,
                    dotaBot: {
                        disconnect: sinon.spy(),
                    }
                }
                const result = await forceLobbyDraft(lobbyState, { id: 1 }, { id: 2 });
                chai.assert.notExists(result.captain_1_user_id, 1);
                chai.assert.notExists(result.captain_2_user_id, 2);
                chai.assert.equal(result.bot_id, 1);
                chai.assert.isFalse(result.dotaBot.disconnect.calledOnce);
            });
        });
    });
});

describe('Database - no lobby players', () => {
    let sandbox = null;

    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-lobbies.js')),
        ],
        { logging: false },
    );

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });

    const lobby_name = 'funny-yak-74';
    
    describe('Lobby Functions', () => {
        let lobby;
        beforeEach(async () => {
            lobby = await getLobby({ lobby_name });
        });
        
        describe('getPlayers', () => {
            it('return 0 players in the lobby', async () => {
                const players = await getPlayers()(lobby);
                assert.isEmpty(players);
            });
        });
        
        describe('addPlayer', () => {
            it('add player to lobby', async () => {
                const user = await db.User.find({ where: { id: 1 } });
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
                const user = await db.User.find({ where: { id: 1 } });
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
                const lobby2 = await getLobby({ lobby_name: 'funny-yak-75' });
                const user = await db.User.find({ where: { id: 1 } });
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
                const lobby2 = await getLobby({ lobby_name: 'funny-yak-75' });
                const user = await db.User.find({ where: { id: 1 } });
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
                const findOrCreateChannelInCategory = sinon.stub();
                findOrCreateChannelInCategory.resolves({ send: sinon.spy(), overwritePermissions: sinon.spy() });
                const _makeRole = sinon.stub();
                _makeRole.resolves({});
                const makeRole = () => () => () => _makeRole;
                lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })({
                    guild: { roles: { get: sinon.spy() } },
                    category: 'category',
                    ready_check_timeout: 'ready_check_timeout',
                    captain_rank_threshold: 'captain_rank_threshold',
                    captain_role_regexp: 'captain_role_regexp'
                })(lobby);
            });
        
            describe('QUEUE_TYPE_DRAFT', () => {
                it('nothing when less than 10 queuers', async () => {
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_DRAFT]()(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                });
                
                it('nothing when no suitable captains', async () => {
                    const users = await db.User.findAll({ limit: 10 });
                    await addQueuers(lobby)(users);
                    const checkQueueForCaptains = sinon.stub();
                    checkQueueForCaptains.resolves([]);
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_DRAFT](checkQueueForCaptains)(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                    assert.isTrue(checkQueueForCaptains.calledOnce);
                });
                
                it('pop queue when at least 10 players and suitable captains', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users);
                    let queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 11);
                    const checkQueueForCaptains = sinon.stub();
                    checkQueueForCaptains.resolves([users[0], users[1]]);
                    let players = await getPlayers()(lobby);
                    assert.isEmpty(players);
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_DRAFT](checkQueueForCaptains)(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_BEGIN_READY);
                    assert.isTrue(checkQueueForCaptains.calledOnce);
                    assert.equal(result.captain_1_user_id, users[0].id);
                    assert.equal(result.captain_2_user_id, users[1].id);
                    players = await getPlayers()(lobby);
                    assert.lengthOf(players, 10);
                    queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 1);
                    let lobbies = await queuers[0].getLobbies();
                    assert.isEmpty(lobbies);
                });
            });
            
            describe('QUEUE_TYPE_AUTO', () => {
                it('nothing when less than 10 queuers', async () => {
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_AUTO]()(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                });
                
                it('pop queue when at least 10 players', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users);
                    let queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 11);
                    let players = await getPlayers()(lobby);
                    assert.isEmpty(players);
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_AUTO]()(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_BEGIN_READY);
                    players = await getPlayers()(lobby);
                    assert.lengthOf(players, 10);
                    queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 1);
                    let lobbies = await queuers[0].getLobbies();
                    assert.isEmpty(lobbies);
                });
            });
            
            describe('QUEUE_TYPE_CHALLENGE', () => {
                it('kill lobby when missing captain', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users.slice(0, 9));
                    lobbyState.captain_1_user_id = users[0].id;
                    lobbyState.captain_2_user_id = users[10].id;
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_CHALLENGE]()(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_PENDING_KILL);
                    const queuers = await getQueuers()(lobbyState);
                    assert.isEmpty(queuers);
                });
                
                it('nothing when captain queuer inactive', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users.slice(0, 9));
                    lobbyState.captain_1_user_id = users[0].id;
                    lobbyState.captain_2_user_id = users[1].id;
                    const queues = await users[0].getQueues();
                    for (const queue of queues) {
                        queue.LobbyQueuer.active = false;
                        await queue.LobbyQueuer.save();
                    }
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_CHALLENGE]()(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_NEW);
                });
                
                it('pop queue when at least 10 players and captains exist', async () => {
                    const users = await db.User.findAll({ limit: 11 });
                    await addQueuers(lobby)(users);
                    lobbyState.captain_1_user_id = users[0].id;
                    lobbyState.captain_2_user_id = users[1].id;
                    const { lobbyState: result } = await LobbyQueueHandlers[CONSTANTS.QUEUE_TYPE_CHALLENGE]()(lobbyState);
                    assert.equal(result.state, CONSTANTS.STATE_BEGIN_READY);
                    assert.equal(result.captain_1_user_id, users[0].id);
                    assert.equal(result.captain_2_user_id, users[1].id);
                    players = await getPlayers()(lobby);
                    assert.lengthOf(players, 10);
                    queuers = await getActiveQueuers()(lobbyState);
                    assert.lengthOf(queuers, 1);
                    let lobbies = await queuers[0].getLobbies();
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
        
        describe('transitionLobbyState', () => {
            // TODO
        });
        
        describe('assignLobbyName', () => {
            it('nothing when QUEUE_TYPE_CHALLENGE', async () => {
                const lobbyState = { lobby_name, queue_type: CONSTANTS.QUEUE_TYPE_CHALLENGE };
                const result = await assignLobbyName(lobbyState);
                assert.equal(lobbyState.lobby_name, result.lobby_name);
            });
            
            it('return renamed lobby state', async () => {
                const lobbyState = { lobby_name };
                const result = await assignLobbyName(lobbyState);
                assert.notEqual(lobbyState.lobby_name, result.lobby_name);
            });
        });
        
        describe('renameLobbyChannel', () => {
            it('rename channel to lobby_name', async () => {
                const setName = sinon.stub();
                setName.resolves();
                const lobbyState = {
                    lobby_name,
                    channel: {
                        setName,
                    }
                };
                const result = await renameLobbyChannel(lobbyState);
                assert.isTrue(setName.calledOnceWith(lobby_name));
            });
        });
        
        describe('renameLobbyRole', () => {
            it('rename role to lobby_name', async () => {
                const setName = sinon.stub();
                setName.resolves();
                const lobbyState = {
                    lobby_name,
                    role: {
                        setName,
                    }
                };
                const result = await renameLobbyRole(lobbyState);
                assert.isTrue(setName.calledOnceWith(lobby_name));
            });
        });
    });
});