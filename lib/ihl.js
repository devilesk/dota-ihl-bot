/**
 * @module ihl
 */

/**
 * @typedef module:ihl.InhouseState
 * @type {Object}
 * @property {external:Guild} guild - The discord guild the inhouse belongs to.
 * @property {module:queue.QueueState[]} queues - A list of inhouse queues.
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

const BigNumber = require('bignumber.js');
BigNumber.DEBUG = true;
const Sequelize = require('sequelize');
const convertor = require('steam-id-convertor');
const steam = require('steamidconvert')(process.env.STEAM_API_KEY);
const Promise = require('bluebird');
const rp = require('request-promise');
const {
    lobbyToLobbyState,
    addQueuer,
    hasQueuer,
    removeQueuer,
} = require('./lobby');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const {
    findOrCreateCategory,
    findOrCreateChannelInCategory,
    setChannelPosition,
    makeRole,
} = require('./guild');
const {
    findOrCreateUser,
    findOrCreateLobbyForGuild,
    findLobbyById,
    findLeague,
    findOrCreateLeague,
    findAllLobbiesInStateForInhouse,
    findAllEnabledQueues,
    findActiveLobbiesForUser,
    findLobbyQueuersByUserId,
} = require('./db');
const {
    mapPromise,
    tryMapPromise,
    pipeP,
} = require('./util/fp');

const parseSteamID64 = async (text) => {
    logger.debug('parseSteamID64');
    let steamid_64;
    try {
        if (text.indexOf('steamcommunity.com/id') !== -1) {
            logger.debug('parseSteamID64 vanity');
            const vanityName = text.match(/([^/]*)\/*$/)[1];
            const convertVanity = Promise.promisify(steam.convertVanity, { context: steam });
            try {
                steamid_64 = await convertVanity(vanityName);
            }
            catch (e) {
                if (e instanceof Error && e.message === 'Unsuccessful call to api') {
                    return null;
                }
            }
            steamid_64 = new BigNumber(steamid_64).toString();
        }
        else if (text.indexOf('steamcommunity.com/profiles') !== -1) {
            logger.debug('parseSteamID64 steamcommunity');
            steamid_64 = text.match(/([^/]*)\/*$/)[1];
            steamid_64 = new BigNumber(steamid_64).toString();
        }
        else if (text.indexOf('dotabuff.com/players') !== -1 || text.indexOf('opendota.com/players') !== -1 || text.indexOf('stratz.com/en-us/player') !== -1) {
            logger.debug('parseSteamID64 dotabuff');
            const steamid_32 = text.match(/([^/]*)\/*$/)[1];
            steamid_64 = convertor.to64(steamid_32);
            steamid_64 = new BigNumber(steamid_64).toString();
        }
        else {
            logger.debug('parseSteamID64 steamid');
            const max = new BigNumber('4294967295');
            const id = new BigNumber(text);
            steamid_64 = id.comparedTo(max) <= 0 ? convertor.to64(id) : id.toString();
        }
        logger.debug(`parseSteamID64 text ${text} steamid_64 ${steamid_64}`);
        return steamid_64;
    }
    catch (e) {
        logger.debug(`parseSteamID64 error ${e}`);
        if (e instanceof Error && (e.name === 'BigNumber Error' || e.message.indexOf('[BigNumber Error]') === 0)) {
            return null;
        }

        throw e;
    }
};

/**
* Gets a player's badge rank from opendota.
* @function
* @param {string} steamId64 - The player's steamid64.
* @returns {number} The player badge rank.
*/
const getUserRankTier = async (steamId64) => {
    logger.debug('getUserRankTier');
    const accountId = convertor.to32(steamId64);
    const options = {
        uri: `https://api.opendota.com/api/players/${accountId}`,
        json: true,
    };
    const data = await rp(options);
    return data ? data.rank_tier : null;
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
    logger.debug(`registerUser ${guildId} ${steamId64} ${discordId}`);
    // makes sure steamId64 is a valid number
    const steamid_64 = new BigNumber(steamId64).toString();
    const league = await findLeague(guildId);
    const rankTier = await getUserRankTier(steamid_64);
    logger.debug(`registerUser league_id ${league.id} steamid_64 ${steamid_64} discordId ${discordId} rankTier ${rankTier}`);
    const user = await findOrCreateUser(league, steamid_64, discordId, rankTier);
    return user;
};

