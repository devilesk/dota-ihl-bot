const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const EventEmitter = require('events').EventEmitter;
const db = require('../models');
const {
    getUserRankTier,
    registerUser,
    createInhouseState,
    getLobbyFromInhouse,
    addLobbyToInhouse,
    removeLobbyFromInhouseByName,
    removeLobbyFromInhouse,
    createChallengeLobbyForInhouse,
    loadLobbiesIntoInhouse,
    runLobbiesForInhouse,
    loadQueuesIntoInhouse,
    getQueueFromInhouseByName,
    getQueueFromInhouseByType,
    addQueueToInhouse,
    removeQueueFromInhouse,
    reloadQueueForInhouse,
    hasActiveLobbies,
    joinLobbyQueue,
    joinAllQueues,
    leaveLobbyQueue,
    leaveAllQueues,
    banInhouseQueue,
} = proxyquire('../lib/ihl', {
    './guild': require('../lib/guildStub'),
});
const {
    getActiveQueuers,
} = require('../lib/lobby');
const {
    findLeague,
} = require('../lib/db');
const CONSTANTS = require('../lib/constants');

describe('Database', () => {
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
            path.resolve(path.join(__dirname, '../testdata/fake-challenges.js')),
        ],
        { logging: false },
    );

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox && sandbox.restore();
    });

    describe('getUserRankTier', () => {
        it('return a rank tier', async () => {
            const rank_tier = await getUserRankTier('76561198015512690');
            assert.equal(rank_tier, 65);
        });
    });

    describe('registerUser', () => {
        it('return an existing user', async () => {
            const user = await registerUser('422549177151782925', '76561198015512690', '76864899866697728');
            assert.exists(user);
        });
        
        it('return a new user', async () => {
            const user = await registerUser('88641069939453952', '76561198015512690', '76864899866697728');
            assert.exists(user);
        });
    });

    describe('createInhouseState', () => {
        it('return an inhouse state', async () => {
            const args = {
                league: {
                    ready_check_timeout: 200,
                    captain_rank_threshold: 100,
                    captain_role_regexp: 'test',
                    category_name: 'category',
                    channel_name: 'channel',
                    admin_role_name: 'admin',
                    default_game_mode: 'cm',
                },
                guild: {},
            }
            const inhouseState = await createInhouseState(args);
            assert.exists(inhouseState);
        });
        
        it('return an inhouse state from a league', async () => {
            const league = await findLeague('422549177151782925');
            const args = {
                league,
                guild: {},
            }
            const inhouseState = await createInhouseState(args);
            assert.exists(inhouseState);
        });
    });

    describe('getLobbyFromInhouse', () => {
        it('return a lobby state', async () => {
            const inhouseState = {
                lobbies: [{ lobby_name: 'test' }],
            };
            const lobbyState = getLobbyFromInhouse(inhouseState, 'test');
            assert.exists(lobbyState);
            assert.equal(lobbyState.lobby_name, 'test');
        });
        
        it('return null', async () => {
            const inhouseState = {
                lobbies: [{ lobby_name: 'test2' }],
            };
            const lobbyState = getLobbyFromInhouse(inhouseState, 'test');
            assert.isUndefined(lobbyState);
        });
    });

    describe('addLobbyToInhouse', () => {
        it('add new lobby', async () => {
            const lobby = { lobby_name: 'test' };
            let inhouseState = {
                lobbies: [],
            };
            inhouseState = addLobbyToInhouse(inhouseState, lobby);
            assert.lengthOf(inhouseState.lobbies, 1);
            assert.strictEqual(lobby, inhouseState.lobbies[0]);
        });
        
        it('add second lobby', async () => {
            const lobby = { lobby_name: 'test' };
            let inhouseState = {
                lobbies: [{ lobby_name: 'test2' }],
            };
            inhouseState = addLobbyToInhouse(inhouseState, lobby);
            assert.lengthOf(inhouseState.lobbies, 2);
        });
        
        it('add existing lobby', async () => {
            const lobby = { lobby_name: 'test' };
            let inhouseState = {
                lobbies: [lobby],
            };
            inhouseState = addLobbyToInhouse(inhouseState, lobby);
            assert.lengthOf(inhouseState.lobbies, 1);
            assert.strictEqual(lobby, inhouseState.lobbies[0]);
        });
    });

    describe('removeLobbyFromInhouseByName', () => {
        it('remove lobby', async () => {
            let inhouseState = {
                lobbies: [{ lobby_name: 'test' }],
            };
            inhouseState = removeLobbyFromInhouseByName('test')(inhouseState);
            assert.lengthOf(inhouseState.lobbies, 0);
        });
        
        it('remove second lobby', async () => {
            let inhouseState = {
                lobbies: [{ lobby_name: 'test2' }, { lobby_name: 'test' }],
            };
            inhouseState = removeLobbyFromInhouseByName('test')(inhouseState);
            assert.lengthOf(inhouseState.lobbies, 1);
            assert.equal(inhouseState.lobbies[0].lobby_name, 'test2');
        });
    });

    describe('removeLobbyFromInhouse', () => {
        it('remove lobby', async () => {
            let inhouseState = {
                lobbies: [{ lobby_name: 'test' }],
            };
            inhouseState = removeLobbyFromInhouse({ lobby_name: 'test' })(inhouseState);
            assert.lengthOf(inhouseState.lobbies, 0);
        });
        
        it('remove second lobby', async () => {
            let inhouseState = {
                lobbies: [{ lobby_name: 'test2' }, { lobby_name: 'test' }],
            };
            inhouseState = removeLobbyFromInhouse({ lobby_name: 'test' })(inhouseState);
            assert.lengthOf(inhouseState.lobbies, 1);
            assert.equal(inhouseState.lobbies[0].lobby_name, 'test2');
        });
    });

    describe('createChallengeLobbyForInhouse', () => {
        it('create challenge lobby', async () => {
            let inhouseState = {
                guild: { id: '422549177151782925' },
                lobbies: [],
                queues: [],
            };
            const captain_1 = await db.User.find({ where: { id: 2 } });
            const captain_2 = await db.User.find({ where: { id: 1 } });
            const challenge = await db.Challenge.find({ where: { id: 1 } });
            const resolveUser = sinon.stub();
            resolveUser.withArgs(sinon.match.any, captain_1.discord_id).resolves({ displayName: 'test1' });
            resolveUser.withArgs(sinon.match.any, captain_2.discord_id).resolves({ displayName: 'test2' });
            const eventEmitter = new EventEmitter();
            const findOrCreateChannelInCategory = () => true;
            const getLobbyRole = guild => async () => true;
            assert.lengthOf(inhouseState.queues, 0);
            assert.lengthOf(inhouseState.lobbies, 0);
            assert.isFalse(challenge.accepted);
            inhouseState = await createChallengeLobbyForInhouse({ resolveUser, findOrCreateChannelInCategory, getLobbyRole })(inhouseState, challenge, eventEmitter, captain_1, captain_2);
            assert.isTrue(challenge.accepted);
            assert.lengthOf(inhouseState.lobbies, 1);
            assert.lengthOf(inhouseState.queues, 1);
            const queue = inhouseState.queues[0];
            const lobbyState = inhouseState.lobbies[0];
            assert.equal(queue.queue_type, CONSTANTS.QUEUE_TYPE_CHALLENGE);
            assert.equal(lobbyState.queue_type, CONSTANTS.QUEUE_TYPE_CHALLENGE);
            assert.equal(queue.queue_name, lobbyState.lobby_name);
            assert.equal(lobbyState.captain_1_user_id, captain_1.id);
            assert.equal(lobbyState.captain_2_user_id, captain_2.id);
            const queuers = await getActiveQueuers()(lobbyState);
            assert.lengthOf(queuers, 2);
            assert.equal(lobbyState.state, CONSTANTS.STATE_WAITING_FOR_QUEUE);
        });
    });

});