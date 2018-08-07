const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const db = require('../models');
const {
    findAllLeagues,
    findAllActiveLobbies,
    findActiveLobbiesForUser,
    findAllInProgressLobbies,
    findAllEnabledQueues,
    findLeague,
    findOrCreateLeague,
    createSeason,
    findOrCreateBot,
    findOrCreateLobby,
    findOrCreateLobbyForGuild,
    findLobby,
    findBot,
    findAllUnassignedBot,
    findUserById,
    findUserByDiscordId,
    findUserBySteamId64,
    findOrCreateUser,
    findOrCreateQueue,
    findLobbyByMatchId,
    updateLeague,
    updateLobbyState,
    updateLobbyName,
    updateBotStatusBySteamId,
    updateBotStatus,
    updateQueuesForUser,
    destroyQueueByName,
    findOrCreateReputation,
    destroyReputation,
    getChallengeBetweenUsers,
    createChallenge,
    destroyChallengeBetweenUsers,
    destroyAllAcceptedChallengeForUser,
    setChallengeAccepted,
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
            path.resolve(path.join(__dirname, '../testdata/fake-reputations.js')),
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

    describe('findAllLeagues', () => {
        it('return leagues', async () => {
            const leagues = await findAllLeagues();
            chai.assert.lengthOf(leagues, 2);
        });
    });

    describe('findAllActiveLobbies', () => {
        it('return lobbies', async () => {
            const lobbies = await findAllActiveLobbies('422549177151782925');
            chai.assert.lengthOf(lobbies, 1);
        });
    });

    describe('findActiveLobbiesForUser', () => {
        it('return lobbies for user', async () => {
            const user = await findUserById(1);
            const lobbies = await findActiveLobbiesForUser(user);
            chai.assert.lengthOf(lobbies, 1);
        });
    });

    describe('findAllInProgressLobbies', () => {
        it('return lobbies', async () => {
            const lobbies = await findAllInProgressLobbies();
            chai.assert.lengthOf(lobbies, 1);
        });
    });

    describe('findAllEnabledQueues', () => {
        it('return queues', async () => {
            const queues = await findAllEnabledQueues('422549177151782925');
            chai.assert.lengthOf(queues, 2);
        });
    });

    describe('findLeague', () => {
        it('return league', async () => {
            const league = await findLeague('422549177151782925');
            chai.assert.exists(league);
        });
    });

    describe('findOrCreateLeague', () => {
        it('return existing league', async () => {
            const league = await findOrCreateLeague('422549177151782925')([
                { queue_type: CONSTANTS.QUEUE_TYPE_DRAFT, queue_name: 'player-draft-queue' },
                { queue_type: CONSTANTS.QUEUE_TYPE_AUTO, queue_name: 'autobalanced-queue2' },
            ]);
            chai.assert.exists(league);
            const queues = await league.getQueues();
            chai.assert.lengthOf(queues, 4);
        });
        it('return new league', async () => {
            const league = await findOrCreateLeague('123')([
                { queue_type: CONSTANTS.QUEUE_TYPE_DRAFT, queue_name: 'player-draft-queue' },
                { queue_type: CONSTANTS.QUEUE_TYPE_AUTO, queue_name: 'autobalanced-queue2' },
            ]);
            chai.assert.exists(league);
            const queues = await league.getQueues();
            chai.assert.lengthOf(queues, 2);
        });
    });

    describe('createSeason', () => {
        it('create new season', async () => {
            const season = await createSeason('422549177151782925');
            chai.assert.exists(season);
            const league = await season.getLeague();
            chai.assert.equal(league.current_season_id, season.id);
        });
    });

    describe('findOrCreateBot', () => {
        it('create new bot', async () => {
            const league = await findLeague('422549177151782925');
            const bot = await findOrCreateBot(league, '123', 'bot3', 'bot3', 'pass');
            chai.assert.exists(bot);
            chai.assert.equal(bot.league_id, league.id);
        });
    });

    describe('findOrCreateLobby', () => {
        it('create new lobby', async () => {
            const league = await findLeague('422549177151782925');
            const lobby = await findOrCreateLobby(league, CONSTANTS.QUEUE_TYPE_DRAFT, 'draft-lobby');
            chai.assert.exists(lobby);
            chai.assert.equal(lobby.queue_type, CONSTANTS.QUEUE_TYPE_DRAFT);
            chai.assert.equal(lobby.league_id, league.id);
            chai.assert.equal(lobby.season_id, league.current_season_id);
        });
    });

    describe('findOrCreateLobbyForGuild', () => {
        it('create new lobby', async () => {
            const league = await findLeague('422549177151782925');
            const lobby = await findOrCreateLobbyForGuild('422549177151782925', CONSTANTS.QUEUE_TYPE_DRAFT, 'draft-lobby');
            chai.assert.exists(lobby);
            chai.assert.equal(lobby.queue_type, CONSTANTS.QUEUE_TYPE_DRAFT);
            chai.assert.equal(lobby.league_id, league.id);
            chai.assert.equal(lobby.season_id, league.current_season_id);
        });
    });

    describe('findLobby', () => {
        it('return existing lobby', async () => {
            const league = await findLeague('422549177151782925');
            const lobby = await findLobby('funny-yak-74');
            chai.assert.exists(lobby);
            chai.assert.equal(lobby.queue_type, CONSTANTS.QUEUE_TYPE_DRAFT);
            chai.assert.equal(lobby.league_id, league.id);
            chai.assert.equal(lobby.season_id, league.current_season_id);
        });
    });

    describe('findBot', () => {
        it('return existing bot', async () => {
            const league = await findLeague('422549177151782925');
            const bot = await findBot(1);
            chai.assert.exists(bot);
            chai.assert.equal(bot.id, 1);
            chai.assert.equal(bot.league_id, league.id);
        });
    });

    describe('findAllUnassignedBot', () => {
        it('return bots not assigned to a lobby', async () => {
            const league = await findLeague('422549177151782925');
            const bots = await findAllUnassignedBot();
            chai.assert.lengthOf(bots, 1);
        });
    });

    describe('findUserById', () => {
        it('return user by id', async () => {
            const league = await findLeague('422549177151782925');
            const user = await findUserById(1);
            chai.assert.exists(user);
            chai.assert.equal(user.league_id, league.id);
        });
    });

    describe('findUserByDiscordId', () => {
        it('return user by discord id', async () => {
            const league = await findLeague('422549177151782925');
            const user = await findUserByDiscordId('422549177151782925')('76864899866697728');
            chai.assert.exists(user);
            chai.assert.equal(user.discord_id, '76864899866697728');
            chai.assert.equal(user.league_id, league.id);
        });
    });

    describe('findUserBySteamId64', () => {
        it('return user by steam id', async () => {
            const league = await findLeague('422549177151782925');
            const user = await findUserBySteamId64('422549177151782925')('76561198015512690');
            chai.assert.exists(user);
            chai.assert.equal(user.steamid_64, '76561198015512690');
            chai.assert.equal(user.league_id, league.id);
        });
    });

    describe('findUserByNicknameLevenshtein', () => {
    });

    describe('findOrCreateUser', () => {
        it('create new user', async () => {
            const league = await findLeague('422549177151782925');
            const user = await findOrCreateUser(league, '123', '456', 70);
            chai.assert.exists(user);
            chai.assert.equal(user.steamid_64, '123');
            chai.assert.equal(user.discord_id, '456');
            chai.assert.equal(user.rank_tier, 70);
            chai.assert.equal(user.league_id, league.id);
        });
    });

    describe('findOrCreateQueue', () => {
        it('create new queue', async () => {
            const league = await findLeague('422549177151782925');
            const queue = await findOrCreateQueue(league, true, CONSTANTS.QUEUE_TYPE_AUTO, 'auto-queue');
            chai.assert.exists(queue);
            chai.assert.isTrue(queue.enabled);
            chai.assert.equal(queue.queue_type, CONSTANTS.QUEUE_TYPE_AUTO);
            chai.assert.equal(queue.queue_name, 'auto-queue');
            chai.assert.equal(queue.league_id, league.id);
        });
    });

    describe('findLobbyByMatchId', () => {
        it('return existing lobby', async () => {
            const lobby = await findLobbyByMatchId('123');
            chai.assert.exists(lobby);
            chai.assert.equal(lobby.id, 2);
        });
    });

    describe('queryUserLeaderboardRank', () => {
    });

    describe('queryLeaderboardRank', () => {
    });

    describe('updateLeague', () => {
        it('update league values', async () => {
            const result = await updateLeague('422549177151782925')({ channel_name: 'test' });
            chai.assert.lengthOf(result, 1);
            const league = await findLeague('422549177151782925');
            chai.assert.equal(league.channel_name, 'test');
        });
    });

    describe('updateLobbyState', () => {
        it('update lobby state', async () => {
            const result = await updateLobbyState({ lobby_name: 'funny-yak-74', password: 'pass' });
            chai.assert.lengthOf(result, 1);
            const lobby = await findLobby('funny-yak-74');
            chai.assert.equal(lobby.password, 'pass');
        });
    });

    describe('updateLobbyName', () => {
        it('update lobby name', async () => {
            const result = await updateLobbyName('funny-yak-74')('renamed-lobby');
            chai.assert.lengthOf(result, 1);
            const lobby = await findLobby('renamed-lobby');
            chai.assert.exists(lobby);
            chai.assert.equal(lobby.id, 1);
        });
    });

    describe('updateBotStatusBySteamId', () => {
        it('update bot status', async () => {
            const result = await updateBotStatusBySteamId(CONSTANTS.BOT_ONLINE)('999991');
            chai.assert.lengthOf(result, 1);
            const bot = await findBot(1);
            chai.assert.exists(bot);
            chai.assert.equal(bot.status, CONSTANTS.BOT_ONLINE);
        });
    });

    describe('updateBotStatus', () => {
        it('update bot status', async () => {
            const result = await updateBotStatus(CONSTANTS.BOT_ONLINE)(1);
            chai.assert.lengthOf(result, 1);
            const bot = await findBot(1);
            chai.assert.exists(bot);
            chai.assert.equal(bot.status, CONSTANTS.BOT_ONLINE);
        });
    });

    describe('updateQueuesForUser', () => {
        it('update lobby queuer', async () => {
            let user = await findUserById(1);
            user = await updateQueuesForUser(false)(user);
            chai.assert.equal(user.id, 1);
            const queues = await user.getQueues();
            chai.assert.lengthOf(queues, 2);
            chai.assert.isFalse(queues[0].LobbyQueuer.active);
            chai.assert.isFalse(queues[1].LobbyQueuer.active);
        });
    });

    describe('destroyQueueByName', () => {
        it('destroy queue', async () => {
            const league = await findLeague('422549177151782925');
            let queue = await db.Queue.findOne({ where: { id: 3 } });
            chai.assert.exists(queue);
            await destroyQueueByName(league)(queue.queue_name);
            queue = await db.Queue.findOne({ where: { id: 3 } });
            chai.assert.notExists(queue);
        });
    });

    describe('findOrCreateReputation', () => {
        it('create reputation', async () => {
            const league = await findLeague('422549177151782925');
            const giver = await findUserById(1);
            const receiver = await findUserById(2);
            const rep = await findOrCreateReputation(league)(giver)(receiver);
            chai.assert.exists(rep);
            chai.assert.equal(rep.league_id, 1);
            chai.assert.equal(rep.giver_user_id, giver.id);
            chai.assert.equal(rep.recipient_user_id, receiver.id);
        });
    });

    describe('destroyReputation', () => {
        it('destroy reputation', async () => {
            const league = await findLeague('422549177151782925');
            const giver = await findUserById(3);
            const receiver = await findUserById(1);
            const result = await destroyReputation(league)(giver)(receiver);
            chai.assert.equal(result, 1);
        });
    });

    describe('getChallengeBetweenUsers', () => {
        it('return undefined', async () => {
            const user1 = await findUserById(1);
            const user2 = await findUserById(2);
            const challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.notExists(challenge);
        });
        
        it('return accepted challenge', async () => {
            const user1 = await findUserById(4);
            const user2 = await findUserById(3);
            const challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.exists(challenge);
            chai.assert.isTrue(challenge.accepted);
        });
        
        it('return challenge', async () => {
            const user1 = await findUserById(1);
            const user2 = await findUserById(2);
            const challenge = await getChallengeBetweenUsers(user2)(user1);
            chai.assert.exists(challenge);
            chai.assert.isFalse(challenge.accepted);
        });
    });

    describe('createChallenge', () => {
        it('create challenge', async () => {
            const user1 = await findUserById(1);
            const user2 = await findUserById(2);
            const challenge = await createChallenge(user1)(user2);
            chai.assert.exists(challenge);
            chai.assert.isFalse(challenge.accepted);
            chai.assert.equal(challenge.giver_user_id, user1.id);
            chai.assert.equal(challenge.recipient_user_id, user2.id);
        });
    });

    describe('destroyChallengeBetweenUsers', () => {
        it('destroy any challenge between users', async () => {
            const user1 = await findUserById(1);
            const user2 = await findUserById(2);
            let challenge = await getChallengeBetweenUsers(user2)(user1);
            chai.assert.exists(challenge);
            await destroyChallengeBetweenUsers(user2)(user1);
            challenge = await getChallengeBetweenUsers(user2)(user1);
            chai.assert.notExists(challenge);
        });
    });

    describe('destroyAllAcceptedChallengeForUser', () => {
        it('destroy challenges for user 1', async () => {
            const user1 = await findUserById(4);
            const user2 = await findUserById(3);
            let challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.exists(challenge);
            chai.assert.isTrue(challenge.accepted);
            await destroyAllAcceptedChallengeForUser(user1);
            challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.notExists(challenge);
        });
        
        it('destroy challenges for user 2', async () => {
            const user1 = await findUserById(4);
            const user2 = await findUserById(3);
            let challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.exists(challenge);
            chai.assert.isTrue(challenge.accepted);
            await destroyAllAcceptedChallengeForUser(user2);
            challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.notExists(challenge);
        });
        
        it('not destroy unaccepted challenge', async () => {
            const user1 = await findUserById(3);
            const user2 = await findUserById(2);
            let challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.exists(challenge);
            chai.assert.isFalse(challenge.accepted);
            await destroyAllAcceptedChallengeForUser(user2);
            challenge = await getChallengeBetweenUsers(user1)(user2);
            chai.assert.exists(challenge);
            chai.assert.isFalse(challenge.accepted);
        });
    });

    describe('setChallengeAccepted', () => {
        it('set accepted to true', async () => {
            let challenge = await db.Challenge.findOne({ where: { id: 1 } });
            chai.assert.isFalse(challenge.accepted);
            await setChallengeAccepted(challenge);
            challenge = await db.Challenge.findOne({ where: { id: 1 } });
        });
    });
});
