const logger = require('./logger');
const CONSTANTS = require('./constants');
const Fp = require('./util/fp');

/**
 * This provides methods used for ihlManager lobby queue state handling.
 * @mixin
 * @memberof module:ihlManager
 */
const LobbyQueueHandlers = ({ Db, Lobby }) => ({
    async [CONSTANTS.QUEUE_TYPE_DRAFT](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        let queuers = await Lobby.getActiveQueuers()(lobbyState);
        if (queuers.length >= 10) {
            // find a suitable captain pair
            const [captain1, captain2] = await Lobby.checkQueueForCaptains(lobbyState);
            logger.silly(`LobbyQueueHandlers checkQueueForCaptains captain1 ${(captain1 || {}).id} captain2 ${(captain2 || {}).id}`);
            if (captain1 && captain2) {
                lobbyState.captain1UserId = captain1.id;
                lobbyState.captain2UserId = captain2.id;
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;

                // update captain queue activity and add as player
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain1);
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain2);

                // update top 8 queue activity and add as player, excluding captains
                queuers = queuers.filter(queuer => queuer.id !== captain1.id && queuer.id !== captain2.id).slice(0, 8);
                await Fp.mapPromise(Lobby.lobbyQueuerToPlayer(lobbyState))(queuers);
            }
            else {
                this[CONSTANTS.MSG_WAITING_FOR_CAPTAINS](lobbyState);
            }
        }
        return lobbyState;
    },
    async [CONSTANTS.QUEUE_TYPE_AUTO](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        const queuers = await Lobby.getActiveQueuers()(lobbyState);
        logger.silly(`QUEUE_TYPE_AUTO ${queuers.length} ${lobbyState.lobbyName}`);
        if (queuers.length >= 10) {
            lobbyState.state = CONSTANTS.STATE_BEGIN_READY;

            // update top 10 queue activity and add as player
            await Fp.mapPromise(Lobby.lobbyQueuerToPlayer(lobbyState))(queuers.slice(0, 10));
        }
        return lobbyState;
    },
    async [CONSTANTS.QUEUE_TYPE_CHALLENGE](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        logger.silly(`LobbyQueueHandlers QUEUE_TYPE_CHALLENGE ${lobbyState.captain1UserId} ${lobbyState.captain2UserId}`);
        let captain1 = await Lobby.getQueuerByUserId(lobbyState)(lobbyState.captain1UserId);
        let captain2 = await Lobby.getQueuerByUserId(lobbyState)(lobbyState.captain2UserId);
        logger.silly(`LobbyQueueHandlers QUEUE_TYPE_CHALLENGE ${captain1} ${captain2}`);
        // if either captain has left queue, kill the lobby and the queue
        if (!captain1 || !captain2) {
            lobbyState.state = CONSTANTS.STATE_PENDING_KILL;
            await Lobby.removeQueuers(lobbyState);
            captain1 = captain1 || await Db.findUserById(lobbyState.captain1UserId);
            captain2 = captain2 || await Db.findUserById(lobbyState.captain2UserId);
            await Db.destroyChallengeBetweenUsers(captain1)(captain2);
            await Db.destroyChallengeBetweenUsers(captain2)(captain1);
        }
        else {
            let queuers = await Lobby.getActiveQueuers()(lobbyState);
            // check if captains are active in queue
            if (queuers.length >= 10 && queuers.find(queuer => queuer.id === captain1.id) && queuers.find(queuer => queuer.id === captain2.id)) {
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;

                // update captain queue activity and add as player
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain1);
                await Lobby.lobbyQueuerToPlayer(lobbyState)(captain2);

                // update top 8 queue activity and add as player, excluding captains
                queuers = queuers.filter(queuer => queuer.id !== captain1.id && queuer.id !== captain2.id).slice(0, 8);
                await Fp.mapPromise(Lobby.lobbyQueuerToPlayer(lobbyState))(queuers);
            }
        }
        return lobbyState;
    },
});

module.exports = LobbyQueueHandlers;
