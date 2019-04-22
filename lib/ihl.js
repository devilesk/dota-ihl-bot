/**
 * @module ihl
 */

/**
 * @typedef module:ihl.InhouseState
 * @type {Object}
 * @property {external:discordjs.Guild} guild - The discord guild the inhouse belongs to.
 * @property {external:discordjs.CategoryChannel} category - The discord inhouse category.
 * @property {external:discordjs.GuildChannel} channel - The discord inhouse general channel.
 * @property {external:discordjs.Role} adminRole - The discord inhouse admin role.
 * @property {number} readyCheckTimeout - Duration in milliseconds before lobby ready timeout.
 * @property {number} captainRankThreshold - Maximum rank difference between captains.
 * @property {string} captainRoleRegexp - Regular expression string for captain roles.
 */

/**
 * @typedef {Object} module:ihl.LeagueGuildObject
 * @property {module:db.League} league - A database league record
 * @property {external:discordjs.Guild} guild - The guild the league belongs to
 */

const DiscordAPIError = require('discord.js/src/client/rest/DiscordAPIError');
const Exceptions = require('./exceptions');
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
    let steamId64;
    try {
        if (text.indexOf('steamcommunity.com/id') !== -1) {
            logger.silly('parseSteamID64 vanity');
            const vanityName = text.match(/([^/]*)\/*$/)[1];
            steamId64 = await convertVanity(vanityName);
        }
        else if (text.indexOf('steamcommunity.com/profiles') !== -1) {
            logger.silly('parseSteamID64 steamcommunity');
            steamId64 = text.match(/([^/]*)\/*$/)[1].replace(/\D/g, '');
        }
        else if (text.indexOf('dotabuff.com/players') !== -1 || text.indexOf('opendota.com/players') !== -1 || text.indexOf('stratz.com/en-us/player') !== -1) {
            logger.silly('parseSteamID64 dotabuff');
            const steamId32 = text.match(/([^/]*)\/*$/)[1].replace(/\D/g, '');
            steamId64 = convertor.to64(steamId32);
        }
        else {
            logger.silly('parseSteamID64 steam id');
            const max32 = Long.fromString('4294967295');
            const steamId = Long.fromString(text.replace(/\D/g, ''));
            steamId64 = steamId.lessThanOrEqual(max32) ? convertor.to64(steamId.toString()) : steamId.toString();
        }
        logger.silly(`parseSteamID64 text ${text} steamId64 ${steamId64}`);
        return steamId64;
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
    logger.silly(`registerUser leagueId ${league.id} steamId64 ${steamId64} discordId ${discordId} rankTier ${rankTier}`);
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
    logger.silly(`createInhouseState ${league} ${guild}`);
    const category = await Guild.findOrCreateCategory(guild, league.categoryName);
    logger.silly(`createInhouseState category created ${category}`);
    const channel = await Guild.findOrCreateChannelInCategory(guild, category, league.channelName);
    logger.silly(`createInhouseState channel created ${league.channelName} ${channel}`);
    await Guild.setChannelPosition(0)(channel);
    logger.silly('createInhouseState channel position set');
    let adminRole;
    try {
        adminRole = await Guild.makeRole(guild)([])(true)(league.adminRoleName);
    }
    catch (e) {
        logger.error(e);
        if (e instanceof DiscordAPIError && e.message === 'Missing Permissions') {
            throw new Exceptions.MissingDiscordPermission(`Could not create admin role "${league.adminRoleName}".
            Check that bot has "Manage Roles" permission and "${league.adminRoleName}" role does not exist or is below the bot role.`);
        }
        throw e;
    }
    logger.silly(`createInhouseState admin role created ${adminRole}`);
    return {
        guild,
        category,
        channel,
        adminRole,
        ...(league instanceof Sequelize.Model ? league.get({ plain: true }) : league),
    };
};

const initLeague = async guild => Db.findOrCreateLeague(guild.id)([
    { queueType: CONSTANTS.QUEUE_TYPE_DRAFT, queueName: 'player-draft-queue' },
    { queueType: CONSTANTS.QUEUE_TYPE_AUTO, queueName: 'autobalanced-queue' },
]);

const createNewLeague = async guild => Fp.pipeP(
    initLeague,
    league => ({ league, guild }),
    createInhouseState,
)(guild);

const createLobby = inhouseState => async ({
    queueType,
    queueName,
}) => {
    logger.silly(`createLobby ${queueType} ${queueName}`);
    const lobby = await Db.findOrCreateLobbyForGuild(inhouseState.guild.id, queueType, queueName);
    logger.silly(`createLobby ${queueType} ${queueName} ${lobby.id}`);
    const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
    logger.silly(`createLobby ${queueType} ${queueName} ${lobby.id} lobbyState`);
    return lobbyState;
};

const loadLobbyState = guilds => async (lobby) => {
    const league = await Db.findLeagueById(lobby.leagueId);
    const inhouseState = await createInhouseState({ league, guild: guilds.get(league.guildId) });
    return Lobby.lobbyToLobbyState(inhouseState)(lobby);
};

const loadLobbyStateFromDotaLobbyId = guilds => async dotaLobbyId => Fp.pipeP(
    Db.findLobbyByDotaLobbyId,
    loadLobbyState(guilds),
)(dotaLobbyId);

const loadLobbyStateFromMatchId = guilds => async matchId => Fp.pipeP(
    Db.findLobbyByMatchId,
    loadLobbyState(guilds),
)(matchId);

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
    if (!user.queueTimeout || user.queueTimeout < Date.now()) {
        const inQueue = await Lobby.hasQueuer(lobbyState)(user);
        if (!inQueue) {
            const inLobby = await hasActiveLobbies(user);
            if (!inLobby) {
                if (lobbyState.state === CONSTANTS.STATE_WAITING_FOR_QUEUE) {
                    await Lobby.addQueuer(lobbyState)(user);
                    return CONSTANTS.QUEUE_JOINED;
                }
                return CONSTANTS.QUEUE_LOBBY_INVALID_STATE;
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
            queue => queue.lobbyId,
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
    const queueTimeout = new Date();
    queueTimeout.setMinutes(queueTimeout.getMinutes() + timeout);
    return user.update({ queueTimeout });
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
    loadLobbyStateFromDotaLobbyId,
    loadLobbyStateFromMatchId,
    createLobbiesFromQueues,
    hasActiveLobbies,
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
};
