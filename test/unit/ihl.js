const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const EventEmitter = require('events').EventEmitter;
const db = require('../../models');
const {
    getUserRankTier,
    registerUser,
    createInhouseState,
    initLeague,
    createNewLeague,
    createLobbiesFromQueues,
    hasActiveLobbies,
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
} = proxyquire('../../lib/ihl', {
    './guild': require('../../lib/guildStub'),
    './lobby': {
        lobbyToLobbyState: () => () => async () => sinon.stub(),
    }
});
const {
    getActiveQueuers,
} = require('../../lib/lobby');
const {
    findLeague,
    findUserById,
} = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');

describe('Database', () => {
    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyplayers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyqueuers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-challenges.js')),
        ],
        { logging: false },
    );
    
    const lobby_name = 'funny-yak-74';
    const id = 1;

    describe('getUserRankTier', () => {
        it('return a rank tier', async () => {
            const rank_tier = await getUserRankTier('76561198015512690');
            assert.equal(rank_tier, null);
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
    
    describe('initLeague', () => {
        // TODO
    });
    
    describe('createNewLeague', () => {
        // TODO
    });
    
    describe('createLobbiesFromQueues', () => {
        // TODO
    });

    describe('hasActiveLobbies', () => {
        it('return true when user has active lobbies', async () => {
            let hasActiveLobbies;
            const findActiveLobbiesForUserStub = sinon.stub();
            findActiveLobbiesForUserStub.resolves([{}]);
            const { hasActiveLobbies: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findActiveLobbiesForUser: findActiveLobbiesForUserStub,
                },
            });
            hasActiveLobbies = mock;

            const result = await hasActiveLobbies({});
            assert.isTrue(result);
        });
        
        it('return false when user has no active lobbies', async () => {
            let hasActiveLobbies;
            const findActiveLobbiesForUserStub = sinon.stub();
            findActiveLobbiesForUserStub.resolves([]);
            const { hasActiveLobbies: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findActiveLobbiesForUser: findActiveLobbiesForUserStub,
                },
            });
            hasActiveLobbies = mock;

            const result = await hasActiveLobbies({});
            assert.isFalse(result);
        });
    });

    describe('joinLobbyQueue', () => {
        it('return MSG_QUEUE_BANNED when user timed out', async () => {
            const user = await findUserById(1);
            user.queue_timeout = Date.now() + 10000;
            const value = await joinLobbyQueue(user)({ lobby_name: 'test' });
            assert.equal(CONSTANTS.MSG_QUEUE_BANNED, value);
        });
        
        it('return MSG_QUEUE_ALREADY_JOINED when user already in queue', async () => {
            const user = await findUserById(1);
            user.queue_timeout = 0;
            const value = await joinLobbyQueue(user)({ id });
            assert.equal(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, value);
        });
        
        it('return MSG_QUEUE_ALREADY_JOINED when user has active lobbies', async () => {
            const user = await findUserById(2);
            user.queue_timeout = 0;
            const value = await joinLobbyQueue(user)({ id: 2 });
            assert.equal(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, value);
        });
        
        it('return MSG_QUEUE_JOINED', async () => {
            const user = await findUserById(11);
            user.queue_timeout = 0;
            const value = await joinLobbyQueue(user)({ id: 2, state: CONSTANTS.STATE_WAITING_FOR_QUEUE });
            assert.equal(CONSTANTS.MSG_QUEUE_JOINED, value);
        });
    });

    describe('getAllLobbyQueues', () => {
        it('return queuing lobbies for inhouse', async () => {
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
                category: {
                    name: 'test',
                },
            }
            const lobbyStates = await getAllLobbyQueues(inhouseState);
            assert.lengthOf(lobbyStates, 1);
        });
    });
    
    describe('leaveLobbyQueue', () => {
        it('return true when user already in queue', async () => {
            const user = await findUserById(1);
            const value = await leaveLobbyQueue(user)({ id });
            assert.isTrue(value);
        });
        
        it('return false when not in queue', async () => {
            const user = await findUserById(11);
            const value = await leaveLobbyQueue(user)({ id: 2 });
            assert.isFalse(value);
        });
    });

    describe('getAllLobbyQueuesForUser', () => {
        it('do nothing when lobby not exist for queue', async () => {
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
                category: {
                    name: 'test',
                },
            }
            const user = await findUserById(1);
            const lobbies = await getAllLobbyQueuesForUser(inhouseState, user);
            assert.lengthOf(lobbies, 2);
        });
    });

    describe('banInhouseQueue', () => {
        it('set user timeout', async () => {
            let user = await findUserById(1);
            assert.notExists(user.queue_timeout);
            user = await banInhouseQueue(user, 10);
            const diff = user.queue_timeout - Date.now() - 600000;
            assert.isAtMost(diff, 1000);
            assert.isAtLeast(diff, -1000);
        });
    });
});