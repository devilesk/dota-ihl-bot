require('../common.db');
require('../common.nock');
require('../common');
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
} = require('../../lib/ihl');
const Db = require('../../lib/db');
const Lobby = require('../../lib/lobby');

describe('Database', () => {
    let nockDone;
    before(async () => {
        ({ nockDone } = await nockBack('unit_ihl.json', { before: prepareScope, afterRecord }));
        sinon.stub(Lobby, 'lobbyToLobbyState').callsFake(() => () => async () => sinon.stub());
    });

    beforeEach((done) => {
        sequelize_fixtures.loadFiles([
            path.resolve(path.join(__dirname, '../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyplayers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyqueuers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-challenges.js')),
        ], db, { log: () => {} }).then(() => {
            done();
        });
    });

    after(async () => {
        await nockDone();
        Lobby.lobbyToLobbyState.restore();
    });

    const lobbyName = 'funny-yak-74';
    const id = 1;

    describe('getUserRankTier', () => {
        it('return a null rank tier', async () => {
            const rankTier = await getUserRankTier('76561198015512690');
            assert.isNull(rankTier);
        });
        it('return a rank tier', async () => {
            const rankTier = await getUserRankTier('76561198065444496');
            assert.exists(rankTier);
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
                    readyCheckTimeout: 200,
                    captainRankThreshold: 100,
                    captainRoleRegexp: 'test',
                    categoryName: 'category',
                    channelName: 'channel',
                    adminRoleName: 'admin',
                    defaultGameMode: 'cm',
                    matchmakingSystem: 'elo',
                    leagueid: 1,
                },
                guild: new Mocks.MockGuild(),
            };
            const inhouseState = await createInhouseState(args);
            assert.exists(inhouseState);
        });

        it('return an inhouse state from a league', async () => {
            const league = await Db.findLeague('422549177151782925');
            const args = {
                league,
                guild: new Mocks.MockGuild(),
            };
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
        before(() => {
            sinon.stub(Db, 'findActiveLobbiesForUser');
        });

        after(() => {
            Db.findActiveLobbiesForUser.restore();
        });

        it('return true when user has active lobbies', async () => {
            Db.findActiveLobbiesForUser.resolves([{}]);
            const result = await hasActiveLobbies({});
            assert.isTrue(result);
        });

        it('return false when user has no active lobbies', async () => {
            Db.findActiveLobbiesForUser.resolves([]);
            const result = await hasActiveLobbies({});
            assert.isFalse(result);
        });
    });

    describe('joinLobbyQueue', () => {
        it('return QUEUE_BANNED when user timed out', async () => {
            const user = await Db.findUserById(1);
            user.queueTimeout = Date.now() + 10000;
            const value = await joinLobbyQueue(user)({ lobbyName: 'test' });
            assert.equal(CONSTANTS.QUEUE_BANNED, value);
        });

        it('return QUEUE_ALREADY_JOINED when user already in queue', async () => {
            const user = await Db.findUserById(1);
            user.queueTimeout = 0;
            const value = await joinLobbyQueue(user)({ id });
            assert.equal(CONSTANTS.QUEUE_ALREADY_JOINED, value);
        });

        it('return QUEUE_ALREADY_JOINED when user has active lobbies', async () => {
            const user = await Db.findUserById(2);
            user.queueTimeout = 0;
            const value = await joinLobbyQueue(user)({ id: 2 });
            assert.equal(CONSTANTS.QUEUE_ALREADY_JOINED, value);
        });

        it('return QUEUE_JOINED', async () => {
            const user = await Db.findUserById(11);
            user.queueTimeout = 0;
            const value = await joinLobbyQueue(user)({ id: 2, state: CONSTANTS.STATE_WAITING_FOR_QUEUE });
            assert.equal(CONSTANTS.QUEUE_JOINED, value);
        });
    });

    describe('getAllLobbyQueues', () => {
        it('return queuing lobbies for inhouse', async () => {
            const inhouseState = {
                guild: { id: '422549177151782925' },
                category: { name: 'test' },
            };
            const lobbyStates = await getAllLobbyQueues(inhouseState);
            assert.lengthOf(lobbyStates, 1);
        });
    });

    describe('leaveLobbyQueue', () => {
        it('return true when user already in queue', async () => {
            const user = await Db.findUserById(1);
            const value = await leaveLobbyQueue(user)({ id });
            assert.isTrue(value);
        });

        it('return false when not in queue', async () => {
            const user = await Db.findUserById(11);
            const value = await leaveLobbyQueue(user)({ id: 2 });
            assert.isFalse(value);
        });
    });

    describe('getAllLobbyQueuesForUser', () => {
        it('do nothing when lobby not exist for queue', async () => {
            const inhouseState = {
                guild: { id: '422549177151782925' },
                category: { name: 'test' },
            };
            const user = await Db.findUserById(1);
            const lobbies = await getAllLobbyQueuesForUser(inhouseState, user);
            assert.lengthOf(lobbies, 2);
        });
    });

    describe('banInhouseQueue', () => {
        it('set user timeout', async () => {
            let user = await Db.findUserById(1);
            assert.notExists(user.queueTimeout);
            user = await banInhouseQueue(user, 10);
            const diff = user.queueTimeout - Date.now() - 600000;
            assert.isAtMost(diff, 1000);
            assert.isAtLeast(diff, -1000);
        });
    });
});
