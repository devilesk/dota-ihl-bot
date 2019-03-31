/**
 * @module db
 */
 
 /**
 * Sequelize Model object
 * @external Model
 * @see {@link http://docs.sequelizejs.com/class/lib/model.js~Model.html}
 */
 
/**
 * @typedef module:db.League
 * @type {external:Model}
 */
 
/**
 * @typedef module:db.User
 * @type {external:Model}
 */
 
/**
 * @typedef module:db.Challenge
 * @type {external:Model}
 */
 
const logger = require('./logger');
const Sequelize = require('sequelize');
const db = require('../models');
const CONSTANTS = require('./constants');

const Op = Sequelize.Op;

const findAllLeagues = async () => db.League.findAll();

const findAllActiveLobbiesForInhouse = async guild_id => db.Lobby.findAll({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_COMPLETED, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } }, include: [{ model: db.League, where: { guild_id } }] });

const findAllActiveLobbies = async () => db.Lobby.findAll({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_COMPLETED, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } } });

const findActiveLobbiesForUser = async user => user.getLobbies({ where: { state: { [Op.notIn]: [CONSTANTS.STATE_COMPLETED, CONSTANTS.STATE_KILLED, CONSTANTS.STATE_FAILED] } } });

const findAllInProgressLobbies = async () => db.Lobby.findAll({ where: { state: CONSTANTS.STATE_MATCH_IN_PROGRESS } });

const findAllLobbiesInState = async state => db.Lobby.findAll({ where: { state } });

const findAllLobbiesInStateForInhouse = state => async guild_id => db.Lobby.findAll({ where: { state }, include: [{ model: db.League, where: { guild_id } }] });

const findAllEnabledQueues = async guild_id => db.Queue.findAll({ where: { enabled: true }, include: [{ model: db.League, where: { guild_id } }] });

const findLeague = async guild_id => db.League.findOne({ where: { guild_id } });

const findLeagueById = async id => db.League.findOne({ where: { id } });

const findOrCreateLeague = guild_id => async (queues) => db.sequelize.transaction(async (t) => {
    logger.debug(`findOrCreateLeague start`);
    const [league] = await db.League.findOrCreate({
        where: { guild_id },
        transaction: t,
    });
    const [season] = await db.Season.findOrCreate({
        where: { league_id: league.id, active: true },
        include: [db.League],
        transaction: t,
    });
    await league.update({ current_season_id: season.id }, { transaction: t });
    for (const queue of queues) {
        await db.Queue.findOrCreate({
            where: { league_id: league.id, enabled: true, ...queue },
            include: [db.League],
            transaction: t,
        });
    }
    logger.debug(`findOrCreateLeague end`);
    return league;
});

const createSeason = guild_id => async name => db.sequelize.transaction(async (t) => {
    const league = await findLeague(guild_id);
    await db.Season.update({ active: false }, { where: { league_id: league.id }, transaction: t });
    const season = await db.Season.create({ league_id: league.id, active: true, name }, { transaction: t });
    await league.update({ current_season_id: season.id }, { transaction: t });
    return season;
});

const findOrCreateBot = async (league, steamid_64, steam_name, steam_user, steam_pass) => db.Bot.findOrCreate({
    where: {
        league_id: league.id,
        steamid_64,
        steam_name,
        steam_user,
        steam_pass,
    },
}).spread(bot => bot);

const findOrCreateLobby = async (league, queue_type, lobby_name) => db.Lobby.findOrCreate({
    where: { league_id: league.id, season_id: league.current_season_id, lobby_name },
    defaults: { queue_type, state: CONSTANTS.STATE_NEW },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
}).spread(lobby => lobby);

const findOrCreateLobbyForGuild = async (guild_id, queue_type, lobby_name) => findOrCreateLobby(await findLeague(guild_id), queue_type, lobby_name);

const findLobbyByName = async lobby_name => db.Lobby.scope({ method: ['lobby_name', lobby_name] }).findOne();

