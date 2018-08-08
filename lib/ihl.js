/**
 * @module ihl
 */
 
 /**
 * @typedef module:ihl.InhouseState
 * @type {Object}
 * @property {external:Guild} guild - The discord guild the inhouse belongs to.
 * @property {module:lobby.LobbyState[]} lobbies - A list of lobby states for the inhouse.
 * @property {module:queue.QueueState[]} queues - A list of inhouse queues.
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
const {
    lobbyToLobbyState,
    runLobby,
    getLobbyNameFromCaptains,
    addQueuers,
    addQueuer,
    getQueuers,
    hasQueuer,
} = require('./lobby');
const {
    loadQueue,
} = require('./queue');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const {
    findOrCreateCategory,
    findOrCreateChannelInCategory,
    findOrCreateRole,
    setChannelParent,
    setRolePermissions,
    setRoleMentionable,
} = require('./guild');
const {
    findOrCreateUser,
    findOrCreateLobbyForGuild,
    findLeague,
    findOrCreateQueue,
    findAllActiveLobbies,
    findAllEnabledQueues,
    findActiveLobbiesForUser,
    setChallengeAccepted,
    updateLobbyState,
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
const createInhouseState = eventEmitter => async ({
    league: {
        ready_check_timeout, captain_rank_threshold, captain_role_regexp, category_name, channel_name, admin_role_name, default_game_mode,
    }, guild,
}) => {
    const category = await findOrCreateCategory(guild, category_name);
    const channel = await findOrCreateChannelInCategory(guild, category, channel_name);
    await setChannelParent(category)(channel);
    const adminRole = await findOrCreateRole(guild)(admin_role_name);
    await setRolePermissions([])(adminRole);
    await setRoleMentionable(true)(adminRole);
    const inhouseState = {
        guild,
        lobbies: [],
        queues: [],
        category,
        channel,
        adminRole,
        ready_check_timeout,
        captain_rank_threshold,
        captain_role_regexp,
        default_game_mode,
    };
    eventEmitter.emit(CONSTANTS.EVENT_INHOUSE_CREATED, inhouseState);
    return inhouseState;
};

/**
* Gets a lobby state from an inhouse state by name.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {string} lobby_name - The lobby state to add.
* @returns {module:lobby.LobbyState} lobbyState - The lobby state in the inhouse.
*/
const getLobbyFromInhouse = (inhouseState, lobby_name) => inhouseState.lobbies.find(lobby => lobby.lobby_name === lobby_name);

/**
* Adds a lobby state to an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:lobby.LobbyState} lobbyState - The lobby state to add.
* @returns {module:ihl.InhouseState} A new inhouse state with lobby state added to it.
*/
const addLobbyToInhouse = (inhouseState, lobbyState) => ({ ...inhouseState, lobbies: [...inhouseState.lobbies.filter(lobby => lobby.lobby_name !== lobbyState.lobby_name), lobbyState] });

/**
* Removes a lobby state from an inhouse state by name.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {string} lobbyName - The name of the lobby to remove.
* @returns {module:ihl.InhouseState} A new inhouse state with lobby state removed from it.
*/
const removeLobbyFromInhouseByName = lobbyName => inhouseState => ({ ...inhouseState, lobbies: inhouseState.lobbies.filter(lobby => lobby.lobby_name !== lobbyName) });

/**
* Removes a lobby state from an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:lobby.LobbyState} lobbyOrState - The lobby state to remove.
* @returns {module:ihl.InhouseState} A new inhouse state with lobby state removed from it.
*/
const removeLobbyFromInhouse = lobbyOrState => inhouseState => removeLobbyFromInhouseByName(lobbyOrState.lobby_name)(inhouseState);

