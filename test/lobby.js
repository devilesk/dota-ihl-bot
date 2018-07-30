const chai = require('chai');
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
    addRoleToPlayers,
    addPlayer,
    addPlayers,
    mapPlayers,
    updateLobbyPlayer,
    updateLobbyPlayerBySteamId,
    setPlayerReady,
    setPlayerTeam,
    calcBalanceTeams,
    selectCaptainPairFromTiers,
    sortPlayersByCaptainPriority,
    setTeams,
    roleToCaptainPriority,
    getCaptainPriorityFromRoles,
    assignCaptains,
    calcDefaultGameMode,
    autoBalanceTeams,
    getDefaultGameMode,
    getDraftingFaction,
    getFactionCaptain,
    isPlayerDraftable,
    isCaptain,
    resetLobbyState,
    updateLobbyState,
    connectDotaBot,
    disconnectDotaBot,
    createDotaBotLobby,
    setupLobbyBot,
    killLobby,
    isReadyCheckTimedOut,
    reducePlayersToFactionCache,
    getUnassignedBot,
    startLobby,
    loadLobby,
    initLobby,
    runLobby,
    LobbyStateHandlers,
} = proxyquire('../lib/lobby', {
    './dotaBot': {
        isDotaLobbyReady: () => true,
    },
    './guild': require('../lib/guildStub'),
});
const CONSTANTS = require('../lib/constants');

