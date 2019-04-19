/**
 * @module ihl
 */

/**
 * @typedef module:ihl.InhouseState
 * @type {Object}
 * @property {external:Guild} guild - The discord guild the inhouse belongs to.
 * @property {external:CategoryChannel} category - The discord inhouse category.
 * @property {external:GuildChannel} channel - The discord inhouse general channel.
 * @property {external:Role} adminRole - The discord inhouse admin role.
 * @property {number} ready_check_timeout - Duration in milliseconds before lobby ready timeout.
 * @property {number} captain_rank_threshold - Maximum rank difference between captains.
 * @property {string} captain_role_regexp - Regular expression string for captain roles.
 */

/**
 * @typedef {Object} module:ihl.LeagueGuildObject
 * @property {module:db.League} league - A database league record
 * @property {external:Guild} guild - The guild the league belongs to
 */

const Long = require('long');
const Sequelize = require('sequelize');
const convertor = require('steam-id-convertor');
const got = require('got');
const Lobby = require('./lobby');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const Guild = require('./guild');
const Db = require('./db');
const Fp = require('./util/fp');
const convertVanity = require('./util/convertVanity');

const parseSteamID64 = async (text) => {
    logger.silly('parseSteamID64');
    let steamid_64;
    try {
        if (text.indexOf('steamcommunity.com/id') !== -1) {
            logger.silly('parseSteamID64 vanity');
            const vanityName = text.match(/([^/]*)\/*$/)[1];
            steamid_64 = await convertVanity(vanityName);
        }
        else if (text.indexOf('steamcommunity.com/profiles') !== -1) {
            logger.silly('parseSteamID64 steamcommunity');
            steamid_64 = text.match(/([^/]*)\/*$/)[1].replace(/\D/g, '');
        }
        else if (text.indexOf('dotabuff.com/players') !== -1 || text.indexOf('opendota.com/players') !== -1 || text.indexOf('stratz.com/en-us/player') !== -1) {
            logger.silly('parseSteamID64 dotabuff');
            const steamid_32 = text.match(/([^/]*)\/*$/)[1].replace(/\D/g, '');
            steamid_64 = convertor.to64(steamid_32);
        }
        else {
            logger.silly('parseSteamID64 steamid');
            const max_32 = Long.fromString('4294967295');
            const steam_id = Long.fromString(text.replace(/\D/g, ''));
            steamid_64 = steam_id.lessThanOrEqual(max_32) ? convertor.to64(steam_id.toString()) : steam_id.toString();
        }
        logger.silly(`parseSteamID64 text ${text} steamid_64 ${steamid_64}`);
        return steamid_64;
    }
    catch (e) {
        logger.silly(`parseSteamID64 error ${e}`);
        return null;
    }
};

/**
* Gets a player's badge rank from opendota.
* @function
* @param {string} steamId64 - The player's steamid64.
* @returns {number} The player badge rank.
*/
const getUserRankTier = async (steamId64) => {
    logger.silly('getUserRankTier');
    const accountId = convertor.to32(steamId64);
    try {
        const response = await got(`https://api.opendota.com/api/players/${accountId}`, { json: true });
        return response.body.rank_tier || null;
    }
    catch (e) {
        logger.error(e);
        return null;
    }
};

/**
* Adds a player to the inhouse league.
* @function
* @param {string} guildId - A guild id.
* @param {string} steamId64 - The player's steamid64.
* @param {string} discordId - The player's discord id.
* @returns {User} The newly created user database record.
*/
const registerUser = async (guildId, steamId64, discordId) => {
    logger.silly(`registerUser ${guildId} ${steamId64} ${discordId}`);
    const league = await Db.findLeague(guildId);
    const rankTier = await getUserRankTier(steamId64);
    logger.silly(`registerUser league_id ${league.id} steamId64 ${steamId64} discordId ${discordId} rankTier ${rankTier}`);
    const user = await Db.findOrCreateUser(league, steamId64, discordId, rankTier);
    return user;
};

/**
* Creates an inhouse state.
* Sets up the inhouse category, channel, and role.
* @function
* @returns {module:ihl.InhouseState} An inhouse state object.
*/

const createInhouseState = async ({ league, guild }) => {
    const category = await Guild.findOrCreateCategory(guild, league.category_name);
    const channel = await Guild.findOrCreateChannelInCategory(guild, category, league.channel_name);
    await Guild.setChannelPosition(0)(channel);
    const adminRole = await Guild.makeRole(guild)([])(true)(league.admin_role_name);
    return {
        guild,
        category,
        channel,
        adminRole,
        ...(league instanceof Sequelize.Model ? league.get({ plain: true }) : league),
    };
};

const initLeague = async guild => Db.findOrCreateLeague(guild.id)([
    { queue_type: CONSTANTS.QUEUE_TYPE_DRAFT, queue_name: 'player-draft-queue' },
    { queue_type: CONSTANTS.QUEUE_TYPE_AUTO, queue_name: 'autobalanced-queue' },
]);

const createNewLeague = async guild => Fp.pipeP(
    initLeague,
    league => ({ league, guild }),
    createInhouseState,
)(guild);

const createLobby = inhouseState => async ({
    queue_type,
    queue_name,
}) => {
    logger.silly(`createLobby ${queue_type} ${queue_name}`);
    const lobby = await Db.findOrCreateLobbyForGuild(inhouseState.guild.id, queue_type, queue_name);
    logger.silly(`createLobby ${queue_type} ${queue_name} ${lobby.id}`);
    const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
    logger.silly(`createLobby ${queue_type} ${queue_name} ${lobby.id} lobbyState`);
    return lobbyState;
};

const loadLobbyState = guilds => async (lobby) => {
    const league = await Db.findLeagueById(lobby.league_id);
    const inhouseState = await createInhouseState({ league, guild: guilds.get(league.guild_id) });
    return Lobby.lobbyToLobbyState(inhouseState)(lobby);
};

const loadLobbyStateFromLobbyId = guilds => async (lobby_id) => Fp.pipeP(
    Db.findLobbyByLobbyId,
    loadLobbyState(guilds),
)(lobby_id);

const loadLobbyStateFromMatchId = guilds => async (match_id) => Fp.pipeP(
    Db.findLobbyByMatchId,
    loadLobbyState(guilds),
)(match_id);

const createLobbiesFromQueues = async inhouseState => Fp.pipeP(
    Db.findAllEnabledQueues,
    Fp.tryMapPromise(
        Fp.pipeP(
            createLobby(inhouseState),
            lobbyState => Guild.setChannelPosition(1)(lobbyState.channel),
        ),
    ),
)(inhouseState.guild.id);

/**
* Checks if a user has active lobbies.
* @function
* @param {module:db.User} user - The user to check.
* @returns {boolean} Whether the user has active lobbies.
*/
const hasActiveLobbies = async (user) => {
    const lobbies = await Db.findActiveLobbiesForUser(user);
    return lobbies.length > 0;
};

/**
* Adds a user to a lobby queue.
* @function
* @param {module:lobby.LobbyState} lobbyState - A lobby state.
* @param {module:db.User} user - The player to queue.
*/
const joinLobbyQueue = user => async (lobbyState) => {
    if (!user.queue_timeout || user.queue_timeout < Date.now()) {
        const inQueue = await Lobby.hasQueuer(lobbyState)(user);
        if (!inQueue) {
            const inLobby = await hasActiveLobbies(user);
            if (!inLobby) {
                if (lobbyState.state === CONSTANTS.STATE_WAITING_FOR_QUEUE) {
                    await Lobby.addQueuer(lobbyState)(user);
                    return CONSTANTS.QUEUE_JOINED;
                }
                return null;
            }
            return CONSTANTS.QUEUE_ALREADY_JOINED;
        }
        return CONSTANTS.QUEUE_ALREADY_JOINED;
    }
    return CONSTANTS.QUEUE_BANNED;
};

/**
* Add a user to all lobby queues.
* @function
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to queue.
*/
const getAllLobbyQueues = async inhouseState => Fp.pipeP(
    Db.findAllLobbiesInStateForInhouse(CONSTANTS.STATE_WAITING_FOR_QUEUE),
    Fp.mapPromise(Lobby.lobbyToLobbyState(inhouseState)),
)(inhouseState.guild.id);

/**
* Removes a user from a lobby queue.
* @function
* @param {module:lobby.LobbyState} lobbyState - A lobby state.
* @param {module:db.User} user - The player to dequeue.
*/
const leaveLobbyQueue = user => async (lobbyState) => {
    const inQueue = await Lobby.hasQueuer(lobbyState)(user);
    if (inQueue) {
        await Lobby.removeQueuer(lobbyState)(user);
    }
    return inQueue;
};

/**
* Removes a user from all lobby queues.
* @function
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to dequeue.
*/
const getAllLobbyQueuesForUser = async (inhouseState, user) => Fp.pipeP(
    Db.findLobbyQueuersByUserId,
    Fp.mapPromise(
        Fp.pipeP(
            queue => queue.lobby_id,
            Db.findLobbyById,
            Lobby.lobbyToLobbyState(inhouseState),
        ),
    ),
)(user.id);

/**
* Bans a user from an inhouse queue.
* @function
* @param {module:db.User} user - The player to ban.
* @param {number} timeout - The duration of ban in minutes.
*/
const banInhouseQueue = async (user, timeout) => {
    const queue_timeout = new Date();
    queue_timeout.setMinutes(queue_timeout.getMinutes() + timeout);
    return user.update({ queue_timeout });
};

module.exports = {
    parseSteamID64,
    getUserRankTier,
    registerUser,
    createInhouseState,
    initLeague,
    createNewLeague,
    createLobby,
    loadLobbyState,
    loadLobbyStateFromLobbyId,
    loadLobbyStateFromMatchId,
    createLobbiesFromQueues,
    hasActiveLobbies,
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
};
