 /**
 * @module queue
 */
 
 /**
 * @typedef module:queue.QueueState
 * @type {Object}
 * @property {external:Guild} guild - The discord guild the queue belongs to.
 * @property {boolean} enabled - Whether queue is available to join.
 * @property {string} queue_type - The type of queue.
 * @property {string} queue_name - The queue name.
 */

const logger = require('./logger'); 
const {
    pipeP,
    mapPromise,
} = require('./util/fp');
const {
    lobbyToLobbyState,
} = require('./lobby');
const {
    findOrCreateLobbyForGuild,
} = require('./db');

const getQueue = async queueOrState => (queueOrState instanceof Sequelize.Model ? queueOrState : findQueue(queueOrState));

const getQueuers = options => async queueOrState => (await getQueue(queueOrState)).getUsers(options);

const mapQueuers = fn => async queueOrState => pipeP(getQueuers(), mapPromise(fn))(queueOrState);

const addRoleToQueuers = async queueState => mapQueuers(addRoleToUser(queueState.guild)(queueState.role))(queueState);
 
const loadQueue = ({ findOrCreateChannelInCategory, makeRole }) => ({
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
    const queueState = {
        guild,
        enabled,
        queue_type,
        queue_name,
    };
    return { queueState, lobbyState };
};

module.exports = {
    loadQueue,
}