/**
* Creates an inhouse state.
* Sets up the inhouse category, channel, and role.
* @function
* @returns {module:ihl.InhouseState} An inhouse state object.
*/

const createInhouseState = async ({ league, guild }) => {
    const category = await findOrCreateCategory(guild, league.category_name);
    const channel = await findOrCreateChannelInCategory(guild, category, league.channel_name);
    await setChannelPosition(0)(channel);
    const adminRole = await makeRole(guild)([])(true)(league.admin_role_name);
    return {
        guild,
        category,
        channel,
        adminRole,
        ...(league instanceof Sequelize.Model ? league.get({ plain: true }) : league),
    };
};

const initLeague = async guild => findOrCreateLeague(guild.id)([
    { queue_type: CONSTANTS.QUEUE_TYPE_DRAFT, queue_name: 'player-draft-queue' },
    { queue_type: CONSTANTS.QUEUE_TYPE_AUTO, queue_name: 'autobalanced-queue' },
]);

const createNewLeague = async guild => pipeP(
    initLeague,
    league => ({ league, guild }),
    createInhouseState,
)(guild);

const createLobby = ({ findOrCreateChannelInCategory, makeRole }) => inhouseState => async ({
    queue_type,
    queue_name,
}) => {
    logger.debug(`createLobby ${queue_type} ${queue_name}`);
    const lobby = await findOrCreateLobbyForGuild(inhouseState.guild.id, queue_type, queue_name);
    logger.debug(`createLobby ${queue_type} ${queue_name} ${lobby.id}`);
    const lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState)(lobby);
    logger.debug(`createLobby ${queue_type} ${queue_name} ${lobby.id} lobbyState`);
    return lobbyState;
};

const createLobbiesFromQueues = ({ findOrCreateChannelInCategory, makeRole }) => async inhouseState => pipeP(
    findAllEnabledQueues,
    tryMapPromise(
        pipeP(
            createLobby({ findOrCreateChannelInCategory, makeRole })(inhouseState),
            lobbyState => setChannelPosition(1)(lobbyState.channel),
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
    const lobbies = await findActiveLobbiesForUser(user);
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
        const inQueue = await hasQueuer(lobbyState)(user);
        if (!inQueue) {
            const inLobby = await hasActiveLobbies(user);
            if (!inLobby) {
                if (lobbyState.state === CONSTANTS.STATE_WAITING_FOR_QUEUE) {
                    await addQueuer(lobbyState)(user);
                    return CONSTANTS.MSG_QUEUE_JOINED;
                }

                return null;
            }

            return CONSTANTS.MSG_QUEUE_ALREADY_JOINED;
        }

        return CONSTANTS.MSG_QUEUE_ALREADY_JOINED;
    }

    return CONSTANTS.MSG_QUEUE_BANNED;
};

/**
* Add a user to all lobby queues.
* @function
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to queue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const getAllLobbyQueues = async inhouseState => pipeP(
    findAllLobbiesInStateForInhouse(CONSTANTS.STATE_WAITING_FOR_QUEUE),
    mapPromise(lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState)),
)(inhouseState.guild.id);

/**
* Removes a user from a lobby queue.
* @function
* @param {module:lobby.LobbyState} lobbyState - A lobby state.
* @param {module:db.User} user - The player to dequeue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const leaveLobbyQueue = user => async (lobbyState) => {
    const inQueue = await hasQueuer(lobbyState)(user);
    if (inQueue) {
        await removeQueuer(lobbyState)(user);
    }
    return inQueue;
};

/**
* Removes a user from all lobby queues.
* @function
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to dequeue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const getAllLobbyQueuesForUser = async (inhouseState, user) => pipeP(
    findLobbyQueuersByUserId,
    mapPromise(
        pipeP(
            queue => queue.lobby_id,
            findLobbyById,
            lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState),
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
    createLobbiesFromQueues,
    hasActiveLobbies,
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
};
