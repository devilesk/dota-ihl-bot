const logger = require('./logger');
const CONSTANTS = require('./constants');
const Db = require('./db');
const Guild = require('./guild');
const Lobby = require('./lobby');
const {
    mapPromise,
} = require('./util/fp');

const LobbyQueueHandlers = {
    [CONSTANTS.QUEUE_TYPE_DRAFT]: checkQueueForCaptains => async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        let queuers = await Lobby.getActiveQueuers()(lobbyState);
        if (queuers.length >= 10) {
            // find a suitable captain pair
            const [captain_1, captain_2] = await checkQueueForCaptains(Guild.getUserRoles)(lobbyState);
            logger.debug(`LobbyQueueHandlers checkQueueForCaptains captain_1 ${(captain_1 || {}).id} captain_2 ${(captain_2 || {}).id}`);
            if (captain_1 && captain_2) {
                lobbyState.captain_1_user_id = captain_1.id;
                lobbyState.captain_2_user_id = captain_2.id;
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;

                // update captain queue activity and add as player
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain_1);
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain_2);

                // update top 8 queue activity and add as player, excluding captains
                queuers = queuers.filter(queuer => queuer.id !== captain_1.id && queuer.id !== captain_2.id).slice(0, 8);
                await mapPromise(Lobby.lobbyQueuerToPlayer(lobbyState))(queuers);
            }
        }
        return lobbyState;
    },
    [CONSTANTS.QUEUE_TYPE_AUTO]: () => async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const queuers = await Lobby.getActiveQueuers()(lobbyState);
        if (queuers.length >= 10) {
            lobbyState.state = CONSTANTS.STATE_BEGIN_READY;

            // update top 10 queue activity and add as player
            await mapPromise(Lobby.lobbyQueuerToPlayer(lobbyState))(queuers.slice(0, 10));
        }
        return lobbyState;
    },
    [CONSTANTS.QUEUE_TYPE_CHALLENGE]: () => async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        logger.debug(`LobbyQueueHandlers QUEUE_TYPE_CHALLENGE ${lobbyState.captain_1_user_id} ${lobbyState.captain_2_user_id}`);
        let captain_1 = await Lobby.getQueuerByUserId(lobbyState)(lobbyState.captain_1_user_id);
        let captain_2 = await Lobby.getQueuerByUserId(lobbyState)(lobbyState.captain_2_user_id);
        logger.debug(`LobbyQueueHandlers QUEUE_TYPE_CHALLENGE ${captain_1} ${captain_2}`);
        // if either captain has left queue, kill the lobby and the queue
        if (!captain_1 || !captain_2) {
            lobbyState.state = CONSTANTS.STATE_PENDING_KILL;
            await Lobby.removeQueuers(lobbyState);
            captain_1 = captain_1 || await Db.findUserById(lobbyState.captain_1_user_id);
            captain_2 = captain_2 || await Db.findUserById(lobbyState.captain_2_user_id);
            await Db.destroyChallengeBetweenUsers(captain_1)(captain_2);
            await Db.destroyChallengeBetweenUsers(captain_2)(captain_1);
        }
        else {
            let queuers = await Lobby.getActiveQueuers()(lobbyState);
            // check if captains are active in queue
            if (queuers.length >= 10 && queuers.find(queuer => queuer.id === captain_1.id) && queuers.find(queuer => queuer.id === captain_2.id)) {
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;

                // update captain queue activity and add as player
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain_1);
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain_2);

                // update top 8 queue activity and add as player, excluding captains
                queuers = queuers.filter(queuer => queuer.id !== captain_1.id && queuer.id !== captain_2.id).slice(0, 8);
                await mapPromise(Lobby.lobbyQueuerToPlayer(lobbyState))(queuers);
            }
        }
        return lobbyState;
    },
};

module.exports = LobbyQueueHandlers;