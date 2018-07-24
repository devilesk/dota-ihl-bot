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
 
const Sequelize = require('sequelize');
const db = require('../models');
const CONSTANTS = require('./constants');

const Op = Sequelize.Op;

const findAllLeagues = async () => db.League.findAll();

const findAllActiveLobbies = async guild_id => db.Lobby.findAll({ where: { state: { [Op.ne]: CONSTANTS.STATE_MATCH_ENDED } }, include: [{ model: db.League, where: { guild_id: guild_id } }] });

const findAllInProgressLobbies = async () => db.Lobby.findAll({ where: { state: CONSTANTS.STATE_MATCH_IN_PROGRESS } });

const findLeague = async guild_id => db.League.find({ where: { guild_id } });

const findOrCreateLeague = async guild_id => db.sequelize.transaction(async t => db.League.findOrCreate({
    where: { guild_id },
    transaction: t,
})
    .spread(league => db.Season.findOrCreate({
        where: { league_id: league.id, active: true },
        include: [db.League],
        transaction: t,
    }))
    .spread(season => season.getLeague()
        .then(league => league.update({ current_season_id: season.id }, { transaction: t }))));

const createSeason = async guild_id => sequelize.transaction(async (t) => {
    const league = await findLeague(guild_id);
    await db.Season.update({ active: false }, { where: { league_id: league.id }, transaction: t });
    const season = await db.Season.create({ league_id: league.id, active: true }, { transaction: t });
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
})
    .spread(bot => bot);

const findOrCreateLobby = async (league, lobby_name) => db.Lobby.findOrCreate({
    where: { league_id: league.id, season_id: league.current_season_id, lobby_name },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
})
    .spread(lobby => lobby);

const findOrCreateLobbyForGuild = async (guild_id, lobby_name) => findOrCreateLobby(await findOrCreateLeague(guild_id), lobby_name);

const findLobby = async lobby_name => db.Lobby.scope({ method: ['lobby_name', lobby_name] }).find();

const findBot = async id => db.Bot.findOne({ where: { id } });

const findAllUnassignedBot = async () => db.Bot.findAll({
    where: { '$Lobbies.bot_id$': { [Op.eq]: null } },
    include: [db.Lobby]
});
    
//const findAllUnassignedBot = async () => db.Bot.findAll({ where: { status: CONSTANTS.BOT_OFFLINE }, include: [{ model: db.Lobby, where: { state: { [Op.ne]: CONSTANTS.STATE_MATCH_ENDED } }, required: false }] });

const findUserByDiscordId = guild_id => async discord_id => db.User.scope({ method: ['guild', guild_id] }, { method: ['discord_id', discord_id] }).find();

const findUserBySteamId64 = guild_id => async steamid_64 => db.User.scope({ method: ['guild', guild_id] }, { method: ['steamid_64', steamid_64] }).find();

const findUserByNicknameLevenshtein = member => db.sequelize.query('SELECT * FROM "Users" WHERE levenshtein(LOWER(nickname), LOWER(:nickname)) < 2', { replacements: { nickname: member }, model: db.User });

const findOrCreateUser = async (league, steamid_64, discord_id, rank_tier) => db.User.findOrCreate({
    where: {
        league_id: league.id, steamid_64, discord_id, rank_tier,
    },
    include: [{
        model: db.League,
        where: {
            id: league.id,
        },
    }],
})
    .spread(user => user);

const findOrCreateQueue = async user => db.Queue.findOrCreate({
    where: { league_id: user.league_id, user_id: user.id },
    include: [{
        model: db.User,
        where: {
            id: user.id,
        },
    }],
});

const findOrCreateMatch = async match_id => db.Match.findOrCreate({
    where: {
        match_id,
    },
    defaults: {
        match_id,
    },
});

const findMatch = async match_id => db.Match.findOne({ where: { match_id }, include: [db.Lobby] });

const queryUserLeaderboardRank = league_id => season_id => async user_id => db.sequelize.query('SELECT rank FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE league_id = :league_id AND season_id = :season_id) AS ranking WHERE user_id = :user_id LIMIT 1',
    { replacements: { league_id, season_id, user_id }, type: db.sequelize.QueryTypes.SELECT }).then(([rank]) => (rank ? rank.rank : null));

