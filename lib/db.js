/**
 * @module db
 * @description Database functions
 */

/**
 * External namespace for discord.js classes.
 * @external sequelize
 * @category Sequelize
 * @see {@link http://docs.sequelizejs.com/}
 */

/**
 * External Sequelize Model class.
 * @class Model
 * @category Sequelize
 * @memberof external:sequelize
 * @see {@link http://docs.sequelizejs.com/class/lib/model.js~Model.html}
 */

const Sequelize = require('sequelize');
const logger = require('./logger');
const cache = require('./cache');
const Fp = require('./util/fp');
const db = require('../models');
const CONSTANTS = require('./constants');
const { hri } = require('human-readable-ids');

const { Op } = Sequelize;

const findAllLeagues = async () => db.League.findAll();

const findAllActiveLobbiesForInhouse = async guildId => db.Lobby.findAll({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_COMPLETED, CONSTANTS.STATE_COMPLETED_NO_STATS, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } }, include: [{ model: db.League, where: { guildId } }] });

const findAllActiveLobbies = async () => db.Lobby.findAll({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_COMPLETED, CONSTANTS.STATE_COMPLETED_NO_STATS, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } } });

const findActiveLobbiesForUser = async user => user.getLobbies({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_COMPLETED, CONSTANTS.STATE_COMPLETED_NO_STATS, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } } });

const findAllInProgressLobbies = async () => db.Lobby.findAll({ where: { state: CONSTANTS.STATE_MATCH_IN_PROGRESS } });

const findAllMatchEndedLobbies = async () => db.Lobby.findAll({ where: { state: CONSTANTS.STATE_MATCH_ENDED } });

const findAllLobbiesInState = async state => db.Lobby.findAll({ where: { state } });

const findAllLobbiesInStateForInhouse = state => async guildId => db.Lobby.findAll({ where: { state }, include: [{ model: db.League, where: { guildId } }] });

const findAllLobbiesForInhouse = async league => db.Lobby.findAll({ where: { leagueId: league.id } });

const findAllEnabledQueues = async guildId => db.Queue.findAll({ where: { enabled: true }, include: [{ model: db.League, where: { guildId } }] });

const findLeague = async (guildId) => {
    for (const league of cache.Leagues.values()) {
        if (league.guildId === guildId) return league;
    }
    const league = await db.League.findOne({ where: { guildId } });
    if (league) cache.Leagues.set(league.id, league);
    return league;
};

const findLeagueById = async (id) => {
    let league = cache.Leagues.get(id);
    if (league) return league;
    league = await db.League.findOne({ where: { id } });
    if (league) cache.Leagues.set(league.id, league);
    return league;
};

const findOrCreateLeague = guildId => async (queues) => {
    for (const league of cache.Leagues.values()) {
        if (league.guildId === guildId) return league;
    }
    return db.sequelize.transaction(async (t) => {
        const [league] = await db.League.findOrCreate({
            where: { guildId },
            transaction: t,
        });
        const [season] = await db.Season.findOrCreate({
            where: { leagueId: league.id, active: true },
            include: [db.League],
            transaction: t,
        });
        await league.update({ currentSeasonId: season.id }, { transaction: t });
        await Fp.allPromise(queues.map(queue => db.Queue.findOrCreate({
            where: { leagueId: league.id, queueType: queue.queueType },
            defaults: { queueName: queue.queueName },
            include: [db.League],
            transaction: t,
        })));
        cache.Leagues.set(league.id, league);
        return league;
    });
};

const createSeason = guildId => async name => db.sequelize.transaction(async (t) => {
    const league = await findLeague(guildId);
    await db.Season.update({ active: false }, { where: { leagueId: league.id }, transaction: t });
    const season = await db.Season.create({ leagueId: league.id, active: true, name }, { transaction: t });
    await league.update({ currentSeasonId: season.id }, { transaction: t });
    cache.Leagues.delete(league.id);
    return season;
});

const findOrCreateBot = async (steamId64, accountName, personaName, password) => db.Bot.findOrCreate({
    where: { steamId64 },
    defaults: { accountName, personaName, password },
});

