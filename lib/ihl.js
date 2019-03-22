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
 
/**
 * @typedef {Object} module:ihl.LeagueGuildObject
 * @property {module:db.League} league - A database league record
 * @property {external:Guild} guild - The guild the league belongs to
 */
 
const Sequelize = require('sequelize');

const convertor = require('steam-id-convertor');
const rp = require('request-promise');
const {
    getLobby,
    lobbyToLobbyState,
    runLobby,
    getLobbyNameFromCaptains,
    addQueuers,
    addQueuer,
    getQueuers,
    hasQueuer,
    removeQueuer,
    isMessageFromLobby,
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
    makeRole,
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
    tryMapPromise,
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
    const adminRole = await makeRole(guild)([])(true)(admin_role_name);
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
    eventEmitter.emit(CONSTANTS.MSG_INHOUSE_CREATED, inhouseState);
    return inhouseState;
};

/**
* Gets a lobby state from an inhouse state by name.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {string} lobby_name - The lobby name to find.
* @returns {module:lobby.LobbyState} lobbyState - The lobby state in the inhouse.
*/
const getLobbyFromInhouse = (inhouseState, lobby_name) => inhouseState.lobbies.find(lobby => lobby.lobby_name === lobby_name);

/**
* Gets a lobby state from an inhouse state by channel id.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {string} channelId - The lobby channel id to find.
* @returns {module:lobby.LobbyState} lobbyState - The lobby state in the inhouse.
*/
const getLobbyFromInhouseByChannelId = (inhouseState, channelId) => inhouseState.lobbies.find(lobby => lobby.channel.id === channelId);

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
const createChallengeLobbyForInhouse = ({ resolveUser, findOrCreateChannelInCategory, makeRole }) => async ({ inhouseState, challenge, eventEmitter, captain_1, captain_2 }) => {
    const captain_member_1 = await resolveUser(inhouseState.guild, captain_1.discord_id);
    const captain_member_2 = await resolveUser(inhouseState.guild, captain_2.discord_id);
    const lobby_name = await getLobbyNameFromCaptains(captain_member_1.displayName, captain_member_2.displayName, 1);
    const league = await findLeague(inhouseState.guild.id);
    const queue = await findOrCreateQueue(league, true, CONSTANTS.QUEUE_TYPE_CHALLENGE, lobby_name);
    let { queueState, lobbyState } = await loadQueue({ findOrCreateChannelInCategory, makeRole })(inhouseState)(queue);
    const _inhouseState = addQueueToInhouse(inhouseState, queueState);
    lobbyState.captain_1_user_id = captain_1.id;
    lobbyState.captain_2_user_id = captain_2.id;
    await updateLobbyState(lobbyState);
    await addQueuers(lobbyState)([captain_1, captain_2]);
    lobbyState = await runLobby(lobbyState, eventEmitter);
    await setChallengeAccepted(challenge);
    eventEmitter.emit(CONSTANTS.MSG_LOBBY_STATUS, lobbyState);
    return addLobbyToInhouse(_inhouseState, lobbyState);
};

/**
* Loads active lobbies from the database into an inhouse state.
* @function 
* @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with lobbies loaded in.
*/
const loadLobbiesIntoInhouse = eventEmitter => ({ findOrCreateChannelInCategory, makeRole }) => async (_inhouseState) => {
    const inhouseState = { ..._inhouseState };
    const lobbies = await findAllActiveLobbies(inhouseState.guild.id);
    logger.debug(`lobbies to load  ${lobbies.length}`);
    inhouseState.lobbies = await tryMapPromise(lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState))(lobbies); // filtered out lobbies that failed to load
    logger.debug(`${inhouseState.lobbies.length} lobbies loaded into inhouse`);
    eventEmitter.emit(CONSTANTS.MSG_LOBBIES_LOADED, inhouseState, lobbies.length, inhouseState.lobbies.length);
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
const loadQueuesIntoInhouse = eventEmitter => ({ findOrCreateChannelInCategory, makeRole }) => async (_inhouseState) => {
    const inhouseState = { ..._inhouseState };
    const queues = await findAllEnabledQueues(inhouseState.guild.id);
    logger.debug(`queues to load ${queues.length}`);
    inhouseState.queues = await tryMapPromise(loadQueue({ findOrCreateChannelInCategory, makeRole })(inhouseState))(queues); // filtered out queues that failed to load
    inhouseState.queues.forEach(queue => eventEmitter.emit(CONSTANTS.MSG_LOBBY_STATUS, queue.lobbyState));
    inhouseState.queues = inhouseState.queues.map(queue => queue.queueState);
    logger.debug(`${inhouseState.queues.length} queues loaded into inhouse`);
    eventEmitter.emit(CONSTANTS.MSG_QUEUES_LOADED, inhouseState, queues.length, inhouseState.queues.length);
    return inhouseState;
};

