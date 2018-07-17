const chai = require('chai');
const sinon = require('sinon');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const Promise = require('bluebird');
const db = require('../models');
const { getPlayers, getPlayerBySteamId } = require('../lib/lobby');
const CONSTANTS = require('../lib/constants');
const {
    findOrCreateLeague, findOrCreateLobby, findOrCreateLobbyForGuild, findOrCreateUser, findOrCreateQueue,
} = require('../lib/db');

describe('Database', () => {
    let sandbox = null;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });

    sequelizeMockingMocha(
        db.sequelize,
        [],
        { logging: false },
    );

    describe('League', () => {
        it('findOrCreateLeague', async () => {
            let league;
            league = await findOrCreateLeague('422549177151782925');
            chai.assert.exists(league);
            league = await findOrCreateLeague('422549177151782925');

            let season;
            season = await db.Season.findOne({ where: { id: league.current_season_id } });
            chai.assert.strictEqual(season.id, 1);

            league = await findOrCreateLeague('422549177151782925');
            season = await db.Season.findOne({ where: { id: league.current_season_id } });
            season = await season.update({ active: false });
            chai.assert.isFalse(season.active);

            league = await findOrCreateLeague('422549177151782925');
            season = await db.Season.findOne({ where: { id: league.current_season_id } });
            chai.assert.strictEqual(season.id, 2);

            league = await findOrCreateLeague('422549177151782925');
            let seasons;
            seasons = await league.getSeasons();
            chai.assert.lengthOf(seasons, 2);
        });

        describe('with League', () => {
            let league;

            beforeEach(() => findOrCreateLeague('422549177151782925')
                .then(result => league = result));

            describe('Season', () => {
                it('league.getSeasons', () => league.getSeasons()
                    .then(seasons => chai.assert.lengthOf(seasons, 1)));

                it('league.getSeasons after setting season to false and findOrCreateLeague', () => league.getSeasons()
                    .then(seasons => seasons[0].update({ active: false }))
                    .then(() => findOrCreateLeague(league.guild_id))
                    .then(league => league.getSeasons())
                    .then(seasons => chai.assert.lengthOf(seasons, 2)));
            });

            describe('User', () => {
                const steamid_64_1 = '76561198015512690';
                const steamid_64_2 = '76561198136290105';

                const discord_id_1 = '76864899866697728';
                const discord_id_2 = '112718237040398336';

                it('test findOrCreateUser', () => findOrCreateUser(league, steamid_64_1, discord_id_1)
                    .then(user => chai.assert.exists(user) && chai.assert.exists(user.league_id)));

                describe('with User', () => {
                    let user1,
                        user2;

                    beforeEach(() => findOrCreateUser(league, steamid_64_1, discord_id_1)
                        .then(result => user1 = result)
                        .then(() => findOrCreateUser(league, steamid_64_2, discord_id_2))
                        .then(result => user2 = result));

                    describe('User Scopes', () => {
                        it('test steamid_64 scope', () => db.User.scope({ method: ['steamid_64', steamid_64_1] }).findAll()
                            .then(users => chai.assert.lengthOf(users, 1)));

                        it('test discord_id scope', () => db.User.scope({ method: ['discord_id', discord_id_1] }).findAll()
                            .then(users => chai.assert.lengthOf(users, 1)));

                        it('test guild scope', () => db.User.scope({ method: ['guild', league.guild_id] }).findAll()
                            .then(users => chai.assert.lengthOf(users, 2)));

                        it('test multiple scope', () => db.User.scope({ method: ['steamid_64', steamid_64_1] }, { method: ['discord_id', discord_id_1] }, { method: ['guild', league.guild_id] }).findAll()
                            .then(users => chai.assert.lengthOf(users, 1)));
                    });

                    describe('Queue', () => {
                        it('findOrCreateQueue', () => findOrCreateQueue(user1)
                            .then(([queue1, created]) => chai.assert.exists(queue1)));

                        it('findOrCreateQueue multiple', () => findOrCreateQueue(user1)
                            .then(([queue1, created]) => {
                                chai.assert.exists(queue1);
                                return findOrCreateQueue(user2)
                                    .then(([queue2, created]) => {
                                        chai.assert.exists(queue2);
                                        chai.assert.notEqual(queue1.id, queue2.id);
                                    });
                            }));

                        describe('Queue Scopes', () => {
                            let queue1,
                                queue2;

                            beforeEach(() => findOrCreateQueue(user1)
                                .then(([result, created]) => queue1 = result)
                                .then(() => findOrCreateQueue(user2))
                                .then(([result, created]) => queue2 = result));

                            it('test ready scope', () => db.Queue.scope('ready').findAll()
                                .then(queues => chai.assert.lengthOf(queues, 0))
                                .then(() => queue1.update({ ready: true }))
                                .then(() => db.Queue.scope('ready').findAll())
                                .then(queues => chai.assert.lengthOf(queues, 1))
                                .then(() => queue2.update({ ready: true }))
                                .then(() => db.Queue.scope('ready').findAll())
                                .then(queues => chai.assert.lengthOf(queues, 2)));

                            it('test not_ready scope', () => db.Queue.scope('not_ready').findAll()
                                .then(queues => chai.assert.lengthOf(queues, 2))
                                .then(() => queue1.update({ ready: true }))
                                .then(() => db.Queue.scope('not_ready').findAll())
                                .then(queues => chai.assert.lengthOf(queues, 1))
                                .then(() => queue2.update({ ready: true }))
                                .then(() => db.Queue.scope('not_ready').findAll())
                                .then(queues => chai.assert.lengthOf(queues, 0)));

                            it('test state scope', () => db.Queue.scope({ method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }).findAll()
                                .then(queues => chai.assert.lengthOf(queues, 2))
                                .then(() => queue1.update({ state: CONSTANTS.QUEUE_IN_LOBBY }))
                                .then(() => db.Queue.scope({ method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 1))
                                .then(() => db.Queue.scope({ method: ['state', CONSTANTS.QUEUE_IN_LOBBY] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 1))
                                .then(() => queue2.update({ state: CONSTANTS.QUEUE_IN_LOBBY }))
                                .then(() => db.Queue.scope({ method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 0))
                                .then(() => db.Queue.scope({ method: ['state', CONSTANTS.QUEUE_IN_LOBBY] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 2)));

                            it('test guild scope', () => db.Queue.scope({ method: ['guild', league.guild_id] }).findAll()
                                .then(queues => chai.assert.lengthOf(queues, 2)));

                            it('test multiple scope', () => db.Queue.scope('not_ready', { method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }, { method: ['guild', league.guild_id] }).findAll()
                                .then(queues => chai.assert.lengthOf(queues, 2))
                                .then(() => queue1.update({ ready: true }))
                                .then(() => db.Queue.scope('not_ready', { method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }, { method: ['guild', league.guild_id] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 1))
                                .then(() => db.Queue.scope('not_ready', { method: ['state', CONSTANTS.QUEUE_IN_LOBBY] }, { method: ['guild', league.guild_id] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 0))
                                .then(() => queue1.update({ state: CONSTANTS.QUEUE_IN_LOBBY }))
                                .then(() => db.Queue.scope('ready', { method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }, { method: ['guild', league.guild_id] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 0))
                                .then(() => db.Queue.scope('ready', { method: ['state', CONSTANTS.QUEUE_IN_LOBBY] }, { method: ['guild', league.guild_id] }).findAll())
                                .then(queues => chai.assert.lengthOf(queues, 1)));
                        });
                    });
                });
            });

            describe('Lobby', () => {
                const lobby_name_1 = 'lobby_name_1';
                const lobby_name_2 = 'lobby_name_2';
                let league;

                beforeEach(() => findOrCreateLeague('422549177151782925')
                    .then(result => league = result));

                it('findOrCreateLobbyForGuild', () => findOrCreateLobbyForGuild(league.guild_id, lobby_name_1)
                    .then(lobby1 => chai.assert.exists(lobby1)));

                it('findOrCreateLobby', () => findOrCreateLobby(league, lobby_name_1)
                    .then(lobby1 => chai.assert.exists(lobby1)));

                it('findOrCreateLobby multiple', () => findOrCreateLobby(league, lobby_name_1)
                    .then((lobby1) => {
                        chai.assert.exists(lobby1);
                        return findOrCreateLobby(league, lobby_name_2)
                            .then((lobby2) => {
                                chai.assert.exists(lobby2);
                                chai.assert.notEqual(lobby1.id, lobby2.id);
                            });
                    }));

                describe('with Lobby', () => {
                    let lobby1,
                        lobby2;

                    beforeEach(() => findOrCreateLobby(league, lobby_name_1)
                        .then(result => lobby1 = result)
                        .then(() => findOrCreateLobby(league, lobby_name_2))
                        .then(result => lobby2 = result));

                    describe('Lobby Scopes', () => {
                        it('test lobby_name scope', () => db.Lobby.scope({ method: ['lobby_name', lobby_name_1] }).findAll()
                            .then(lobbies => chai.assert.lengthOf(lobbies, 1)));

                        it('test guild scope', () => db.Lobby.scope({ method: ['guild', league.guild_id] }).findAll()
                            .then(lobbies => chai.assert.lengthOf(lobbies, 2)));

                        it('test multiple scope', () => db.Lobby.scope({ method: ['lobby_name', lobby_name_1] }, { method: ['guild', league.guild_id] }).findAll()
                            .then(lobbies => chai.assert.lengthOf(lobbies, 1)));
                    });

                    describe('LobbyPlayer', () => {
                        const steamid_64_1 = '76561198015512690';
                        const steamid_64_2 = '76561198136290105';

                        const discord_id_1 = '76864899866697728';
                        const discord_id_2 = '112718237040398336';

                        let user1,
                            user2;

                        beforeEach(() => findOrCreateUser(league, steamid_64_1, discord_id_1)
                            .then(result => user1 = result)
                            .then(() => findOrCreateUser(league, steamid_64_2, discord_id_2))
                            .then(result => user2 = result));

                        it('test lobby.addPlayer', () => lobby1.addPlayer(user1)
                            .then(addedPlayers => chai.assert.lengthOf(addedPlayers, 1))
                            .then(() => lobby1.addPlayer([user1, user2]))
                            .then(addedPlayers => chai.assert.lengthOf(addedPlayers, 1))
                            .then(() => lobby1.getPlayers())
                            .then(players => chai.assert.lengthOf(players, 2))
                            .then(() => getPlayers({ where: { steamid_64: steamid_64_1 } })(lobby1))
                            .then(players => chai.assert.lengthOf(players, 1))
                            .then(() => getPlayerBySteamId(lobby1)(steamid_64_1))
                            .then(players2 => chai.assert.exists(players2)));

                        it('test lobby.getPlayers', () => lobby1.addPlayer([user1, user2])
                            .then(() => lobby1.getPlayers())
                            .then(players => chai.assert.lengthOf(players, 2)));

                        describe('with LobbyPlayer', () => {
                            beforeEach(() => lobby1.addPlayer([user1, user2]));

                            describe('LobbyPlayer Scopes', () => {
                                it('test ready scope', () => db.LobbyPlayer.scope('ready').findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 0)));

                                it('test not_ready scope', () => db.LobbyPlayer.scope('not_ready').findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2)));

                                it('test no_team scope', () => db.LobbyPlayer.scope('no_team').findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2)));

                                it('test team_1 scope', () => db.LobbyPlayer.scope('team_1').findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 0)));

                                it('test team_2 scope', () => db.LobbyPlayer.scope('team_2').findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 0)));

                                it('test lobby_name scope', () => db.LobbyPlayer.scope({ method: ['lobby_name', lobby_name_1] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2)));

                                it('test guild_id scope', () => db.LobbyPlayer.scope({ method: ['guild_id', league.guild_id] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2)));

                                it('test steamid_64 scope', () => db.LobbyPlayer.scope({ method: ['steamid_64', steamid_64_1] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1)));

                                it('test discord_id scope', () => db.LobbyPlayer.scope({ method: ['discord_id', discord_id_1] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1)));

                                /* it('test users scope', () =>
                                    db.LobbyPlayer.scope({ method: ['users', [user1]] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1))
                                    .then(() => db.LobbyPlayer.scope({ method: ['users', [user1, user2]] }).findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2))
                                ); */

                                it('test multiple scope', () => db.LobbyPlayer.scope('not_ready', 'no_team', { method: ['lobby_name', lobby_name_1] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2)));

                                it('test scope update', () => lobby1.getReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => db.LobbyPlayer.scope({ method: ['lobby_name', lobby1.lobby_name] }).update({ ready: true }, { where: {} }))
                                    .spread(affectedRows => chai.assert.equal(affectedRows, 2))
                                    .then(() => lobby1.getReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 2))
                                    .then(() => user1.getLobbies({
                                        where: {
                                            lobby_name: lobby_name_1,
                                        },
                                    }))
                                    .then(lobbies => lobbies[0].LobbyPlayer.update({ faction: 2 }))
                                    .then(() => db.LobbyPlayer.scope('team_2').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1))
                                    .then(() => db.LobbyPlayer.scope('team_2').update({ ready: false }, { where: {} }))
                                    .spread(affectedRows => chai.assert.equal(affectedRows, 1))
                                    .then(() => db.LobbyPlayer.scope('ready').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1))
                                    .then(() => db.LobbyPlayer.scope('no_team').update({ faction: 1 }, { where: {} }))
                                    .then(() => db.LobbyPlayer.scope('team_1').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1))
                                    .then(() => db.LobbyPlayer.scope('team_2').update({ faction: 0 }, { where: {} }))
                                    .then(() => db.LobbyPlayer.scope('no_team').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1))
                                    .then(() => db.LobbyPlayer.scope('no_team').update({ ready: true }, { where: {} }))
                                    .then(() => db.LobbyPlayer.scope('ready').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2))
                                    .then(() => db.LobbyPlayer.scope('team_1').update({ faction: 0 }, { where: {} }))
                                    .then(() => db.LobbyPlayer.scope('no_team').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2))
                                    .then(() => db.LobbyPlayer.scope('team_1').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 0))
                                    .then(() => db.LobbyPlayer.scope('team_1').update({ ready: false }, { where: {} }))
                                    .spread(affectedRows => chai.assert.equal(affectedRows, 0))
                                    .then(() => db.LobbyPlayer.scope('team_1').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 0))
                                    .then(() => db.LobbyPlayer.scope('ready').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2)),
                                    /* .then(() => db.LobbyPlayer.scope({ method: ['discord_id', discord_id_1] }).findAll())
                                    .then(lobbyPlayers => {
                                        console.log(lobbyPlayers)
                                        chai.assert.lengthOf(lobbyPlayers, 1)
                                        return lobbyPlayers[0].update({ ready: false })
                                    })
                                    .then(() => db.LobbyPlayer.scope({ method: ['discord_id', discord_id_1] }).update({ ready: false }, { where: {} }))
                                    .spread((affectedRows, rows) => {
                                        console.log(affectedRows)
                                        chai.assert.equal(affectedRows, 1)
                                    })
                                    .then(() => db.LobbyPlayer.scope('ready').findAll())
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 1)) */
                                );
                            });

                            describe('Lobby <-> Player Association', () => {
                                it('test user.getLobbies exists', () => chai.assert.exists(user1.getLobbies));

                                it('test user.getLobbies', () => user1.getLobbies()
                                    .then(lobbies => chai.assert.lengthOf(lobbies, 1)));

                                it('test user.getLobbies LobbyPlayer exists', () => {
                                    chai.assert.notExists(user1.LobbyPlayer);
                                    return user1.getLobbies()
                                        .then((lobbies) => {
                                            chai.assert.lengthOf(lobbies, 1);
                                            chai.assert.exists(lobbies[0]);
                                            chai.assert.exists(lobbies[0].LobbyPlayer);
                                            chai.assert.isFunction(lobbies[0].LobbyPlayer.getLobby);
                                            chai.assert.isFunction(lobbies[0].LobbyPlayer.getUser);
                                            // console.log('lobbies[0].LobbyPlayer', lobbies[0].LobbyPlayer);
                                            return lobbies[0].LobbyPlayer.getLobby()
                                                .then((lobby) => {
                                                    chai.assert.exists(lobby);
                                                    chai.assert.equal(lobby.name, lobbies[0].name);
                                                })
                                                .then(() => lobbies[0].LobbyPlayer.getUser())
                                                .then((user) => {
                                                    chai.assert.exists(user);
                                                    chai.assert.equal(user.id, user1.id);
                                                });
                                        });
                                });

                                it('test user.getLobbies lobby_name', () => user1.getLobbies({
                                    where: {
                                        lobby_name: lobby_name_1,
                                    },
                                })
                                    .then(lobbies => chai.assert.lengthOf(lobbies, 1))
                                    .then(() => user1.getLobbies({
                                        where: {
                                            lobby_name: lobby_name_2,
                                        },
                                    }))
                                    .then(lobbies => chai.assert.lengthOf(lobbies, 0)));

                                it('test lobby.getReadyPlayers', () => lobby1.getReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 0)));

                                it('test lobby.getNotReadyPlayers', () => lobby1.getNotReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test lobby.setPlayers exists', () => chai.assert.isFunction(lobby1.setPlayers));

                                it('test lobby.addPlayers exists', () => chai.assert.isFunction(lobby1.addPlayers));

                                it('test lobby.getPlayers attributes', () => lobby1.getPlayers()
                                    .then((players) => {
                                        chai.assert.lengthOf(players, 2);
                                        players.forEach((player) => {
                                            chai.assert.exists(player.LobbyPlayer);
                                            chai.assert.isFalse(player.LobbyPlayer.ready);
                                            chai.assert.equal(player.LobbyPlayer.faction, 0);
                                        });
                                    }));

                                it('test lobby.getPlayers set faction', () => lobby1.getReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getPlayers())
                                    .then((players) => {
                                        chai.assert.lengthOf(players, 2);
                                        return Promise.map(players, (player) => {
                                            chai.assert.exists(player.LobbyPlayer);
                                            chai.assert.isFalse(player.LobbyPlayer.ready);
                                            chai.assert.equal(player.LobbyPlayer.faction, 0);
                                            return player.LobbyPlayer.update({ ready: true });
                                        });
                                    })
                                    .then(() => lobby1.getReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test lobby.getNoTeamPlayers', () => lobby1.getNoTeamPlayers()
                                    .then(players => chai.assert.lengthOf(players, 2))
                                    .then(() => lobby1.getPlayers())
                                    .then((players) => {
                                        chai.assert.lengthOf(players, 2);
                                        return Promise.map(players, (player) => {
                                            chai.assert.exists(player.LobbyPlayer);
                                            chai.assert.isFalse(player.LobbyPlayer.ready);
                                            chai.assert.equal(player.LobbyPlayer.faction, 0);
                                            return player.LobbyPlayer.update({ faction: 1 });
                                        });
                                    })
                                    .then(() => lobby1.getNoTeamPlayers())
                                    .then(players => chai.assert.lengthOf(players, 0)));

                                it('test lobby.getTeam1Players', () => lobby1.getTeam1Players()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getPlayers())
                                    .then((players) => {
                                        chai.assert.lengthOf(players, 2);
                                        return Promise.map(players, (player) => {
                                            chai.assert.exists(player.LobbyPlayer);
                                            chai.assert.isFalse(player.LobbyPlayer.ready);
                                            chai.assert.equal(player.LobbyPlayer.faction, 0);
                                            return player.LobbyPlayer.update({ faction: 1 });
                                        });
                                    })
                                    .then(() => lobby1.getTeam1Players())
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test lobby.getTeam2Players', () => lobby1.getTeam2Players()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getPlayers())
                                    .then((players) => {
                                        chai.assert.lengthOf(players, 2);
                                        return Promise.map(players, (player) => {
                                            chai.assert.exists(player.LobbyPlayer);
                                            chai.assert.isFalse(player.LobbyPlayer.ready);
                                            chai.assert.equal(player.LobbyPlayer.faction, 0);
                                            return player.LobbyPlayer.update({ faction: 2 });
                                        });
                                    })
                                    .then(() => lobby1.getTeam2Players())
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test lobby.getPlayers set ready', () => lobby1.getReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getPlayers())
                                    .then((players) => {
                                        chai.assert.lengthOf(players, 2);
                                        return Promise.map(players, (player) => {
                                            chai.assert.exists(player.LobbyPlayer);
                                            chai.assert.isFalse(player.LobbyPlayer.ready);
                                            chai.assert.equal(player.LobbyPlayer.faction, 0);
                                            return player.LobbyPlayer.update({ ready: true });
                                        });
                                    })
                                    .then(() => lobby1.getReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test lobby.getNotReadyPlayers set ready', () => lobby1.getReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getNotReadyPlayers())
                                    .then((players) => {
                                        chai.assert.lengthOf(players, 2);
                                        return Promise.map(players, (player) => {
                                            chai.assert.exists(player.LobbyPlayer);
                                            chai.assert.isFalse(player.LobbyPlayer.ready);
                                            chai.assert.equal(player.LobbyPlayer.faction, 0);
                                            return player.LobbyPlayer.update({ ready: true });
                                        });
                                    })
                                    .then(() => lobby1.getReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test lobby.addPlayers duplicate', () => lobby1.addPlayers(user1)
                                    .then(() => lobby1.getPlayers())
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test lobby.setPlayers', () => lobby1.getPlayers()
                                    .then(players => lobby1.setPlayers(players)
                                        .then(() => lobby1.getPlayers())
                                        .then(players => chai.assert.lengthOf(players, 2)))
                                    .then(() => lobby1.setPlayers([user1]))
                                    .then(() => lobby1.getPlayers())
                                    .then(players => chai.assert.lengthOf(players, 1)));

                                it('test lobby.setPlayers ready', () => lobby1.getReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getPlayers())
                                    .then((players) => {
                                        players.forEach(player => player.LobbyPlayer = { ready: true, faction: 1 });
                                        return lobby1.setPlayers(players, { through: { ready: false } });
                                    })
                                    .then(() => lobby1.getTeam1Players())
                                    .then(players => chai.assert.lengthOf(players, 2))
                                    .then(() => lobby1.getReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 2))
                                    .then(() => lobby1.getNotReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getPlayers())
                                    .then(players => lobby1.setPlayers(players, { through: { ready: false, faction: 2 } }))
                                    .then(() => lobby1.getReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => lobby1.getNotReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 2))
                                    .then(() => lobby1.getTeam2Players())
                                    .then(players => chai.assert.lengthOf(players, 2)));

                                it('test user.getLobbies set ready', () => lobby1.getReadyPlayers()
                                    .then(players => chai.assert.lengthOf(players, 0))
                                    .then(() => user1.getLobbies({
                                        where: { lobby_name: lobby_name_1 },
                                    }))
                                    .then((lobbies) => {
                                        chai.assert.lengthOf(lobbies, 1);
                                        return Promise.map(lobbies, (lobby) => {
                                            chai.assert.exists(lobby.LobbyPlayer);
                                            chai.assert.isFalse(lobby.LobbyPlayer.ready);
                                            chai.assert.equal(lobby.LobbyPlayer.faction, 0);
                                            return lobby.LobbyPlayer.update({ ready: true });
                                        });
                                    })
                                    .then(() => lobby1.getReadyPlayers())
                                    .then(players => chai.assert.lengthOf(players, 1)));

                                /* it('test lobby_name scope', () =>
                                    db.LobbyPlayer.scope({ method: ['lobby_name', lobby1.lobby_name] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2))
                                );

                                it('test multiple scope', () =>
                                    db.LobbyPlayer.scope('not_ready', { method: ['lobby_name', lobby1.lobby_name] }).findAll()
                                    .then(lobbyPlayers => chai.assert.lengthOf(lobbyPlayers, 2))
                                ); */
                            });
                        });
                    });
                });
            });
        });
    });


    describe('add multiple player to lobby', () => {

        it('test lobby.addPlayer', () =>
            findOrCreateLobbyForGuild('422549177151782925', 'test')
            .then(lobby => {
                return findOrCreateLeague('422549177151782925')
                .then(league => {
                    return findOrCreateUser(league, '76561198015512690', '76864899866697728')
                    .then(user => {
                        return findOrCreateUser(league, '76561198136290105', '112718237040398336')
                        .then(user2 => {
                            return lobby.addPlayer(user)
                            .then(addedPlayers => chai.assert.lengthOf(addedPlayers, 1))
                            .then(() => lobby.addPlayer([user, user2]))
                            .then(addedPlayers => chai.assert.lengthOf(addedPlayers, 1))
                            .then(() => lobby.getPlayers())
                            .then(players => chai.assert.lengthOf(players, 2))
                        })
                    })
                })
            })
        );
    });

    describe('add player to lobby', () => {
        it('test lobby.addPlayer', () =>
            findOrCreateLobbyForGuild('422549177151782925', 'test')
            .then(lobby => {
                return findOrCreateLeague('422549177151782925')
                .then(league => {
                    return findOrCreateUser(league, '76561198015512690', '76864899866697728')
                    .then(user => {
                        return lobby.getPlayers()
                        .then(players => chai.assert.lengthOf(players, 0))
                        .then(() => lobby.addPlayer(user))
                        .then(() => lobby.getPlayers())
                        .then(players => chai.assert.lengthOf(players, 1))
                        .then(() => lobby.addPlayer(user))
                        .then(() => lobby.getPlayers())
                        .then(players => chai.assert.lengthOf(players, 1))
                        .then(() => findOrCreateUser(league, '76561198136290105', '112718237040398336'))
                        .then(user2 => {
                            return lobby.addPlayer(user2)
                            .then(() => lobby.getPlayers())
                            .then(players => chai.assert.lengthOf(players, 2))
                        })
                    })
                })
            })
        );
    });

    describe('findOrCreateUser', () => {
        it('test findOrCreateUser', () =>
            findOrCreateLeague('422549177151782925')
            .then(league => {
                return findOrCreateUser(league, '76561198015512690', '76864899866697728')
                .then(user => chai.assert.exists(user) && chai.assert.exists(user.league_id))
                .then(() => db.User.scope({ method: ['steamid_64', '76561198015512690'] }).find())
                .then(user => chai.assert.exists(user))
                .then(() => db.User.scope({ method: ['discord_id', '76864899866697728'] }).find())
                .then(user => chai.assert.exists(user))
                .then(() => db.User.scope({ method: ['guild', league.guild_id] }).find())
                .then(user => chai.assert.exists(user))
                .then(() => db.User.scope({ method: ['steamid_64', '76561198015512690'] }, { method: ['discord_id', '76864899866697728'] }, { method: ['guild', league.guild_id] }).find())
                .then(user => chai.assert.exists(user))
            })
        );
    });

    describe('findOrCreateLobbyForGuild', () => {
        it('test findOrCreateLobbyForGuild', () =>
            findOrCreateLobbyForGuild('422549177151782925', 'test')
            .then(() => db.Lobby.scope({ method: ['lobby_name', 'test'] }).find())
            .then(lobby => chai.assert.exists(lobby))
            .then(() => db.Lobby.scope({ method: ['guild', '422549177151782925'] }).find())
            .then(lobby => chai.assert.exists(lobby))
        );
    });

    describe('findOrCreateLobby', () => {
        it('test findOrCreateLobby', () =>
            findOrCreateLeague('422549177151782925')
            .then(league => {
                return findOrCreateLobby(league, 'test')
                .then(lobby => chai.assert.exists(lobby) && chai.assert.exists(lobby.league_id))
                .then(() => db.Lobby.scope({ method: ['lobby_name', 'test'] }).find())
                .then(lobby => chai.assert.exists(lobby))
                .then(() => db.Lobby.scope({ method: ['guild', league.guild_id] }).find())
                .then(lobby => chai.assert.exists(lobby))
                .then(() => db.Lobby.scope({ method: ['lobby_name', 'test'] }, { method: ['guild', league.guild_id] }).find())
                .then(lobby => chai.assert.exists(lobby))
            })
        );
    });

    describe('findOrCreateLeague', () => {
        it('test findOrCreateLeague', () =>
            findOrCreateLeague('422549177151782925').then(league => {
                return chai.assert.exists(league);
            })
            .then(() => findOrCreateLeague('422549177151782925'))
            .then(league => db.Season.findOne({ where: {id: league.current_season_id} }))
            .then(season => chai.assert.strictEqual(season.id, 1))
            .then(() => findOrCreateLeague('422549177151782925'))
            .then(league => db.Season.findOne({ where: {id: league.current_season_id} }))
            .then(season => season.update({ active: false }))
            .then(season => chai.assert.isFalse(season.active))
            .then(() => findOrCreateLeague('422549177151782925'))
            .then(league => db.Season.findOne({ where: {id: league.current_season_id} }))
            .then(season => chai.assert.strictEqual(season.id, 2))
            .then(() => findOrCreateLeague('422549177151782925'))
            .then(league => league.getSeasons())
            .then(seasons => chai.assert.lengthOf(seasons, 2))
        );
    });
});
