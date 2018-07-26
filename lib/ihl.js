/**
 * @module ihl
 */
 
 /**
 * @typedef module:ihl.InhouseState
 * @type {Object}
 * @property {external:Guild} guild - The discord guild the inhouse belongs to.
 * @property {module:lobby.LobbyState[]} lobbies - A list of lobby states for the inhouse.
 * @property {external:CategoryChannel} category - The discord inhouse category.
 * @property {external:GuildChannel} channel - The discord inhouse general channel.
 * @property {external:Role} adminRole - The discord inhouse admin role.
 * @property {number} ready_check_timeout - Duration in milliseconds before lobby ready timeout. 
 * @property {number} captain_rank_threshold - Maximum rank difference between captains. 
 * @property {string} captain_role_regexp - Regular expression string for captain roles.
 */
 
const Sequelize = require('sequelize');

const convertor = require('steam-id-convertor');
const rp = require('request-promise');
const db = require('../models');
const {
    initLobby, loadLobby, runLobby, addPlayers, addRoleToPlayers,
} = require('./lobby');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const {
    findOrCreateCategory, findOrCreateChannelInCategory, findOrCreateRole,
} = require('./guild');
const {
    findOrCreateUser, findLeague, findOrCreateQueue, findAllActiveLobbies, findInQueueWithUser, updateQueueStates, destroyQueues, countQueueInQueue, findInQueueBySteamId,
} = require('./db');
const {
    mapPromise,
} = require('./util/fp');

/**
* Gets a player's badge rank from opendota.
* @function 
* @param {string} steamId64 - The player's steamid64.
* @returns {number} The player badge rank.
*/
const getUserRankTier = async (steamId64) => {
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
    const league = await findLeague(guildId);
    const rankTier = await getUserRankTier(steamId64);
    logger.debug(`registerUser league_id ${league.id} steamId64 ${steamId64} discordId ${discordId} rankTier ${rankTier}`);
    const user = await findOrCreateUser(league, steamId64, discordId, rankTier);
    return user;
};

/**
* Creates an inhouse state.
* Sets up the inhouse category, channel, and role.
* @function 
* @returns {module:ihl.InhouseState} An inhouse state object.
*/
const createInhouseState = async ({
    league: {
        ready_check_timeout, captain_rank_threshold, captain_role_regexp, category_name, channel_name, admin_role_name,
    }, guild,
}) => {
    logger.debug('createInhouseState');
    const category = await findOrCreateCategory(guild, category_name);
    const channel = await findOrCreateChannelInCategory(guild, category, channel_name);
    await channel.setParent(category);
    const adminRole = await findOrCreateRole(guild, admin_role_name);
    await adminRole.setPermissions([]);
    await adminRole.setMentionable(true);
    return {
        guild,
        lobbies: [],
        category,
        channel,
        adminRole,
        ready_check_timeout,
        captain_rank_threshold,
        captain_role_regexp,
    };
};

/**
* Adds a lobby state to an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @param {module:lobby.LobbyState} lobbyState - The lobby state to add.
* @returns {module:ihl.InhouseState} A new inhouse state with lobby state added to it.
*/
const addLobbyToInhouse = (_inhouseState, lobbyState) => {
    const inhouseState = { ..._inhouseState };
    inhouseState.lobbies = [...inhouseState.lobbies.filter(lobby => lobby.lobby_name !== lobbyState.lobby_name), lobbyState];
    return inhouseState;
};

/**
* Creates a lobby and adds it to an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @param {external:EventEmitter} eventEmitter - The event listener object.
* @param {module:db.User[]} users - The players that will be added to the lobby.
* @returns {module:ihl.InhouseState} A new inhouse state with lobby state added to it.
*/
const createNewLobbyForInhouse = async (_inhouseState, eventEmitter, users) => {
    logger.debug('createNewLobbyForInhouse');
    let lobbyState = await initLobby(_inhouseState);
    await addPlayers(lobbyState)(users);
    await addRoleToPlayers(lobbyState);
    lobbyState = await runLobby(lobbyState, eventEmitter);
    return addLobbyToInhouse(_inhouseState, lobbyState);
};

/**
* Removes a lobby from an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @param {string} lobbyName - The name of the lobby to remove.
* @returns {module:ihl.InhouseState} A new inhouse state with lobby state removed from it.
*/
const removeLobbyFromInhouse = (_inhouseState, lobbyName) => {
    const inhouseState = { ..._inhouseState };
    inhouseState.lobbies = inhouseState.lobbies.filter(lobby => lobby.lobby_name !== lobbyName);
    return inhouseState;
};