describe('Database Setup', () => {
    let sandbox = null;

    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-lobbyplayers.js')),
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
            chai.assert.equal(lobby.lobby_name, lobby_name);
        });
    
        it('return a Lobby given a Lobby db model', async () => {
            const lobby = await getLobby(await getLobby({ lobby_name: lobby_name }));
            chai.assert.equal(lobby.lobby_name, lobby_name);
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
                chai.assert.lengthOf(players, 10);
            });
        });

        describe('getPlayerByUserId', () => {
            it('return a player', async () => {
                const player = await getPlayerByUserId(lobby)(1);
                chai.assert.equal(player.id, 1);
            });
        });

        describe('getPlayerBySteamId', () => {
            it('return a player', async () => {
                const steamid_64 = '76561198015512690';
                const player = await getPlayerBySteamId(lobby)(steamid_64);
                chai.assert.equal(player.steamid_64, steamid_64);
            });
        });

        describe('getPlayerByDiscordId', () => {
            it('return a player', async () => {
                const discord_id = '76864899866697728';
                const player = await getPlayerByDiscordId(lobby)(discord_id);
                chai.assert.equal(player.discord_id, discord_id);
            });
        });

        describe('getNoTeamPlayers', () => {
            it('return players not on a team', async () => {
                const players = await getNoTeamPlayers()(lobby);
                chai.assert.lengthOf(players, 0);
            });
        });

        describe('getNotReadyPlayers', () => {
            it('return players not ready', async () => {
                const players = await getNotReadyPlayers()(lobby);
                chai.assert.lengthOf(players, 0);
            });
        });

        describe('getReadyPlayers', () => {
            it('return players ready', async () => {
                const players = await getReadyPlayers()(lobby);
                chai.assert.lengthOf(players, 10);
            });
        });

        describe('mapPlayers', () => {
            it('apply a function to players', async () => {
                const players = await mapPlayers(player => player.id)(lobby);
                chai.assert.lengthOf(players, 10);
            });
        });
        
        describe('addRoleToPlayers', () => {
            it('add role to players', async () => {
                const players = await addRoleToPlayers(lobby);
                chai.assert.lengthOf(players, 10);
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
                chai.assert.equal(player.LobbyPlayer.hero_id, 1);
                chai.assert.equal(player.LobbyPlayer.kills, 1);
                chai.assert.equal(player.LobbyPlayer.deaths, 1);
                chai.assert.equal(player.LobbyPlayer.assists, 1);
                chai.assert.equal(player.LobbyPlayer.gpm, 1);
                chai.assert.equal(player.LobbyPlayer.xpm, 1);
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
                chai.assert.equal(player.LobbyPlayer.hero_id, 1);
                chai.assert.equal(player.LobbyPlayer.kills, 1);
                chai.assert.equal(player.LobbyPlayer.deaths, 1);
                chai.assert.equal(player.LobbyPlayer.assists, 1);
                chai.assert.equal(player.LobbyPlayer.gpm, 1);
                chai.assert.equal(player.LobbyPlayer.xpm, 1);
            });
        });
        
        describe('setPlayerReady', () => {
            it('set lobby player ready false', async () => {
                await setPlayerReady(false)(lobby)(1);
                const player = await getPlayerByUserId(lobby)(1);
                chai.assert.isFalse(player.LobbyPlayer.ready);
            });
        });
        
        describe('setPlayerTeam', () => {
            it('set lobby player faction', async () => {
                await setPlayerTeam(2)(lobby)(1);
                const player = await getPlayerByUserId(lobby)(1);
                chai.assert.equal(player.LobbyPlayer.faction, 2);
            });
        });
        
        describe('calcBalanceTeams', () => {
            it('balance teams', async () => {
                const players = await getPlayers()(lobby);
                const teams = await calcBalanceTeams(players);
                chai.assert.lengthOf(teams, 2);
                chai.assert.lengthOf(teams[0], 5);
                chai.assert.lengthOf(teams[1], 5);
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
                chai.assert.lengthOf(teams, 2);
                chai.assert.lengthOf(teams[0], 5);
                chai.assert.lengthOf(teams[1], 5);
                chai.assert.equal(Math.abs(teams[0].reduce((total, player) => total + player.rank_tier, 0) - teams[1].reduce((total, player) => total + player.rank_tier, 0)), 1);
            });
        });
        
        describe('roleToCaptainPriority', () => {
            it('return 0', async () => {
                const regexp = new RegExp('Tier ([0-9]+) Captain');
                const priority = roleToCaptainPriority(regexp)({ name: 'Tier 0 Captain' });
                chai.assert.equal(priority, 0);
            });

            it('return 10', async () => {
                const regexp = new RegExp('Tier ([0-9]+) Captain');
                const priority = roleToCaptainPriority(regexp)({ name: 'Tier 10 Captain' });
                chai.assert.equal(priority, 10);
            });

            it('return undefined', async () => {
                const regexp = new RegExp('Tier ([0-9]+) Captain');
                const priority = roleToCaptainPriority(regexp)({ name: 'Tier A Captain' });
                chai.assert.isUndefined(priority);
            });
        });
        
        describe('getCaptainPriorityFromRoles', () => {
            it('return 0', async () => {
                const captain_role_regexp = 'Tier ([0-9]+) Captain';
                const roles = [{ name: 'Tier 0 Captain' }, { name: 'Inhouse Player' }];
                const priority = getCaptainPriorityFromRoles(captain_role_regexp, roles);
                chai.assert.equal(priority, 0);
            });

            it('return Infinity when no tier roles', async () => {
                const captain_role_regexp = 'Tier ([0-9]+) Captain';
                const roles = [{ name: 'Tier X Captain' }, { name: 'Inhouse Player' }];
                const priority = getCaptainPriorityFromRoles(captain_role_regexp, roles);
                chai.assert.equal(priority, Infinity);
            });

            it('return Infinity when no roles', async () => {
                const captain_role_regexp = 'Tier ([0-9]+) Captain';
                const roles = [];
                const priority = getCaptainPriorityFromRoles(captain_role_regexp, roles);
                chai.assert.equal(priority, Infinity);
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
                chai.assert.hasAllKeys(tiers, ['0', '1', '2']);
                chai.assert.lengthOf(tiers['0'], 2);
                chai.assert.lengthOf(tiers['1'], 3);
                chai.assert.lengthOf(tiers['2'], 1);
            });
        });
        
        describe('selectCaptainPairFromTiers', () => {
            it('return an empty array when tiers empty', async () => {
                const captains = selectCaptainPairFromTiers(0)({});
                chai.assert.isEmpty(captains);
            });

            it('return an empty array when captains not within threshold', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }]
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                chai.assert.isEmpty(captains);
            });

            it('return a captain pair', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }]
                }
                const captains = selectCaptainPairFromTiers(1)(tiers);
                chai.assert.lengthOf(captains, 2);
            });

            it('return a tier 1 captain pair when tier 0 exceeds threshold', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                chai.assert.lengthOf(captains, 2);
                chai.assert.equal(captains[0].rank_tier, 10);
            });

            it('return a tier 1 captain pair when tier 0 empty', async () => {
                const tiers = {
                    '0': [],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                chai.assert.lengthOf(captains, 2);
                chai.assert.equal(captains[0].rank_tier, 10);
            });

            it('return a tier 0 captain pair when 2 in tier 0', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 0 }],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                chai.assert.lengthOf(captains, 2);
                chai.assert.equal(captains[0].rank_tier, 0);
            });

            it('return a tier 0 captain pair when 3 in tier 0', async () => {
                const tiers = {
                    '0': [{ rank_tier: 0 }, { rank_tier: 1 }, { rank_tier: 1 }],
                    '1': [{ rank_tier: 10 }, { rank_tier: 10 }],
                }
                const captains = selectCaptainPairFromTiers(0)(tiers);
                chai.assert.lengthOf(captains, 2);
                chai.assert.equal(captains[0].rank_tier, 1);
            });
        });
        
        describe('calcDefaultGameMode', () => {
            it.only('return default game mode when empty', async () => {
                const game_mode_preferences = [];
                const game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
            
            it.only('return default game mode when tied 1', async () => {
                const game_mode_preferences = [
                    CONSTANTS.DOTA_GAMEMODE_CM,
                    CONSTANTS.DOTA_GAMEMODE_CD,
                ];
                let game_mode;
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CM);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
            
            it.only('return default game mode when tied 2', async () => {
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
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CM);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_AP)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_AP);
            });
            
            it.only('return only game mode', async () => {
                const game_mode_preferences = [CONSTANTS.DOTA_GAMEMODE_CD];
                const game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CM)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
            
            it.only('return most game mode', async () => {
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
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_AP)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
                game_mode = calcDefaultGameMode(CONSTANTS.DOTA_GAMEMODE_CD)(game_mode_preferences);
                chai.assert.equal(game_mode, CONSTANTS.DOTA_GAMEMODE_CD);
            });
        });
    });
});

describe('Database Setup', () => {
    let sandbox = null;

    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../testdata/fake-users.js')),
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
                chai.assert.lengthOf(players, 0);
            });
        });
        
        describe('addPlayer', () => {
            it('add player to lobby', async () => {
                const user = await db.User.find({ where: { id: 1 } });
                await addPlayer(lobby)(user);
                const players = await getPlayers()(lobby);
                chai.assert.lengthOf(players, 1);
            });
        });
        
        describe('addPlayers', () => {
            it('add players to lobby', async () => {
                const users = await db.User.findAll({ limit: 10 });
                await addPlayers(lobby)(users);
                const players = await getPlayers()(lobby);
                chai.assert.lengthOf(players, 10);
            });
        });
    });
});