/**
* Creates a challenge lobby queue and adds it to an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {external:EventEmitter} eventEmitter - The event listener object.
* @param {module:db.User} captain_1 - A challenge captain.
* @param {module:db.User} captain_2 - A challenge captain.
* @returns {module:ihl.InhouseState} A new inhouse state with lobby and queue added to it.
*/
const createChallengeLobbyForInhouse = ({ resolveUser, findOrCreateChannelInCategory, getLobbyRole }) => async (inhouseState, challenge, eventEmitter, captain_1, captain_2) => {
    const captain_member_1 = await resolveUser(inhouseState.guild, captain_1.discord_id);
    const captain_member_2 = await resolveUser(inhouseState.guild, captain_2.discord_id);
    const lobby_name = await getLobbyNameFromCaptains(captain_member_1.displayName, captain_member_2.displayName, 1);
    const league = await findLeague(inhouseState.guild.id);
    const queue = await findOrCreateQueue(league, true, CONSTANTS.QUEUE_TYPE_CHALLENGE, lobby_name);
    let { queueState, lobbyState } = await loadQueue({ findOrCreateChannelInCategory, getLobbyRole })(inhouseState)(queue);
    const _inhouseState = addQueueToInhouse(inhouseState, queueState);
    lobbyState.captain_1_user_id = captain_1.id;
    lobbyState.captain_2_user_id = captain_2.id;
    await updateLobbyState(lobbyState);
    await addQueuers(lobbyState)([captain_1, captain_2]);
    lobbyState = await runLobby(lobbyState, eventEmitter);
    await setChallengeAccepted(challenge);
    eventEmitter.emit(CONSTANTS.EVENT_DISPLAY_LOBBY_STATUS, lobbyState);
    return addLobbyToInhouse(_inhouseState, lobbyState);
};

/**
* Loads active lobbies from the database into an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with lobbies loaded in.
*/
const loadLobbiesIntoInhouse = eventEmitter => ({ findOrCreateChannelInCategory, getLobbyRole }) => async (_inhouseState) => {
    const inhouseState = { ..._inhouseState };
    const lobbies = await findAllActiveLobbies(inhouseState.guild.id);
    logger.debug(`lobbies to load  ${lobbies.length}`);
    inhouseState.lobbies = await mapPromise(async (lobby) => {
        try {
            const lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, getLobbyRole })(inhouseState)(lobby);
            return lobbyState;
        }
        catch (e) {
            return null;
        }
    })(lobbies);
    inhouseState.lobbies = inhouseState.lobbies.filter(x => x); // filter out lobbies that failed to load
    logger.debug(`${inhouseState.lobbies.length} lobbies loaded into inhouse`);
    eventEmitter.emit(CONSTANTS.EVENT_LOBBIES_LOADED, inhouseState, lobbies.length, inhouseState.lobbies.length);
    return inhouseState;
};

/**
* Runs all lobbies in an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with updated lobby states from being run.
*/
const runLobbiesForInhouse = eventEmitter => async (inhouseState) => ({ ...inhouseState, lobbies: await mapPromise(lobbyState => runLobby(lobbyState, eventEmitter))(inhouseState.lobbies) });

/**
* Loads queues from the database into an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with queues loaded in.
*/
const loadQueuesIntoInhouse = eventEmitter => ({ findOrCreateChannelInCategory, getLobbyRole }) => async (_inhouseState) => {
    const inhouseState = { ..._inhouseState };
    const queues = await findAllEnabledQueues(inhouseState.guild.id);
    logger.debug(`queues to load ${queues.length}`);
    inhouseState.queues = await mapPromise(async (queue) => {
        try {
            const { queueState, lobbyState } = await loadQueue({ findOrCreateChannelInCategory, getLobbyRole })(inhouseState)(queue);
            eventEmitter.emit(CONSTANTS.EVENT_DISPLAY_LOBBY_STATUS, lobbyState);
            return queueState;
        }
        catch (e) {
            return null;
        }
    })(queues);
    inhouseState.queues = inhouseState.queues.filter(x => x); // filter out queues that failed to load
    logger.debug(`${inhouseState.queues.length} queues loaded into inhouse`);
    eventEmitter.emit(CONSTANTS.EVENT_QUEUES_LOADED, inhouseState, queues.length, inhouseState.queues.length);
    return inhouseState;
};

/**
* Get a queue from an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {string} queueName - The name of the queue to remove.
* @returns {module:queue.QueueState} An inhouse queue state.
*/
const getQueueFromInhouseByName = async (inhouseState, queueName) => inhouseState.queues.find(queue => queue.queue_name === queueName);

const getQueueFromInhouseByType = async (inhouseState, queueType) => inhouseState.queues.find(queue => queue.queue_type === queueType);

/**
* Adds a queue state to an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:queue.QueueState} queueState - The queue state to add.
* @returns {module:ihl.InhouseState} A new inhouse state with queue state added to it.
*/
const addQueueToInhouse = (inhouseState, queueState) => ({ ...inhouseState, queues: [...inhouseState.queues.filter(queue => queue.queue_name !== queueState.queue_name), queueState] });

/**
* Removes a queue state from an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {string} queueName - The name of the queue to remove.
* @returns {module:ihl.InhouseState} A new inhouse state with queue state removed from it.
*/
const removeQueueFromInhouse = (inhouseState, queueName) => ({ ...inhouseState, queues: inhouseState.queues.filter(queue => queue.queue_name !== queueName) });

