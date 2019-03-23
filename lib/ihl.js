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
const createInhouseState = async ({
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
    return inhouseState;
};

const initLeague = async (guild) => findOrCreateLeague(guild.id)([
    { queue_type: CONSTANTS.QUEUE_TYPE_DRAFT, queue_name: 'player-draft-queue' },
    { queue_type: CONSTANTS.QUEUE_TYPE_AUTO, queue_name: 'autobalanced-queue' },
]);

const createNewLeague = async (guild) => pipeP(
    initLeague,
    league => ({ league, guild }),
    createInhouseState,
)(guild);

/**
* Runs all lobbies in an inhouse state.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @returns {module:ihl.InhouseState} A new inhouse state with updated lobby states from being run.
*/
const runLobbiesForInhouse = eventEmitter => async inhouseState => pipeP(
    findAllActiveLobbies,
    tryMapPromise(lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState)),
    mapPromise(runLobby),
)(inhouseState.guild.id);

const createLobby = ({ findOrCreateChannelInCategory, makeRole }) => ({
    guild,
    category,
    ready_check_timeout,
    captain_rank_threshold,
    captain_role_regexp
}) => async ({
    enabled,
    queue_type,
    queue_name,
}) => {
    const lobby = await findOrCreateLobbyForGuild(guild.id, queue_type, queue_name);
    const inhouseState = { guild, category, ready_check_timeout, captain_rank_threshold, captain_role_regexp };
    const lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState)(lobby);
    return lobbyState;
};

const createLobbiesFromQueues = ({ findOrCreateChannelInCategory, makeRole }) => async (inhouseState) => pipeP(
    findAllEnabledQueues,
    tryMapPromise(createLobby({ findOrCreateChannelInCategory, makeRole })(inhouseState))
)(inhouseState.guild.id);

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
*/
const joinLobbyQueue = user => async (lobbyState) => {
    if (!user.queue_timeout || user.queue_timeout < Date.now()) {
        const inQueue = await hasQueuer(lobbyState)(user);
        if (!inQueue) {
            const inLobby = await hasActiveLobbies(user);
            if (!inLobby) {
                await addQueuer(lobbyState)(user);
                return CONSTANTS.MSG_QUEUE_JOINED;
            }
            else {
                return CONSTANTS.MSG_QUEUE_ALREADY_JOINED;
            }
        }
        else {
            return CONSTANTS.MSG_QUEUE_ALREADY_JOINED
        }
    }
    else {
        return CONSTANTS.MSG_QUEUE_BANNED;
    }
};

/**
* Add a user to all lobby queues.
* @function 
* @param {module:ihl.InhouseState} inhouseState - An inhouse state.
* @param {module:db.User} user - The player to queue.
* @param {external:EventEmitter} eventEmitter - The event listener object.
*/
const getAllLobbyQueues = async inhouseState => {
    const lobbies = await db.Lobby.findAll({ where: { state: CONSTANTS.STATE_WAITING_FOR_QUEUE } });
    const lobbyStates = [];
    for (const lobby of lobbies) {
        lobbyState = lobby ? await lobbyToLobbyState(inhouseState)({ findOrCreateChannelInCategory, makeRole })(lobby) : null;
        if (lobbyState) {
            lobbyStates.push(lobbyState);
        }
    }
    return lobbyStates;
};

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
const getAllLobbyQueuesForUser = async (inhouseState, user) => {
    const queues = await db.LobbyQueuer.findAll({ where: { user_id: user.id } });
    const lobbyStates = [];
    for (const queue of queues) {
        const lobby = await findLobbyById(queue.lobby_id);
        lobbyState = lobby ? await lobbyToLobbyState(inhouseState)({ findOrCreateChannelInCategory, makeRole })(lobby) : null;
        if (lobbyState) {
            lobbyStates.push(lobbyState);
        }
    }
    return lobbyStates;
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
const loadInhouseState = eventEmitter => async ({ league, guild }) => {
    const inhouseState = await createInhouseState({ league, guild });
    await createLobbiesFromQueues({ findOrCreateChannelInCategory, makeRole })(inhouseState);
    await runLobbiesForInhouse(inhouseState);
}

module.exports = {
    getUserRankTier,
    registerUser,
    createInhouseState,
    initLeague,
    createNewLeague,
    runLobbiesForInhouse,
    hasActiveLobbies,
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
    transformLeagueGuild,
    loadInhouseState,
};