const findLobbyById = async id => db.Lobby.findOne({ where: { id } });

const findLobbyByDiscordChannel = guild_id => async channel_id => db.Lobby.findOne({ where: { channel_id }, include: [{ model: db.League, where: { guild_id } }] });

const findBot = async id => db.Bot.findOne({ where: { id } });

const findAllUnassignedBot = async () => db.Bot.findAll({
    where: { '$Lobbies.bot_id$': { [Op.eq]: null } },
    include: [db.Lobby]
});

const findUnassignedBot = async () => findAllUnassignedBot().then(bots => bots[0]);
    
const findUserById = async id => db.User.scope({ method: ['id', id] }).findOne();

const findUserByDiscordId = guild_id => async discord_id => db.User.scope({ method: ['guild', guild_id] }, { method: ['discord_id', discord_id] }).findOne();

const findUserBySteamId64 = guild_id => async steamid_64 => db.User.scope({ method: ['guild', guild_id] }, { method: ['steamid_64', steamid_64] }).findOne();

const findUserByNickname = guild_id => async nickname => db.User.scope({ method: ['guild', guild_id] }, { method: ['nickname', nickname] }).findOne();

const findUserByNicknameLevenshtein = guild_id => async member => db.sequelize.query('SELECT * FROM "Users" as u JOIN "Leagues" as l ON u.league_id = l.id WHERE l.guild_id = :guild_id AND levenshtein(LOWER(u.nickname), LOWER(:nickname)) < 2', { replacements: { guild_id, nickname: member }, model: db.User });

const findOrCreateUser = async (league, steamid_64, discord_id, rank_tier) => db.User.findOrCreate({
    where: {
        league_id: league.id, steamid_64, discord_id,
    },
    defaults: { rank_tier, rating: league.initial_rating },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
}).spread(user => user);

const findOrCreateQueue = async (league, enabled, queue_type, queue_name) => db.Queue.findOrCreate({
    where: { league_id: league.id, enabled, queue_type, queue_name },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
}).spread(queue => queue);

const findQueue = async (league_id, enabled, queue_type) => db.Queue.findOne({
    where: { league_id, enabled, queue_type },
    include: [{
        model: db.League,
        where: {
            id: league_id,
        },
    }],
});

const findLobbyByMatchId = async match_id => db.Lobby.findOne({ where: { match_id } });

const queryUserLeaderboardRank = league_id => season_id => async user_id => db.sequelize.query('SELECT rank FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE league_id = :league_id AND season_id = :season_id) AS ranking WHERE user_id = :user_id LIMIT 1',
    { replacements: { league_id, season_id, user_id }, type: db.sequelize.QueryTypes.SELECT }).then(([rank]) => (rank ? rank.rank : null));

const queryLeaderboardRank = league_id => season_id => async limit => db.sequelize.query('SELECT * FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE league_id = :league_id AND season_id = :season_id LIMIT :limit) AS ranking INNER JOIN "Users" as users ON ranking.user_id = users.id',
    { replacements: { league_id, season_id, limit }, type: db.sequelize.QueryTypes.SELECT });


const updateLeague = guild_id => async values => db.League.update(values, { where: { guild_id } });

const updateUserRating = user => async rating => db.User.update({ rating }, { where: { id: user.id } });

const updateLobbyName = lobbyOrState => async lobby_name => db.Lobby.update({ lobby_name }, { where: { id: lobbyOrState.id } });

const updateLobbyChannel = lobbyOrState => async channel => db.Lobby.update({ channel_id: channel.id }, { where: { id: lobbyOrState.id } });

const updateLobbyRole = lobbyOrState => async role => db.Lobby.update({ role_id: role.id }, { where: { id: lobbyOrState.id } });

const updateLobbyState = lobbyOrState => async state => db.Lobby.update({ state }, { where: { id: lobbyOrState.id } });

const updateLobbyWinner = lobbyOrState => async winner => db.Lobby.update({ winner }, { where: { id: lobbyOrState.id } });