/**
* Get a queue from an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {string} queueName - The name of the queue to remove.
* @returns {module:queue.QueueState} An inhouse queue state.
*/
const getQueueFromInhouseByName = (inhouseState, queueName) => inhouseState.queues.find(queue => queue.queue_name === queueName);

const getQueueFromInhouseByType = (inhouseState, queueType) => inhouseState.queues.find(queue => queue.queue_type === queueType);

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
 * @param {external:EventEmitter} eventEmitter - The event listener object.
 * @param {module:ihl.InhouseState} _inhouseState - An inhouse state.
 * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
 */
const reloadQueueForInhouse = eventEmitter => ({ findOrCreateChannelInCategory, makeRole }) => _lobbyState => async (_inhouseState) => {
    if (_lobbyState.queue_type !== CONSTANTS.QUEUE_TYPE_CHALLENGE) {
        const queue = await getQueueFromInhouseByType(_inhouseState, _lobbyState.queue_type);
        const { queueState, lobbyState } = await loadQueue({ findOrCreateChannelInCategory, makeRole })(_inhouseState)(queue);
        eventEmitter.emit(CONSTANTS.MSG_LOBBY_STATUS, lobbyState);
        const inhouseState = addLobbyToInhouse(_inhouseState, lobbyState);
        return addQueueToInhouse(inhouseState, queueState);
    }
    else {
        return removeQueueFromInhouse(_inhouseState, _lobbyState.lobby_name);
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
                eventEmitter.emit(CONSTANTS.MSG_QUEUE_JOINED, lobbyState, queuers.length);
            }
            else {
                eventEmitter.emit(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, lobbyState, user);
            }
        }
        else {
            eventEmitter.emit(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, lobbyState, user);
        }
    }
    else {
        eventEmitter.emit(CONSTANTS.MSG_QUEUE_BANNED, lobbyState, user);
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
        const lobbyState = await getLobby({ lobby_name: queue.queue_name });
        await joinLobbyQueue(user, eventEmitter)(lobbyState);
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
        eventEmitter.emit(CONSTANTS.MSG_QUEUE_LEFT, lobbyState, queuers.length);
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
        const lobbyState = await getLobby({ lobby_name: queue.queue_name });
        if (lobbyState) {
            await leaveLobbyQueue(user, eventEmitter)(lobbyState);
        }
    }
};

/**
* Bans a user from an inhouse queue.
* @function 
* @param {module:db.User} user - The player to ban.
* @param {number} timeout - The duration of ban in minutes.
*/
const banInhouseQueue = async (user, timeout) => {
    const queue_timeout = new Date();
    queue_timeout.setMinutes(queue_timeout.getMinutes() + timeout);
    return await user.update({ queue_timeout });
};
 
/**
* Takes a list of guilds and a league record and turns it into an object containing both.
* Transforms the input into an object that can be passed to createInhouseState.
* @function 
* @param {external:Guild[]} guilds - A list of guilds to initialize leagues with.
* @param {module:db.League} league - A database league record.
* @returns {module:ihl.LeagueGuildObject} An object containing the league and its guild.
*/
const transformLeagueGuild = guilds => league => ({ league, guild: guilds.get(league.guild_id) });

/**
* Maps a league record and guild to an inhouse state.
* All inhouse lobbies are loaded and run.
* @function 
* @async
* @param {external:EventEmitter} eventEmitter - The event listener object.
* @param {module:ihl.LeagueGuildObject} An object containing the league and its guild.
* @returns {module:ihl.InhouseState} The inhouse state loaded from a league record.
*/
const loadInhouseState = eventEmitter => async ({ league, guild }) => pipeP(
    createInhouseState(eventEmitter),
    loadQueuesIntoInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole }),
    loadLobbiesIntoInhouse(eventEmitter)({ findOrCreateChannelInCategory, makeRole }),
    runLobbiesForInhouse(eventEmitter),
)({ league, guild });

/**
* Checks if a message was sent from an inhouse guild.
* @function
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {external:Message} msg - A discord message sent from a lobby channel.
* @returns {boolean} Whether the message was sent from the inhouse.
*/
const isMessageFromInhouse = msg => inhouseState => inhouseState.guild.id === msg.channel.guild.id;

/**
* Checks if a message was sent from an inhouse admin.
* @function
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {external:Message} msg - A discord message sent from a lobby channel.
* @returns {boolean} Whether the message author is an inhouse admin.
*/
const isMessageFromInhouseAdmin = msg => inhouseState => msg.author.roles.has(inhouseState.adminRole.id);

/**
* Checks if a message was sent from an inhouse admin.
* @function
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {external:Message} msg - A discord message sent from a lobby channel.
* @returns {boolean} Whether the message was sent from an inhouse lobby.
*/
const isMessageFromInhouseLobby = msg => inhouseState => inhouseState.lobbies.some(isMessageFromLobby(msg));

module.exports = {
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
};