const queryLeaderboardRank = league_id => season_id => async limit => db.sequelize.query('SELECT * FROM (SELECT *, rank() OVER (ORDER BY rating DESC) FROM "Leaderboards" WHERE league_id = :league_id AND season_id = :season_id LIMIT :limit) AS ranking INNER JOIN "Users" as users ON ranking.user_id = users.id',
    { replacements: { league_id, season_id, limit }, type: db.sequelize.QueryTypes.SELECT });


const updateLeague = guild_id => async values => db.League.update(values, { where: { guild_id } });

const updateLobbyState = async lobbyOrState => db.Lobby.update(lobbyOrState, { where: { lobby_name: lobbyOrState.lobby_name } });

const updateBotStatusBySteamId = status => async steamid_64 => db.Bot.update({ status }, { where: { steamid_64 } });

const updateBotStatus = status => async id => db.Bot.update({ status }, { where: { id } });

const findInQueueWithUser = async () => db.Queue.findAll({
    where: { state: CONSTANTS.QUEUE_IN_QUEUE }, limit: 10, order: [['timestamp', 'ASC']], include: [db.User],
});

const findAllInQueueWithUser = async () => db.Queue.findAll({
    where: { state: CONSTANTS.QUEUE_IN_QUEUE }, order: [['timestamp', 'ASC']], include: [db.User],
});

const findInQueueBySteamId = guild_id => async steamid_64 => db.Queue.scope({ method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }, { method: ['guild', guild_id] }, { method: ['steamid_64', steamid_64] }).findOne();

const updateQueueStates = state => async ids => db.Queue.update({ state }, { where: { id: { [Op.in]: ids } } });

const updateQueueStatesByUserId = state => async user_ids => db.Queue.update({ state }, { where: { user_id: { [Op.in]: user_ids } } });

const destroyQueues = async ids => db.Queue.destroy({ where: { id: { [Op.in]: ids } } });

const destroyQueuesByGuildId = async (guild_id) => {
    const queues = await db.Queue.scope({ method: ['guild', guild_id] }).findAll();
    return await destroyQueues(queues.map(queue => queue.id));
};

const destroyQueuesByUserId = async user_ids => db.Queue.destroy({ where: { user_id: { [Op.in]: user_ids } } });

const countQueueInQueue = async guild_id => db.Queue.scope({ method: ['state', CONSTANTS.QUEUE_IN_QUEUE] }, { method: ['guild', guild_id] }).count();

const findOrCreateReputation = league => giver => async receiver => db.Reputation.findOrCreate({ where: { recipient_user_id: receiver.id, giver_user_id: giver.id }, defaults: { timestamp: Date.now(), season_id: league.current_season_id } });

const destroyReputation = league => giver => async receiver => db.Reputation.destroy({ where: { recipient_user_id: receiver.id, giver_user_id: giver.id, season_id: league.current_season_id } });

module.exports = {
    findAllLeagues,
    findAllActiveLobbies,
    findAllInProgressLobbies,
    findLeague,
    findOrCreateLeague,
    createSeason,
    findOrCreateBot,
    findOrCreateLobby,
    findOrCreateLobbyForGuild,
    findLobby,
    findBot,
    findAllUnassignedBot,
    findOrCreateUser,
    findOrCreateQueue,
    findOrCreateMatch,
    findMatch,
    findUserByDiscordId,
    findUserBySteamId64,
    findUserByNicknameLevenshtein,
    queryUserLeaderboardRank,
    queryLeaderboardRank,
    updateLeague,
    updateLobbyState,
    updateBotStatusBySteamId,
    updateBotStatus,
    findInQueueWithUser,
    findAllInQueueWithUser,
    findInQueueBySteamId,
    updateQueueStates,
    updateQueueStatesByUserId,
    destroyQueues,
    destroyQueuesByGuildId,
    destroyQueuesByUserId,
    countQueueInQueue,
    findOrCreateReputation,
    destroyReputation,
};