/**
* Loads active lobbies from the database into an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with lobbies loaded in.
*/
const loadLobbiesIntoInhouse = async (_inhouseState) => {
    const inhouseState = { ..._inhouseState };
    const lobbies = await findAllActiveLobbies(inhouseState.guild.id);
    inhouseState.lobbies = await mapPromise(lobby => {
        try {
            return loadLobby({ ...inhouseState, lobby_name: lobby.lobby_name });
        }
        catch (e) {
            return null;
        }
    })(lobbies);
    inhouseState.lobbies = inhouseState.lobbies.filter(x => x); // filter out lobbies that failed to load
    logger.debug(`${inhouseState.lobbies.length} lobbies loaded into inhouse`);
    return inhouseState;
};

/**
* Runs all lobbies in an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with updated lobby states from being run.
*/
const runLobbiesForInhouse = eventEmitter => async (_inhouseState) => {
    const inhouseState = { ..._inhouseState };
    inhouseState.lobbies = await mapPromise(lobbyState => runLobby(lobbyState, eventEmitter))(inhouseState.lobbies);
    return inhouseState;
};

/**
* Runs all lobbies in an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with updated lobby states from being run.
*/
const checkInhouseQueue = eventEmitter => async (_inhouseState) => {
    let inhouseState = { ..._inhouseState };
    const queues = await findInQueueWithUser();
    logger.debug(`checkInhouseQueue ${queues.length}`);
    if (queues.length === 10) {
        const queueIds = queues.map(queue => queue.id);
        await updateQueueStates(CONSTANTS.QUEUE_IN_LOBBY)(queueIds);
        const users = queues.map(queue => queue.User);
        try {
            inhouseState = await createNewLobbyForInhouse(_inhouseState, eventEmitter, users);
        }
        catch (e) {
            await destroyQueues(queueIds);
            throw e;
        }
    }
    return inhouseState;
};

/**
* Adds a user to an inhouse queue.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to queue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
// TODO: guild specific queue.
const joinInhouseQueue = async (inhouseState, user, eventEmitter) => {
    if (!user.queue_timeout || user.queue_timeout < Date.now()) {
        const [, created] = await findOrCreateQueue(user);
        if (created) {
            const queueCount = await countQueueInQueue(inhouseState.guild.id);
            eventEmitter.emit(CONSTANTS.EVENT_QUEUE_JOINED, inhouseState, queueCount);
        }
        else {
            eventEmitter.emit(CONSTANTS.EVENT_QUEUE_ALREADY_JOINED, inhouseState, user);
        }
    }
    else {
        eventEmitter.emit(CONSTANTS.EVENT_QUEUE_BANNED, inhouseState, user);
    }
};

/**
* Removes a user from an inhouse queue.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to dequeue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const leaveInhouseQueue = async (inhouseState, user, eventEmitter) => {
    const queue = await findInQueueBySteamId(inhouseState.guild.id)(user.steamid_64);
    if (queue) {
        await destroyQueues([queue.id]);
        const queueCount = await countQueueInQueue(inhouseState.guild.id);
        eventEmitter.emit(CONSTANTS.EVENT_QUEUE_LEFT, inhouseState, queueCount);
    }
    else {
        eventEmitter.emit(CONSTANTS.EVENT_QUEUE_NOT_JOINED, inhouseState);
    }
};

/**
* Bans a user from an inhouse queue.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to ban.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const banInhouseQueue = async (inhouseState, user, timeout) => {
    const queue = await findInQueueBySteamId(inhouseState.guild.id)(user.steamid_64);
    await destroyQueues([queue.id]);
    const queue_timeout = new Date();
    queue_timeout.setMinutes(queue_timeout.getMinutes() + timeout);
    await user.update({ queue_timeout });
};

module.exports = {
    getUserRankTier,
    registerUser,
    createInhouseState,
    createNewLobbyForInhouse,
    addLobbyToInhouse,
    removeLobbyFromInhouse,
    loadLobbiesIntoInhouse,
    runLobbiesForInhouse,
    checkInhouseQueue,
    joinInhouseQueue,
    leaveInhouseQueue,
    banInhouseQueue,
};