const findOrCreateLobby = async (league, queueType, lobbyName) => {
    for (const lobby of cache.Lobbies.values()) {
        if (lobby.leagueId === league.id && lobby.seasonId === league.currentSeasonId && lobby.lobbyName === lobbyName) return lobby;
    }
    return db.Lobby.findOrCreate({
        where: { leagueId: league.id, seasonId: league.currentSeasonId, lobbyName },
        defaults: { queueType, state: CONSTANTS.STATE_NEW, password: hri.random() },
        include: [{
            model: db.League,
            where: { id: league.id },
        }],
    }).spread((lobby) => {
        cache.Lobbies.set(lobby.id, lobby);
        return lobby;
    });
};

const findOrCreateLobbyForGuild = async (guildId, queueType, lobbyName) => findOrCreateLobby(await findLeague(guildId), queueType, lobbyName);

const findLobbyByName = async (lobbyName) => {
    for (const lobby of cache.Lobbies.values()) {
        if (lobby.lobbyName === lobbyName) return lobby;
    }
    const lobby = await db.Lobby.scope({ method: ['lobbyName', lobbyName] }).findOne();
    if (lobby) cache.Lobbies.set(lobby.id, lobby);
    return lobby;
};

const findLobbyById = async (id) => {
    let lobby = cache.Lobbies.get(id);
    if (lobby) return lobby;
    lobby = await db.Lobby.findOne({ where: { id } });
    if (lobby) cache.Lobbies.set(lobby.id, lobby);
    return lobby;
};

const findLobbyByMatchId = async (matchId) => {
    for (const lobby of cache.Lobbies.values()) {
        if (lobby.matchId === matchId) return lobby;
    }
    const lobby = await db.Lobby.findOne({ where: { matchId } });
    if (lobby) cache.Lobbies.set(lobby.id, lobby);
    return lobby;
};

const findLobbyByDotaLobbyId = async (dotaLobbyId) => {
    for (const lobby of cache.Lobbies.values()) {
        if (lobby.dotaLobbyId === dotaLobbyId) return lobby;
    }
    const lobby = await db.Lobby.findOne({ where: { dotaLobbyId } });
    if (lobby) cache.Lobbies.set(lobby.id, lobby);
    return lobby;
};

const findLobbyByDiscordChannel = guildId => async (channelId) => {
    for (const lobby of cache.Lobbies.values()) {
        if (lobby.channelId === channelId) {
            const league = await findLeagueById(lobby.leagueId);
            if (league.guildId === guildId) return lobby;
        }
    }
    const lobby = await db.Lobby.findOne({ where: { channelId }, include: [{ model: db.League, where: { guildId } }] });
    if (lobby) cache.Lobbies.set(lobby.id, lobby);
    return lobby;
};

const findBot = async id => db.Bot.findOne({ where: { id } });

const findBotBySteamId64 = async steamId64 => db.Bot.findOne({ where: { steamId64 } });

const findAllBotsForLeague = async league => db.Bot.findAll({
    include: [{
        model: db.Ticket,
        include: [{
            model: db.League,
            where: { id: league.id },
        }],
    }],
});

const findAllUnassignedBotForLeagueTicket = async league => db.Bot.findAll({
    where: {
        status: { [Op.in]: [CONSTANTS.BOT_OFFLINE, CONSTANTS.BOT_IDLE] },
        lobbyCount: { [Op.lt]: 5 },
    },
    include: [{
        model: db.Ticket,
        where: { leagueid: league.leagueid },
    }],
    order: [['id', 'ASC']],
});

const findAllUnassignedBotWithNoTicket = async () => db.Bot.findAll({
    where: {
        '$Tickets.id$': { [Op.eq]: null },
        status: { [Op.in]: [CONSTANTS.BOT_OFFLINE, CONSTANTS.BOT_IDLE] },
        lobbyCount: 0,
    },
    include: [{
        model: db.Ticket,
        required: false, // do not generate INNER JOIN
        attributes: [], // do not return any columns of the Ticket table
    }],
    order: [['id', 'ASC']],
});

const findUnassignedBot = async league => (league.leagueid ? findAllUnassignedBotForLeagueTicket(league) : findAllUnassignedBotWithNoTicket()).then(bots => bots[0]);