/**
 * Reload a queue state from a lobby state.
 * Non-challenge queues get reloaded with new lobbies
 * Challenge queues get removed
 * @async
 * @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
 * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
 */
const reloadQueueForInhouse = lobbyState => async (_inhouseState) => {
    if (lobbyState.queue_type !== CONSTANTS.QUEUE_TYPE_CHALLENGE) {
        const queue = await getQueueFromInhouseByType(_inhouseState, lobbyState.queue_type);
        const { queueState, lobbyState } = await loadQueue({ findOrCreateChannelInCategory, getLobbyRole })(_inhouseState)(queue);
        eventEmitter.emit(CONSTANTS.EVENT_DISPLAY_LOBBY_STATUS, lobbyState);
        const inhouseState = addLobbyToInhouse(_inhouseState, lobbyState);
        return addQueueToInhouse(inhouseState, queueState);
    }
    else {
        const queue = await getQueueFromInhouseByName(inhouseState, lobbyState.queue_name);
        return removeQueueFromInhouse(inhouseState, queueState);
    }
}

/**
* Checks if a user has active lobbies.
* @function 
* @param {module:db.User} user - The user to check.
* @returns {boolean} Whether the user has active lobbies.
*/
const hasActiveLobbies = async (user) => {
    const lobbies = await findActiveLobbiesForUser(user);
    return !!lobbies.length;
}

/**
* Adds a user to a lobby queue.
* @function 
* @param {module:lobby.LobbyState} lobbyState - A lobby state.
* @param {module:db.User} user - The player to queue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const joinLobbyQueue = (user, eventEmitter) => async (lobbyState) => {
    if (!user.queue_timeout || user.queue_timeout < Date.now()) {
        const inQueue = await hasQueuer(lobbyState)(user);
        if (!inQueue) {
            const inLobby = await hasActiveLobbies(user);
            if (!inLobby) {
                await addQueuer(lobbyState)(user);
                const queuers = await getQueuers(lobbyState);
                eventEmitter.emit(CONSTANTS.EVENT_QUEUE_JOINED, lobbyState, queuers.length);
            }
            else {
                eventEmitter.emit(CONSTANTS.EVENT_QUEUE_ALREADY_JOINED, lobbyState, user);
            }
        }
        else {
            eventEmitter.emit(CONSTANTS.EVENT_QUEUE_ALREADY_JOINED, lobbyState, user);
        }
    }
    else {
        eventEmitter.emit(CONSTANTS.EVENT_QUEUE_BANNED, lobbyState, user);
    }
};

/**
* Add a user to all lobby queues.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to queue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const joinAllQueues = async (inhouseState, user, eventEmitter) => {
    const queues = await findAllEnabledQueues(inhouseState.guild.id);
    for (queue of queues) {
        const lobbyState = getLobby({ lobby_name: queue.queue_name });
        await joinLobbyQueue(lobbyState, user, eventEmitter);
    }
};

/**
* Removes a user from a lobby queue.
* @function 
* @param {module:lobby.LobbyState} lobbyState - A lobby state.
* @param {module:db.User} user - The player to dequeue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const leaveLobbyQueue = (user, eventEmitter) => async (lobbyState) => {
    const inQueue = await hasQueuer(lobbyState)(user);
    if (inQueue) {
        await removeQueuer(lobbyState)(user);
        const queuers = await getQueuers(lobbyState);
        eventEmitter.emit(CONSTANTS.EVENT_QUEUE_LEFT, lobbyState, queuers.length);
    }
    else {
        eventEmitter.emit(CONSTANTS.EVENT_QUEUE_NOT_JOINED, lobbyState);
    }
};

/**
* Removes a user from all lobby queues.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to dequeue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const leaveAllQueues = async (inhouseState, user, eventEmitter) => {
    const queues = await findAllEnabledQueues(inhouseState.guild.id);
    for (queue of queues) {
        const lobbyState = getLobby({ lobby_name: queue.queue_name });
        await leaveLobbyQueue(lobbyState, user, eventEmitter);
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
    const queue_timeout = new Date();
    queue_timeout.setMinutes(queue_timeout.getMinutes() + timeout);
    await user.update({ queue_timeout });
};

module.exports = {
    getUserRankTier,
    registerUser,
    createInhouseState,
    getLobbyFromInhouse,
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
    leaveLobbyQueue,
    leaveAllQueues,
    banInhouseQueue,
};