const updateLobby = async (lobbyOrState) => db.Lobby.update(lobbyOrState, { where: { id: lobbyOrState.id } });

const updateLobbyFailed = lobbyOrState => async fail_reason => db.Lobby.update({ state: CONSTANTS.STATE_FAILED, fail_reason }, { where: { id: lobbyOrState.id } });

const updateBotStatusBySteamId = status => async steamid_64 => db.Bot.update({ status }, { where: { steamid_64 } });

const updateBotStatus = status => async id => db.Bot.update({ status }, { where: { id } });

const updateQueuesForUser = active => async user => {
    const queues = await user.getQueues();
    for (queue of queues) {
        queue.LobbyQueuer.active = active;
        await queue.LobbyQueuer.save();
    }
    return user;
}

const destroyQueueByName = league => async queue_name => db.Queue.destroy({ where: { queue_name, league_id: league.id } });

const findOrCreateCommend = lobby => giver => async receiver => db.Commend.findOrCreate({ where: { lobby_id: lobby.id, recipient_user_id: receiver.id, giver_user_id: giver.id } });

const findOrCreateReputation = giver => async receiver => db.Reputation.findOrCreate({ where: { recipient_user_id: receiver.id, giver_user_id: giver.id } });

const destroyCommend = lobby => giver => async receiver => db.Commend.destroy({ where: { lobby_id: lobby.id, recipient_user_id: receiver.id, giver_user_id: giver.id } });

const destroyReputation = giver => async receiver => db.Reputation.destroy({ where: { recipient_user_id: receiver.id, giver_user_id: giver.id } });

const getChallengeBetweenUsers = giver => receiver => giver.getChallengesGiven({ where: { recipient_user_id: receiver.id } }).then(challenges => challenges[0]);

const createChallenge = giver => receiver => db.Challenge.create({ accepted: false, giver_user_id: giver.id, recipient_user_id: receiver.id });

const destroyChallengeBetweenUsers = giver => async (receiver) => db.Challenge.destroy({ where: { giver_user_id: giver.id, recipient_user_id: receiver.id } });

const destroyAllAcceptedChallengeForUser = async (user) => {
    await db.Challenge.destroy({ where: { giver_user_id: user.id, accepted: true } });
    await db.Challenge.destroy({ where: { recipient_user_id: user.id, accepted: true } });
}

const setChallengeAccepted = challenge => challenge.update({ accepted: true });

const unvouchUser = async user => user.update({ vouched: false });

const findLobbyQueuersByUserId = async user_id => db.LobbyQueuer.findAll({ where: { user_id } });

module.exports = {
    findAllLeagues,
    findAllActiveLobbiesForInhouse,
    findAllActiveLobbies,
    findActiveLobbiesForUser,
    findAllInProgressLobbies,
    findAllLobbiesInState,
    findAllLobbiesInStateForInhouse,
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
    findLobbyByDiscordChannel,
    findBot,
    findAllUnassignedBot,
    findUnassignedBot,
    findOrCreateUser,
    findOrCreateQueue,
    findQueue,
    findLobbyByMatchId,
    findUserById,
    findUserByDiscordId,
    findUserBySteamId64,
    findUserByNickname,
    findUserByNicknameLevenshtein,
    queryUserLeaderboardRank,
    queryLeaderboardRank,
    updateLeague,
    updateUserRating,
    updateLobbyName,
    updateLobbyChannel,
    updateLobbyRole,
    updateLobbyState,
    updateLobbyWinner,
    updateLobby,
    updateLobbyFailed,
    updateBotStatusBySteamId,
    updateBotStatus,
    updateQueuesForUser,
    destroyQueueByName,
    findOrCreateCommend,
    findOrCreateReputation,
    destroyCommend,
    destroyReputation,
    getChallengeBetweenUsers,
    createChallenge,
    setChallengeAccepted,
    destroyChallengeBetweenUsers,
    destroyAllAcceptedChallengeForUser,
    unvouchUser,
    findLobbyQueuersByUserId,
};