const assignBotToLobby = lobby => async botId => db.sequelize.transaction(async (t) => {
    await db.Lobby.update({ botId }, { where: { id: lobby.id }, transaction: t });
    cache.Lobbies.delete(lobby.id);
    await db.Bot.increment({ lobbyCount: 1 }, { where: { id: botId }, transaction: t });
});

const unassignBotFromLobby = lobby => async botId => db.sequelize.transaction(async (t) => {
    await db.Lobby.update({ botId: null, dotaLobbyId: null }, { where: { id: lobby.id }, transaction: t });
    cache.Lobbies.delete(lobby.id);
    await db.Bot.increment({ lobbyCount: -1 }, { where: { id: botId }, transaction: t });
});

const findUserById = async (id) => {
    let user = cache.Users.get(id);
    if (user) return user;
    user = await db.User.scope({ method: ['id', id] }).findOne();
    if (user) cache.Users.set(user.id, user);
    return user;
};

const findUserByDiscordId = guildId => async (discordId) => {
    for (const user of cache.Users.values()) {
        if (user.discordId === discordId) {
            const league = await findLeagueById(user.leagueId);
            if (league.guildId === guildId) return user;
        }
    }
    const user = await db.User.scope({ method: ['guild', guildId] }, { method: ['discordId', discordId] }).findOne();
    if (user) cache.Users.set(user.id, user);
    return user;
};

const findUserBySteamId64 = guildId => async (steamId64) => {
    for (const user of cache.Users.values()) {
        if (user.steamId64 === steamId64) {
            const league = await findLeagueById(user.leagueId);
            if (league.guildId === guildId) return user;
        }
    }
    const user = await db.User.scope({ method: ['guild', guildId] }, { method: ['steamId64', steamId64] }).findOne();
    if (user) cache.Users.set(user.id, user);
    return user;
};

const findUserByNickname = guildId => async (nickname) => {
    for (const user of cache.Users.values()) {
        if (user.nickname === nickname) {
            const league = await findLeagueById(user.leagueId);
            if (league.guildId === guildId) return user;
        }
    }
    const user = await db.User.scope({ method: ['guild', guildId] }, { method: ['nickname', nickname] }).findOne();
    if (user) cache.Users.set(user.id, user);
    return user;
};

const findUserByNicknameLevenshtein = guildId => async member => db.sequelize.query('SELECT * FROM "Users" as u JOIN "Leagues" as l ON u."leagueId" = l.id WHERE l."guildId" = :guildId AND levenshtein(LOWER(u.nickname), LOWER(:nickname)) < 2', { replacements: { guildId, nickname: member }, model: db.User });

const findOrCreateUser = async (league, steamId64, discordId, rankTier) => {
    for (const user of cache.Users.values()) {
        if (user.leagueId === league.id && user.steamId64 === steamId64 && user.discordId === discordId) return user;
    }
    return db.User.findOrCreate({
        where: { leagueId: league.id, steamId64, discordId },
        defaults: { rankTier, rating: league.initialRating },
        include: [{
            model: db.League,
            where: { id: league.id },
        }],
    }).spread((user) => {
        cache.Users.set(user.id, user);
        return user;
    });
};

const findOrCreateQueue = async (league, enabled, queueType, queueName) => db.Queue.findOrCreate({
    where: { leagueId: league.id, enabled, queueType },
    defaults: { enabled, queueName },
    include: [{
        model: db.League,
        where: { id: league.id },
    }],
}).spread(queue => queue);

const findQueue = async (leagueId, enabled, queueType) => db.Queue.findOne({
    where: { leagueId, enabled, queueType },
    include: [{
        model: db.League,
        where: { id: leagueId },
    }],
});

const queryUserLeaderboardRank = leagueId => seasonId => async userId => db.sequelize.query('SELECT rank FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE "leagueId" = :leagueId AND "seasonId" = :seasonId) AS ranking WHERE "userId" = :userId LIMIT 1',
    { replacements: { leagueId, seasonId, userId }, type: db.sequelize.QueryTypes.SELECT }).then(([rank]) => (rank ? rank.rank : null));

