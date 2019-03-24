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
    hasActiveLobbies,
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
} = proxyquire('../../lib/ihl', {
    './guild': require('../../lib/guildStub'),
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
            const inhouseState = await createInhouseState(new EventEmitter())(args);
            assert.exists(inhouseState);
        });
        
        it('return an inhouse state from a league', async () => {
            const league = await findLeague('422549177151782925');
            const args = {
                league,
                guild: {},
            }
            const inhouseState = await createInhouseState(new EventEmitter())(args);
            assert.exists(inhouseState);
        });
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
        it('emit MSG_QUEUE_BANNED when user timed out', async () => {
            const user = await findUserById(1);
            user.queue_timeout = Date.now() + 10000;
            const eventEmitter = new EventEmitter();
            const listener = sinon.spy();
            eventEmitter.on(CONSTANTS.MSG_QUEUE_BANNED, listener);
            await joinLobbyQueue(user, eventEmitter)({ lobby_name: 'test' });
            assert.isTrue(listener.calledOnce);
        });
        
        it('emit MSG_QUEUE_ALREADY_JOINED when user already in queue', async () => {
            const user = await findUserById(1);
            user.queue_timeout = 0;
            const eventEmitter = new EventEmitter();
            const listener = sinon.spy();
            eventEmitter.on(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, listener);
            await joinLobbyQueue(user, eventEmitter)({ lobby_name: 'funny-yak-74' });
            assert.isTrue(listener.calledOnce);
        });
        
        it('emit MSG_QUEUE_ALREADY_JOINED when user has active lobbies', async () => {
            const user = await findUserById(2);
            user.queue_timeout = 0;
            const eventEmitter = new EventEmitter();
            const listener = sinon.spy();
            eventEmitter.on(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, listener);
            await joinLobbyQueue(user, eventEmitter)({ lobby_name: 'funny-yak-75' });
            assert.isTrue(listener.calledOnce);
        });
        
        it('emit MSG_QUEUE_JOINED', async () => {
            const user = await findUserById(11);
            user.queue_timeout = 0;
            const eventEmitter = new EventEmitter();
            const listener = sinon.spy();
            eventEmitter.on(CONSTANTS.MSG_QUEUE_JOINED, listener);
            await joinLobbyQueue(user, eventEmitter)({ lobby_name: 'funny-yak-75' });
            assert.isTrue(listener.calledOnce);
        });
    });

    describe('getAllLobbyQueues', () => {
        it('join all queues', async () => {
            let getAllLobbyQueues;
            const findAllEnabledQueuesStub = sinon.stub();
            findAllEnabledQueuesStub.resolves([{ queue_name: 'funny-yak-74' }, { queue_name: 'funny-yak-75' }]);
            const { getAllLobbyQueues: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllEnabledQueues: findAllEnabledQueuesStub,
                },
            });
            getAllLobbyQueues = mock;
            
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
            }
            const user = await findUserById(11);
            const eventEmitter = new EventEmitter();
            let queues = await user.getQueues();
            assert.isEmpty(queues);
            await getAllLobbyQueues(inhouseState, user, eventEmitter);
            queues = await user.getQueues();
            assert.lengthOf(queues, 2);
        });
    });
    
    describe('leaveLobbyQueue', () => {
        it('emit MSG_QUEUE_LEFT when user already in queue', async () => {
            const user = await findUserById(1);
            const eventEmitter = new EventEmitter();
            const listener = sinon.spy();
            eventEmitter.on(CONSTANTS.MSG_QUEUE_LEFT, listener);
            await leaveLobbyQueue(user, eventEmitter)({ lobby_name: 'funny-yak-74' });
            assert.isTrue(listener.calledOnce);
        });
        
        it('emit EVENT_QUEUE_NOT_JOINED when not in queue', async () => {
            const user = await findUserById(11);
            const eventEmitter = new EventEmitter();
            const listener = sinon.spy();
            eventEmitter.on(CONSTANTS.EVENT_QUEUE_NOT_JOINED, listener);
            await leaveLobbyQueue(user, eventEmitter)({ lobby_name: 'funny-yak-75' });
            assert.isTrue(listener.calledOnce);
        });
    });

    describe('getAllLobbyQueuesForUser', () => {
        it('do nothing when lobby not exist for queue', async () => {
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
            }
            const user = await findUserById(1);
            const eventEmitter = new EventEmitter();
            await getAllLobbyQueuesForUser(inhouseState, user, eventEmitter);
        });

        it('remove user from all queues', async () => {
            let getAllLobbyQueuesForUser;
            const findAllEnabledQueuesStub = sinon.stub();
            findAllEnabledQueuesStub.resolves([{ queue_name: 'funny-yak-74' }, { queue_name: 'funny-yak-75' }]);
            const { getAllLobbyQueuesForUser: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllEnabledQueues: findAllEnabledQueuesStub,
                },
            });
            getAllLobbyQueuesForUser = mock;
            
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
            }
            const user = await findUserById(1);
            const eventEmitter = new EventEmitter();
            let queues = await user.getQueues();
            assert.lengthOf(queues, 2);
            await getAllLobbyQueuesForUser(inhouseState, user, eventEmitter);
            queues = await user.getQueues();
            assert.isEmpty(queues);
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