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
    getLobbyFromInhouse,
    getLobbyFromInhouseByChannelId,
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
    transformLeagueGuild,
    loadInhouseState,
    isMessageFromInhouse,
    isMessageFromInhouseAdmin,
    isMessageFromInhouseLobby,
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

    describe('getLobbyFromInhouseByChannelId', () => {
        it('return a lobby state', async () => {
            const inhouseState = {
                lobbies: [{ channel: {id: 1} }],
            };
            const lobbyState = getLobbyFromInhouseByChannelId(inhouseState, 1);
            assert.exists(lobbyState);
            assert.equal(lobbyState.channel.id, 1);
        });
        
        it('return null', async () => {
            const inhouseState = {
                lobbies: [{ channel: {id: 2} }],
            };
            const lobbyState = getLobbyFromInhouseByChannelId(inhouseState, 1);
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
            assert.isEmpty(inhouseState.lobbies);
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
            assert.isEmpty(inhouseState.lobbies);
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
            const makeRole = guild => permissions => mentionable => async () => true;
            assert.isEmpty(inhouseState.queues);
            assert.isEmpty(inhouseState.lobbies);
            assert.isFalse(challenge.accepted);
            inhouseState = await createChallengeLobbyForInhouse({ resolveUser, findOrCreateChannelInCategory, makeRole })({ inhouseState, challenge, eventEmitter, captain_1, captain_2 });
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

    describe('loadLobbiesIntoInhouse', () => {
        it('return inhouse state with loaded lobbies', async () => {
            let loadLobbiesIntoInhouse;
            const findAllActiveLobbiesStub = sinon.stub();
            findAllActiveLobbiesStub.resolves([{}]);
            const lobbyToLobbyStateStub = sinon.stub();
            lobbyToLobbyStateStub.resolves(true);
            const { loadLobbiesIntoInhouse: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllActiveLobbies: findAllActiveLobbiesStub,
                },
                './lobby': {
                    lobbyToLobbyState: () => () => lobbyToLobbyStateStub,
                },
            });
            loadLobbiesIntoInhouse = mock;
            
            let inhouseState = {
                guild: { id: '422549177151782925' },
                lobbies: [],
                queues: [],
            };
            const eventEmitter = new EventEmitter();
            const findOrCreateChannelInCategory = () => true;
            const makeRole = guild => permissions => mentionable => async () => true;
            assert.isEmpty(inhouseState.queues);
            assert.isEmpty(inhouseState.lobbies);
            inhouseState = await loadLobbiesIntoInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole })(inhouseState);
            assert.lengthOf(inhouseState.lobbies, 1);
            assert.isTrue(inhouseState.lobbies[0]);
        });
        
        it('return inhouse state with empty lobbies', async () => {
            let loadLobbiesIntoInhouse;
            const findAllActiveLobbiesStub = sinon.stub();
            findAllActiveLobbiesStub.resolves([{}]);
            const lobbyToLobbyStateStub = sinon.stub();
            lobbyToLobbyStateStub.rejects();
            const { loadLobbiesIntoInhouse: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllActiveLobbies: findAllActiveLobbiesStub,
                },
                './lobby': {
                    lobbyToLobbyState: () => () => lobbyToLobbyStateStub,
                },
            });
            loadLobbiesIntoInhouse = mock;
            
            let inhouseState = {
                guild: { id: '422549177151782925' },
                lobbies: [],
                queues: [],
            };
            const eventEmitter = new EventEmitter();
            const findOrCreateChannelInCategory = () => true;
            const makeRole = guild => permissions => mentionable => async () => true;
            assert.isEmpty(inhouseState.queues);
            assert.isEmpty(inhouseState.lobbies);
            inhouseState = await loadLobbiesIntoInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole })(inhouseState);
            assert.isEmpty(inhouseState.lobbies);
        });
    });

    describe('runLobbiesForInhouse', () => {
        it('return inhouse state and run lobbies', async () => {
            let runLobbiesForInhouse;
            const runLobbyStub = sinon.stub();
            runLobbyStub.resolves([{}]);
            const { runLobbiesForInhouse: mock } = proxyquire('../../lib/ihl', {
                './lobby': {
                    runLobby: runLobbyStub,
                },
            });
            runLobbiesForInhouse = mock;
            
            let inhouseState = {
                guild: { id: '422549177151782925' },
                lobbies: [{}, {}],
                queues: [],
            };
            const eventEmitter = new EventEmitter();
            assert.isEmpty(inhouseState.queues);
            assert.lengthOf(inhouseState.lobbies, 2);
            inhouseState = await runLobbiesForInhouse(eventEmitter)(inhouseState);
            assert.lengthOf(inhouseState.lobbies, 2);
        });
    });

    describe('loadQueuesIntoInhouse', () => {
        it('return inhouse state with loaded queues', async () => {
            let loadQueuesIntoInhouse;
            const findAllEnabledQueuesStub = sinon.stub();
            findAllEnabledQueuesStub.resolves([{}]);
            const loadQueueStub = sinon.stub();
            loadQueueStub.resolves({ queueState: {} });
            const { loadQueuesIntoInhouse: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllEnabledQueues: findAllEnabledQueuesStub,
                },
                './queue': {
                    loadQueue: () => () => loadQueueStub,
                },
            });
            loadQueuesIntoInhouse = mock;
            
            let inhouseState = {
                guild: { id: '422549177151782925' },
                lobbies: [],
                queues: [],
            };
            const eventEmitter = new EventEmitter();
            const findOrCreateChannelInCategory = () => true;
            const makeRole = guild => permissions => mentionable => async () => true;
            assert.isEmpty(inhouseState.queues);
            assert.isEmpty(inhouseState.lobbies);
            inhouseState = await loadQueuesIntoInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole })(inhouseState);
            assert.lengthOf(inhouseState.queues, 1);
        });
        
        it('return inhouse state with empty queues', async () => {
            let loadQueuesIntoInhouse;
            const findAllEnabledQueuesStub = sinon.stub();
            findAllEnabledQueuesStub.resolves([{}]);
            const loadQueueStub = sinon.stub();
            loadQueueStub.rejects();
            const { loadQueuesIntoInhouse: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllEnabledQueues: findAllEnabledQueuesStub,
                },
                './queue': {
                    loadQueue: () => () => loadQueueStub,
                },
            });
            loadQueuesIntoInhouse = mock;
            
            let inhouseState = {
                guild: { id: '422549177151782925' },
                lobbies: [],
                queues: [],
            };
            const eventEmitter = new EventEmitter();
            const findOrCreateChannelInCategory = () => true;
            const makeRole = guild => permissions => mentionable => async () => true;
            assert.isEmpty(inhouseState.queues);
            assert.isEmpty(inhouseState.lobbies);
            inhouseState = await loadQueuesIntoInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole })(inhouseState);
            assert.isEmpty(inhouseState.queues);
        });
    });

    describe('getQueueFromInhouseByName', () => {
        it('return queue from inhouse state', async () => {
            const inhouseState = {
                queues: [
                    {
                        queue_name: 'test',
                    },
                    {
                        queue_name: 'test2',
                    },
                ],
            };
            const queue = getQueueFromInhouseByName(inhouseState, 'test');
            assert.equal(queue.queue_name, 'test');
        });
    });

    describe('getQueueFromInhouseByType', () => {
        it('return queue from inhouse state', async () => {
            const inhouseState = {
                queues: [
                    {
                        queue_type: 'test',
                    },
                    {
                        queue_type: 'test2',
                    },
                ],
            };
            const queue = getQueueFromInhouseByType(inhouseState, 'test');
            assert.equal(queue.queue_type, 'test');
        });
    });

    describe('addQueueToInhouse', () => {
        it('add queue to inhouse state', async () => {
            const queue = {
                queue_name: 'test',
            }
            let inhouseState = {
                queues: [],
            };
            inhouseState = addQueueToInhouse(inhouseState, queue);
            assert.lengthOf(inhouseState.queues, 1);
        });
        
        it('do not add existing queue to inhouse state', async () => {
            const queue = {
                queue_name: 'test',
            }
            let inhouseState = {
                queues: [{ queue_name: 'test' }],
            };
            inhouseState = addQueueToInhouse(inhouseState, queue);
            assert.lengthOf(inhouseState.queues, 1);
        });
    });

    describe('removeQueueFromInhouse', () => {
        it('remove queue from inhouse state', async () => {
            let inhouseState = {
                queues: [{ queue_name: 'test' }],
            };
            inhouseState = removeQueueFromInhouse(inhouseState, 'test');
            assert.isEmpty(inhouseState.queues);
        });
    });

    describe('reloadQueueForInhouse', () => {
        it('remove challenge queue from inhouse state', async () => {
            let inhouseState = {
                queues: [{ queue_name: 'test' }],
            };
            const lobbyState = { lobby_name: 'test', queue_type: CONSTANTS.QUEUE_TYPE_CHALLENGE };
            const eventEmitter = new EventEmitter();
            const findOrCreateChannelInCategory = () => true;
            const makeRole = guild => permissions => mentionable => async () => true;
            inhouseState = await reloadQueueForInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole })(lobbyState)(inhouseState);
            assert.isEmpty(inhouseState.queues);
        });
        
        it('reload queue from inhouse state', async () => {
            let reloadQueueForInhouse;
            const loadQueueStub = sinon.stub();
            loadQueueStub.resolves({ queueState: { queue_name: 'test' }, lobbyState: { lobby_name: 'test' } });
            const { reloadQueueForInhouse: mock } = proxyquire('../../lib/ihl', {
                './queue': {
                    loadQueue: () => () => loadQueueStub,
                },
            });
            reloadQueueForInhouse = mock;

            const findOrCreateChannelInCategory = () => true;
            const makeRole = guild => permissions => mentionable => async () => true;
            
            let inhouseState = {
                lobbies: [],
                queues: [
                    {
                        queue_name: 'test2',
                        queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
                    }
                ],
            };
            const lobbyState = { lobby_name: 'test', queue_type: CONSTANTS.QUEUE_TYPE_DRAFT };
            const eventEmitter = new EventEmitter();
            inhouseState = await reloadQueueForInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole })(lobbyState)(inhouseState);
            assert.lengthOf(inhouseState.queues, 2);
            assert.lengthOf(inhouseState.lobbies, 1);
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

    describe('joinAllQueues', () => {
        it('join all queues', async () => {
            let joinAllQueues;
            const findAllEnabledQueuesStub = sinon.stub();
            findAllEnabledQueuesStub.resolves([{ queue_name: 'funny-yak-74' }, { queue_name: 'funny-yak-75' }]);
            const { joinAllQueues: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllEnabledQueues: findAllEnabledQueuesStub,
                },
            });
            joinAllQueues = mock;
            
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
            }
            const user = await findUserById(11);
            const eventEmitter = new EventEmitter();
            let queues = await user.getQueues();
            assert.isEmpty(queues);
            await joinAllQueues(inhouseState, user, eventEmitter);
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

    describe('leaveAllQueues', () => {
        it('do nothing when lobby not exist for queue', async () => {
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
            }
            const user = await findUserById(1);
            const eventEmitter = new EventEmitter();
            await leaveAllQueues(inhouseState, user, eventEmitter);
        });

        it('remove user from all queues', async () => {
            let leaveAllQueues;
            const findAllEnabledQueuesStub = sinon.stub();
            findAllEnabledQueuesStub.resolves([{ queue_name: 'funny-yak-74' }, { queue_name: 'funny-yak-75' }]);
            const { leaveAllQueues: mock } = proxyquire('../../lib/ihl', {
                './db': {
                    findAllEnabledQueues: findAllEnabledQueuesStub,
                },
            });
            leaveAllQueues = mock;
            
            const inhouseState = {
                guild: {
                    id: '422549177151782925',
                },
            }
            const user = await findUserById(1);
            const eventEmitter = new EventEmitter();
            let queues = await user.getQueues();
            assert.lengthOf(queues, 2);
            await leaveAllQueues(inhouseState, user, eventEmitter);
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
    
    describe('transformLeagueGuild', () => {
        it('return LeagueGuildObject', async () => {
            const guild = {guild: {id: 1}};
            const get = sinon.stub();
            get.withArgs(1).returns(guild);
            const guilds = {get};
            const league = {id: 1, guild_id: 1};
            const leagueGuild = transformLeagueGuild(guilds)(league);
            assert.isTrue(guilds.get.calledOnce);
            assert.deepEqual(leagueGuild.league, league);
            assert.deepEqual(leagueGuild.guild, guild);
        });
    });
    
    describe('loadInhouseState', () => {
        // TODO
    });
    
    describe('isMessageFromInhouse', () => {
        // TODO
    });
    
    describe('isMessageFromInhouseAdmin', () => {
        // TODO
    });
    
    describe('isMessageFromInhouseLobby', () => {
        // TODO
    });

});