const queryLeaderboardRank = leagueId => seasonId => async limit => db.sequelize.query('SELECT * FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE "leagueId" = :leagueId AND "seasonId" = :seasonId LIMIT :limit) AS ranking INNER JOIN "Users" as users ON ranking."userId" = users.id',
    { replacements: { leagueId, seasonId, limit }, type: db.sequelize.QueryTypes.SELECT });

const findOrCreateLeaderboard = lobby => user => async rating => db.Leaderboard.findOrCreate({
    where: { leagueId: lobby.leagueId, seasonId: lobby.seasonId, userId: user.id },
    defaults: { rating, wins: 0, losses: 0 },
}).spread(u => u);

const incrementLeaderboardRecord = wins => losses => async leaderboard => leaderboard.increment({ wins, losses });

const updateLeague = guildId => async (values) => {
    const result = await db.League.update(values, { where: { guildId } });
    for (const league of cache.Leagues.values()) {
        if (league.guildId === guildId) cache.Leagues.delete(league.id);
    }
    return result;
};

const updateUserRating = user => async (rating) => {
    const result = await db.User.update({ rating }, { where: { id: user.id } });
    cache.Users.delete(user.id);
    return result;
};

const updateLobbyName = lobbyOrState => async (lobbyName) => {
    const result = await db.Lobby.update({ lobbyName }, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateLobbyChannel = lobbyOrState => async (channel) => {
    const result = await db.Lobby.update({ channelId: channel.id }, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateLobbyRole = lobbyOrState => async (role) => {
    const result = await db.Lobby.update({ roleId: role.id }, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateLobbyState = lobbyOrState => async (state) => {
    const result = await db.Lobby.update({ state }, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateLobbyWinner = lobbyOrState => async (winner) => {
    const result = await db.Lobby.update({ winner }, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateLobbyRadiantFaction = lobbyOrState => async (radiantFaction) => {
    const result = await db.Lobby.update({ radiantFaction }, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateLobby = async (lobbyOrState) => {
    const result = await db.Lobby.update(lobbyOrState, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateLobbyFailed = lobbyOrState => async (failReason) => {
    const result = await db.Lobby.update({ state: CONSTANTS.STATE_FAILED, failReason }, { where: { id: lobbyOrState.id } });
    cache.Lobbies.delete(lobbyOrState.id);
    return result;
};

const updateBotStatusBySteamId = status => async steamId64 => db.Bot.update({ status }, { where: { steamId64 } });

const updateBotStatus = status => async id => db.Bot.update({ status }, { where: { id } });

const setAllBotsOffline = async () => db.Bot.update({ status: CONSTANTS.BOT_OFFLINE }, { where: { status: { [Op.notLike]: CONSTANTS.BOT_OFFLINE } } });

const updateBot = steamId64 => async values => db.Bot.update(values, { where: { steamId64 } });

const updateQueuesForUser = active => async (user) => {
    const queues = await user.getQueues();
    await Fp.allPromise(queues.map((queue) => {
        // eslint-disable-next-line no-param-reassign
        queue.LobbyQueuer.active = active;
        return queue.LobbyQueuer.save();
    }));
    return user;
};

const destroyQueueByName = league => async queueName => db.Queue.destroy({ where: { queueName, leagueId: league.id } });

const destroyLobbyQueuers = async lobby => db.LobbyQueuer.destroy({ where: { lobbyId: lobby.id } });

const findOrCreateCommend = lobby => giver => async receiver => db.Commend.findOrCreate({ where: { lobbyId: lobby.id, recipientUserId: receiver.id, giverUserId: giver.id } });

const findOrCreateReputation = giver => async receiver => db.Reputation.findOrCreate({ where: { recipientUserId: receiver.id, giverUserId: giver.id } });

const destroyBotBySteamID64 = async steamId64 => db.Bot.destroy({ where: { steamId64 } });

const destroyCommend = lobby => giver => async receiver => db.Commend.destroy({ where: { lobbyId: lobby.id, recipientUserId: receiver.id, giverUserId: giver.id } });

const destroyReputation = giver => async receiver => db.Reputation.destroy({ where: { recipientUserId: receiver.id, giverUserId: giver.id } });

const getChallengeBetweenUsers = giver => receiver => giver.getChallengesGiven({ where: { recipientUserId: receiver.id } }).then(challenges => challenges[0]);

const createChallenge = giver => receiver => db.Challenge.create({ accepted: false, giverUserId: giver.id, recipientUserId: receiver.id });

const destroyChallengeBetweenUsers = giver => async receiver => db.Challenge.destroy({ where: { giverUserId: giver.id, recipientUserId: receiver.id } });

const destroyAllAcceptedChallengeForUser = async (user) => {
    await db.Challenge.destroy({ where: { giverUserId: user.id, accepted: true } });
    await db.Challenge.destroy({ where: { recipientUserId: user.id, accepted: true } });
};

const setChallengeAccepted = async challenge => challenge.update({ accepted: true });

const unvouchUser = async user => user.update({ vouched: false });

const findLobbyQueuersByUserId = async userId => db.LobbyQueuer.findAll({ where: { userId } });

const findTicketById = async id => db.Ticket.findOne({ where: { id } });

const findTicketByDotaLeagueId = async leagueid => db.Ticket.findOne({ where: { leagueid } });

const upsertTicket = async ({
    leagueid,
    name,
    mostRecentActivity,
    startTimestamp,
    endTimestamp,
}) => db.Ticket.upsert({
    leagueid,
    name,
    mostRecentActivity,
    startTimestamp,
    endTimestamp,
}, { returning: true }).spread(ticket => ticket);

const addTicketOf = leagueOrBot => async ticket => leagueOrBot.addTicket(ticket);

const getTicketsOf = options => async leagueOrBot => leagueOrBot.getTickets(options);

const setTicketsOf = leagueOrBot => async tickets => leagueOrBot.setTickets(tickets);

const removeTicketOf = leagueOrBot => async ticket => leagueOrBot.removeTicket(ticket);

const removeTicketsOf = async leagueOrBot => leagueOrBot.setTickets([]);

module.exports = {
    findAllLeagues,
    findAllActiveLobbiesForInhouse,
    findAllActiveLobbies,
    findActiveLobbiesForUser,
    findAllInProgressLobbies,
    findAllMatchEndedLobbies,
    findAllLobbiesInState,
    findAllLobbiesInStateForInhouse,
    findAllLobbiesForInhouse,
    findAllEnabledQueues,
    findLeague,
    findLeagueById,
    findOrCreateLeague,
    createSeason,
    findOrCreateBot,
    findOrCreateLobby,
    findOrCreateLobbyForGuild,
    findLobbyByName,
    findLobbyById,
    findLobbyByMatchId,
    findLobbyByDotaLobbyId,
    findLobbyByDiscordChannel,
    findBot,
    findBotBySteamId64,
    findAllBotsForLeague,
    findAllUnassignedBotForLeagueTicket,
    findAllUnassignedBotWithNoTicket,
    findUnassignedBot,
    assignBotToLobby,
    unassignBotFromLobby,
    findOrCreateUser,
    findOrCreateQueue,
    findQueue,
    findUserById,
    findUserByDiscordId,
    findUserBySteamId64,
    findUserByNickname,
    findUserByNicknameLevenshtein,
    queryUserLeaderboardRank,
    queryLeaderboardRank,
    findOrCreateLeaderboard,
    incrementLeaderboardRecord,
    updateLeague,
    updateUserRating,
    updateLobbyName,
    updateLobbyChannel,
    updateLobbyRole,
    updateLobbyState,
    updateLobbyWinner,
    updateLobbyRadiantFaction,
    updateLobby,
    updateLobbyFailed,
    updateBotStatusBySteamId,
    updateBotStatus,
    setAllBotsOffline,
    updateBot,
    updateQueuesForUser,
    destroyQueueByName,
    destroyLobbyQueuers,
    findOrCreateCommend,
    findOrCreateReputation,
    destroyBotBySteamID64,
    destroyCommend,
    destroyReputation,
    getChallengeBetweenUsers,
    createChallenge,
    setChallengeAccepted,
    destroyChallengeBetweenUsers,
    destroyAllAcceptedChallengeForUser,
    unvouchUser,
    findLobbyQueuersByUserId,
    findTicketById,
    findTicketByDotaLeagueId,
    upsertTicket,
    addTicketOf,
    getTicketsOf,
    setTicketsOf,
    removeTicketOf,
    removeTicketsOf,
};
