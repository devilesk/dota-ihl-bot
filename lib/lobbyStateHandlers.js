const logger = require('./logger');
const CONSTANTS = require('./constants');
const Fp = require('./util/fp');
const Promise = require('bluebird');

const LobbyStateTransitions = {
    [CONSTANTS.STATE_CHECKING_READY]: {
        [CONSTANTS.QUEUE_TYPE_DRAFT]: CONSTANTS.STATE_CHOOSING_SIDE,
        [CONSTANTS.QUEUE_TYPE_CHALLENGE]: CONSTANTS.STATE_CHOOSING_SIDE,
        [CONSTANTS.QUEUE_TYPE_AUTO]: CONSTANTS.STATE_AUTOBALANCING,
    },
};

const lobbyStateNoOp = async function (_lobbyState) {
    return { ..._lobbyState };
};

const LobbyStateHandlers = ({
    DotaBot, Db, Guild, Lobby, MatchTracker, LobbyQueueHandlers,
}) => ({
    async [CONSTANTS.STATE_NEW](_lobbyState) {
        await Db.updateLobbyState(_lobbyState)(CONSTANTS.STATE_WAITING_FOR_QUEUE);
        return { ..._lobbyState, state: CONSTANTS.STATE_WAITING_FOR_QUEUE };
    },
    async [CONSTANTS.STATE_WAITING_FOR_QUEUE](_lobbyState) {
        const lobbyState = LobbyQueueHandlers({ Db, Guild, Lobby })[_lobbyState.queue_type](Lobby.checkQueueForCaptains)(_lobbyState);
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_BEGIN_READY](_lobbyState) {
        let lobbyState = { ..._lobbyState };
        lobbyState = await Fp.pipeP(
            Lobby.assignLobbyName,
            Lobby.assignGameMode,
        )(lobbyState);

        lobbyState.channel = await Guild.setChannelName(lobbyState.lobby_name)(lobbyState.channel);
        lobbyState.role = await Guild.setRoleName(lobbyState.lobby_name)(lobbyState.role);
        await Lobby.addRoleToPlayers(lobbyState);

        // destroy any accepted challenges for players
        await Lobby.mapPlayers(Db.destroyAllAcceptedChallengeForUser)(lobbyState);

        if (!lobbyState.ready_check_time) {
            lobbyState.ready_check_time = Date.now();
        }
        this.registerLobbyTimeout(lobbyState);
        lobbyState.state = CONSTANTS.STATE_CHECKING_READY;

        await Db.updateLobby(lobbyState);
        this.onCreateLobbyQueue(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_CHECKING_READY](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        const playersNotReady = await Lobby.getNotReadyPlayers()(lobbyState);
        logger.debug(`STATE_CHECKING_READY ${lobbyState.id} playersNotReady ${playersNotReady.length}`);
        logger.debug(`STATE_CHECKING_READY ${lobbyState.id} ready_check_timeout ${lobbyState.inhouseState.ready_check_timeout} elapsed ${Date.now() - lobbyState.ready_check_time}`);
        if (playersNotReady.length === 0) {
            await Lobby.removeLobbyPlayersFromQueues(lobbyState);
            lobbyState.state = LobbyStateTransitions[lobbyState.state][lobbyState.queue_type];
            this.unregisterLobbyTimeout(lobbyState);
            this.emit(CONSTANTS.MSG_PLAYERS_READY, lobbyState);
        }
        else if (Lobby.isReadyCheckTimedOut(lobbyState)) {
            logger.debug(`STATE_CHECKING_READY ${lobbyState.id} isReadyCheckTimedOut true`);
            for (const player of playersNotReady) {
                logger.debug(`STATE_CHECKING_READY ${lobbyState.id} removing player not ready ${player.id}`);
                await Lobby.removeUserFromQueues(player);
                await Lobby.removePlayer(lobbyState)(player);
                if (lobbyState.captain_1_user_id === player.id) {
                    lobbyState.captain_1_user_id = null;
                }
                if (lobbyState.captain_2_user_id === player.id) {
                    lobbyState.captain_2_user_id = null;
                }
            }
            await Lobby.returnPlayersToQueue(lobbyState);
            this.emit(CONSTANTS.MSG_READY_CHECK_FAILED, lobbyState, playersNotReady);
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_QUEUE;
        }
        else {
            logger.debug(`STATE_CHECKING_READY ${lobbyState.id} isReadyCheckTimedOut false`);
        }
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_ASSIGNING_CAPTAINS](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        if (lobbyState.captain_1_user_id == null || lobbyState.captain_2_user_id == null) {
            const [captain_1, captain_2] = await Lobby.assignCaptains(Guild.getUserRoles)(lobbyState);
            logger.debug(`lobby run assignCaptains captain_1 ${!!captain_1} captain_2 ${!!captain_2}`);
            lobbyState.state = (captain_1 && captain_2) ? CONSTANTS.STATE_CHOOSING_SIDE : CONSTANTS.STATE_AUTOBALANCING;
            lobbyState.captain_1_user_id = captain_1 ? captain_1.id : null;
            lobbyState.captain_2_user_id = captain_2 ? captain_2.id : null;
            this.emit(CONSTANTS.MSG_ASSIGNED_CAPTAINS, lobbyState);
        }
        else {
            logger.debug(`lobby run assignCaptains captains exist ${lobbyState.captain_1_user_id}, ${lobbyState.captain_2_user_id}`);
            this.emit(CONSTANTS.MSG_ASSIGNED_CAPTAINS, lobbyState);
            lobbyState.state = CONSTANTS.STATE_CHOOSING_SIDE;
        }
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_CHOOSING_SIDE](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        await Lobby.setPlayerTeam(1)(lobbyState)(lobbyState.captain_1_user_id);
        await Lobby.setPlayerTeam(2)(lobbyState)(lobbyState.captain_2_user_id);
        lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_DRAFTING_PLAYERS](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        const faction = await Lobby.getDraftingFaction(lobbyState.inhouseState.draft_order)(lobbyState);
        const captain = await Lobby.getFactionCaptain(lobbyState)(faction);
        logger.debug(`lobby run STATE_DRAFTING_PLAYERS ${faction} ${captain}`);
        if (captain) {
            this.emit(CONSTANTS.MSG_DRAFT_TURN, lobbyState, captain);
        }
        else {
            lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
        }
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_AUTOBALANCING](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        this.emit(CONSTANTS.MSG_AUTOBALANCING, lobbyState);
        const playersNoTeam = await Lobby.getNoTeamPlayers()(lobbyState);
        const unassignedCount = playersNoTeam.length;
        logger.debug(`Autobalancing unassigned count ${unassignedCount}`);
        if (unassignedCount) {
            logger.debug('Autobalancing...');
            const getPlayerRating = Lobby.getPlayerRatingFunction(lobbyState.inhouseState.matchmaking_system);
            await Lobby.autoBalanceTeams(getPlayerRating)(lobbyState);
            logger.debug('Autobalancing... done');
        }
        lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_TEAMS_SELECTED](_lobbyState) {
        const lobbyState = { ..._lobbyState, state: CONSTANTS.STATE_WAITING_FOR_BOT };
        this.emit(CONSTANTS.MSG_TEAMS_SELECTED, lobbyState);
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_WAITING_FOR_BOT](_lobbyState) {
        let lobbyState = { ..._lobbyState };
        logger.debug(`STATE_WAITING_FOR_BOT ${lobbyState.id} ${lobbyState.bot_id}`);
        if (lobbyState.bot_id == null) {
            const bot = await Db.findUnassignedBot(lobbyState.inhouseState);
            if (bot) {
                logger.debug(`lobby run findUnassignedBot ${bot.steamid_64}`);
                lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
                lobbyState = await Lobby.assignBotToLobby(lobbyState)(bot.id);
            }
        }
        else {
            lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
        }
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_BOT_ASSIGNED](_lobbyState) {
        let lobbyState = { ..._lobbyState };
        if (lobbyState.bot_id != null) {
            const dotaBot = await this.loadBot(lobbyState.bot_id);
            if (dotaBot) {
                // check if bot is in another lobby already
                if ((!lobbyState.lobby_id && !dotaBot.lobby_id) || (lobbyState.lobby_id === dotaBot.lobby_id)) {
                    const tickets = await DotaBot.loadDotaBotTickets(dotaBot);
                    // check if bot has ticket if needed
                    if (!lobbyState.inhouseState.leagueid || tickets.find(ticket => ticket.leagueid === lobbyState.inhouseState.leagueid)) {
                        const enterLobbyP = lobbyState.lobby_id ? DotaBot.joinDotaBotLobby(lobbyState)(dotaBot) : DotaBot.createDotaBotLobby(lobbyState)(dotaBot);
                        enterLobbyP.then(async (dotaBot) => {
                            lobbyState.lobby_id = dotaBot.lobby_id;
                            lobbyState.state = CONSTANTS.STATE_BOT_STARTED;
                            await Db.updateLobby(lobbyState);
                            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_BOT_STARTED]);
                        }).catch(async (e) => {
                            logger.log({ level: 'error', message: e });
                            this.removeBot(lobbyState.bot_id);
                            lobbyState.state = CONSTANTS.STATE_BOT_FAILED;
                            await Db.updateLobby(lobbyState);
                            lobbyState = await Lobby.unassignBotFromLobby(lobbyState);
                            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_BOT_FAILED]);
                        });
                    }
                    else {
                        logger.debug(`Ticket ${lobbyState.inhouseState.leagueid} not found on bot.`);
                        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                        lobbyState = await Lobby.unassignBotFromLobby(lobbyState);
                    }
                }
                else {
                    logger.debug(`lobby_id mismatch. lobbyState.lobby_id ${lobbyState.lobby_id} dotaBot.lobby_id ${dotaBot.lobby_id}`);
                    lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                    lobbyState = await Lobby.unassignBotFromLobby(lobbyState);
                }
            }
            await Db.updateLobby(lobbyState);
            return lobbyState;
        }

        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_BOT_STARTED](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        const dotaBot = this.getBot(lobbyState.bot_id);
        const players = await Lobby.getPlayers()(lobbyState);
        dotaBot.factionCache = players.reduce(Lobby.reducePlayerToFactionCache, {});
        await Lobby.mapPlayers(DotaBot.invitePlayer(dotaBot))(lobbyState);
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_PLAYERS;
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    [CONSTANTS.STATE_BOT_FAILED]: lobbyStateNoOp,
    async [CONSTANTS.STATE_WAITING_FOR_PLAYERS](_lobbyState) {
        const lobbyState = { ..._lobbyState };
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            if (DotaBot.isDotaLobbyReady(dotaBot.factionCache, dotaBot.playerState)) {
                logger.debug('lobby run isDotaLobbyReady true');
                lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
                lobbyState.started_at = Date.now();
                lobbyState.match_id = await DotaBot.startDotaLobby(dotaBot);
                if (lobbyState.leagueid) {
                    await this.botLeaveLobby(lobbyState);
                }
                await Lobby.removeQueuers(lobbyState);
                this.matchTracker.addLobby(lobbyState);
                this.matchTracker.run();
                this.emit(CONSTANTS.MSG_LOBBY_STARTED, lobbyState);
            }
        }
        else {
            lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
        }
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    [CONSTANTS.STATE_MATCH_IN_PROGRESS]: lobbyStateNoOp,
    [CONSTANTS.STATE_MATCH_ENDED]: lobbyStateNoOp,
    async [CONSTANTS.STATE_MATCH_STATS](_lobbyState) {
        let lobbyState = { ..._lobbyState };
        await MatchTracker.updatePlayerRatings(lobbyState);
        lobbyState.state = CONSTANTS.STATE_COMPLETED;
        await Db.updateLobby(lobbyState);
        await this.botLeaveLobby(lobbyState);
        lobbyState = await Lobby.unassignBotFromLobby(lobbyState);
        return lobbyState;
    },
    async [CONSTANTS.STATE_PENDING_KILL](_lobbyState) {
        let lobbyState = { ..._lobbyState };
        if (lobbyState.bot_id != null) {
            await this.botLeaveLobby(lobbyState);
            lobbyState = await Lobby.unassignBotFromLobby(lobbyState);
        }
        if (lobbyState.channel) {
            await lobbyState.channel.delete();
            lobbyState.channel = null;
        }
        if (lobbyState.role) {
            await lobbyState.role.delete();
            lobbyState.role = null;
        }
        await Lobby.removeQueuers(lobbyState);
        await Lobby.removePlayers(lobbyState);
        lobbyState.channel_id = null;
        lobbyState.role_id = null;
        lobbyState.state = CONSTANTS.STATE_KILLED;
        await Db.updateLobby(lobbyState);
        return lobbyState;
    },
    [CONSTANTS.STATE_KILLED]: lobbyStateNoOp,
    [CONSTANTS.STATE_COMPLETED]: lobbyStateNoOp,
    [CONSTANTS.STATE_FAILED]: lobbyStateNoOp,
});

module.exports = {
    LobbyStateTransitions,
    LobbyStateHandlers,
};
