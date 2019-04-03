const logger = require('./logger');
const CONSTANTS = require('./constants');
const DotaBot = require('./dotaBot');
const Db = require('./db');
const Guild = require('./guild');
const Lobby = require('./lobby');
const MatchTracker = require('./matchTracker');
const LobbyQueueHandlers = require('./lobbyQueueHandlers');
const {
    pipeP,
} = require('./util/fp');

const LobbyStateTransitions = {
    [CONSTANTS.STATE_CHECKING_READY]: {
        [CONSTANTS.QUEUE_TYPE_DRAFT]: CONSTANTS.STATE_CHOOSING_SIDE,
        [CONSTANTS.QUEUE_TYPE_CHALLENGE]: CONSTANTS.STATE_CHOOSING_SIDE,
        [CONSTANTS.QUEUE_TYPE_AUTO]: CONSTANTS.STATE_AUTOBALANCING,
    },
};

const LobbyStateHandlers = {
    [CONSTANTS.STATE_NEW]: async function (_lobbyState) {
        return { ..._lobbyState, state: CONSTANTS.STATE_WAITING_FOR_QUEUE };
    },
    [CONSTANTS.STATE_WAITING_FOR_QUEUE]: async function (_lobbyState) {
        return LobbyQueueHandlers[_lobbyState.queue_type](Lobby.checkQueueForCaptains)(_lobbyState);
    },
    [CONSTANTS.STATE_BEGIN_READY]: async function (_lobbyState) {
        let lobbyState = { ..._lobbyState };
        lobbyState = await pipeP(
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
            this.registerLobbyTimeout(lobbyState);
            this.eventEmitter.emit(CONSTANTS.MSG_READY_CHECK_START);
        }
        lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
        
        this.onCreateLobbyQueue(lobbyState);
        return lobbyState;
    },
    [CONSTANTS.STATE_CHECKING_READY]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const playersNotReady = await Lobby.getNotReadyPlayers()(lobbyState);
        logger.debug(`STATE_CHECKING_READY ${lobbyState.id} playersNotReady ${playersNotReady.length}`);
        logger.debug(`STATE_CHECKING_READY ${lobbyState.id} ready_check_timeout ${lobbyState.inhouseState.ready_check_timeout} elapsed ${Date.now() - lobbyState.ready_check_time}`);
        if (playersNotReady.length === 0) {
            await Lobby.removeLobbyPlayersFromQueues(lobbyState);
            lobbyState.state = LobbyStateTransitions[lobbyState.state][lobbyState.queue_type];
            this.unregisterLobbyTimeout(lobbyState);
            this.eventEmitter.emit(CONSTANTS.MSG_PLAYERS_READY);
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
            this.eventEmitter.emit(CONSTANTS.MSG_READY_CHECK_FAILED, playersNotReady);
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_QUEUE;
        }
        else {
            logger.debug(`STATE_CHECKING_READY ${lobbyState.id} isReadyCheckTimedOut false`);
        }
        return lobbyState;
    },
    [CONSTANTS.STATE_ASSIGNING_CAPTAINS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        if (lobbyState.captain_1_user_id == null || lobbyState.captain_2_user_id == null) {
            const [captain_1, captain_2] = await Lobby.assignCaptains(Guild.getUserRoles)(lobbyState);
            logger.debug(`lobby run assignCaptains captain_1 ${!!captain_1} captain_2 ${!!captain_2}`);
            lobbyState.state = (captain_1 && captain_2) ? CONSTANTS.STATE_CHOOSING_SIDE : CONSTANTS.STATE_AUTOBALANCING;
            lobbyState.captain_1_user_id = captain_1 ? captain_1.id : null;
            lobbyState.captain_2_user_id = captain_2 ? captain_2.id : null;
            this.eventEmitter.emit(CONSTANTS.MSG_ASSIGNED_CAPTAINS);
        }
        else {
            logger.debug(`lobby run assignCaptains captains exist ${lobbyState.captain_1_user_id}, ${lobbyState.captain_2_user_id}`);
            this.eventEmitter.emit(CONSTANTS.MSG_ASSIGNED_CAPTAINS);
            lobbyState.state = CONSTANTS.STATE_CHOOSING_SIDE;
        }
        return lobbyState;
    },
    [CONSTANTS.STATE_CHOOSING_SIDE]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        await Lobby.setPlayerTeam(1)(lobbyState)(lobbyState.captain_1_user_id);
        await Lobby.setPlayerTeam(2)(lobbyState)(lobbyState.captain_2_user_id);
        lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
        return lobbyState;
    },
    [CONSTANTS.STATE_DRAFTING_PLAYERS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        lobbyState.faction = await Lobby.getDraftingFaction([1, 2, 2, 1, 2, 1, 1, 2])(lobbyState);
        const lobbyPlayer = await Lobby.getFactionCaptain(lobbyState)(lobbyState.faction);
        logger.debug(`lobby run playerDraft faction ${lobbyState.faction}`);
        if (lobbyPlayer) {
            logger.debug(`lobby run lobbyPlayer ${lobbyPlayer.id}`);
            lobbyState.currentPick = lobbyPlayer.LobbyPlayer.faction;
            this.eventEmitter.emit(CONSTANTS.MSG_DRAFT_TURN);
        }
        else {
            lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
        }
        return lobbyState;
    },
    [CONSTANTS.STATE_AUTOBALANCING]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        this.eventEmitter.emit(CONSTANTS.MSG_AUTOBALANCING);
        const playersNoTeam = await Lobby.getNoTeamPlayers()(lobbyState);
        const unassignedCount = playersNoTeam.length;
        logger.debug(`Autobalancing unassigned count ${unassignedCount}`);
        if (unassignedCount) {
            logger.debug('Autobalancing...');
            const getPlayerRating = Lobby.getPlayerRatingFunction(lobbyState);
            await Lobby.autoBalanceTeams(getPlayerRating)(lobbyState);
            logger.debug('Autobalancing... done');
        }
        lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
        return lobbyState;
    },
    [CONSTANTS.STATE_TEAMS_SELECTED]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
        this.eventEmitter.emit(CONSTANTS.MSG_TEAMS_SELECTED);
        return lobbyState;
    },
    [CONSTANTS.STATE_WAITING_FOR_BOT]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        logger.debug(`STATE_WAITING_FOR_BOT ${lobbyState.id} ${lobbyState.bot_id}`);
        if (lobbyState.bot_id == null) {
            const bot = await Db.findUnassignedBot();
            if (bot) {
                logger.debug(`lobby run findUnassignedBot ${bot.steamid_64}`);
                lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
                lobbyState.bot_id = bot.id;
            }
            else {
                lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                lobbyState.bot_id = null;
                lobbyState.lobby_id = null;
            }
        }
        else {
            lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
        }
        return lobbyState;
    },
    [CONSTANTS.STATE_BOT_ASSIGNED]: async function (_lobbyState) {
        const lobbyState = { ..._lobbyState };
        if (lobbyState.bot_id != null) {
            if (!Object.hasOwnProperty.call(this.bots, lobbyState.bot_id)) {
                await Db.updateBotStatus(CONSTANTS.BOT_LOADING)(lobbyState.bot_id);
                const dotaBot = await pipeP(
                    Db.findBot,
                    DotaBot.createDotaBot,
                )(lobbyState.bot_id);
                this.bots[lobbyState.bot_id] = dotaBot;
                DotaBot.connectDotaBot(dotaBot).then(dotaBot => {
                    if (lobbyState.lobby_id) {
                        return DotaBot.joinDotaBotLobby(lobbyState)(dotaBot);
                    }
                    else {
                        return DotaBot.createDotaBotLobby(lobbyState)(dotaBot);
                    }
                }).then(async dotaBot => {
                    lobbyState.lobby_id = dotaBot.lobby_id;
                    lobbyState.state = CONSTANTS.STATE_BOT_STARTED;
                    await Db.updateLobby(lobbyState);
                    this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_BOT_STARTED]);
                }).catch(async () => {
                    logger.log({ level: 'error', message: e });
                    if (dotaBot) {
                        disconnectDotaBot(dotaBot);
                    }
                    lobbyState.state = CONSTANTS.STATE_BOT_FAILED;
                    lobbyState.bot_id = null;
                    lobbyState.lobby_id = null;
                    await Db.updateLobby(lobbyState);
                    delete this.bots[lobbyState.bot_id];
                    this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_BOT_FAILED]);
                });
            }
            return lobbyState;
        }
        else {
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
            return lobbyState;
        }
    },
    [CONSTANTS.STATE_BOT_STARTED]: async function (_lobbyState) {
        const lobbyState = { ..._lobbyState };
        const dotaBot = this.bots[lobbyState.bot_id];
            dotaBot.on(CONSTANTS.MSG_CHAT_MESSAGE, (channel, sender_name, message, chatData) => this.eventEmitter.emit(CONSTANTS.MSG_CHAT_MESSAGE, lobbyState, channel, sender_name, message, chatData));
            dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, member => this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, lobbyState, member));
            dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, member => this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, lobbyState, member));
            dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, state => this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, lobbyState, state));
            dotaBot.on(CONSTANTS.EVENT_LOBBY_READY, () => this.eventEmitter.emit(CONSTANTS.EVENT_LOBBY_READY, lobbyState));
        const players = await Lobby.getPlayers()(lobbyState);
        dotaBot.factionCache = players.reduce(Lobby.reducePlayerToFactionCache, {});
        await Lobby.mapPlayers(DotaBot.invitePlayer(dotaBot))(lobbyState);
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_PLAYERS;
        return lobbyState;
    },
    [CONSTANTS.STATE_BOT_FAILED]: async _lobbyState => ( { ..._lobbyState }),
    [CONSTANTS.STATE_WAITING_FOR_PLAYERS]: async function (_lobbyState) {
        const lobbyState = { ..._lobbyState };
        const dotaBot = this.bots[lobbyState.bot_id];
        if (dotaBot) {
            if (DotaBot.isDotaLobbyReady(dotaBot.factionCache, dotaBot.playerState)) {
                logger.debug('lobby run isDotaLobbyReady true');
                lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
                lobbyState.started_at = Date.now();
                lobbyState.match_id = await DotaBot.startDotaLobby(dotaBot);
                await DotaBot.disconnectDotaBot(dotaBot);
                delete this.bots[lobbyState.bot_id];
                lobbyState.bot_id = null;
                await Db.updateLobby(lobbyState);
                await Lobby.removeQueuers(lobbyState);
                this.matchTracker.addLobby(lobbyState);
                this.matchTracker.run();
                this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_STARTED, lobbyState);
            }
        }
        else {
            lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
        }
        return lobbyState;
    },
    [CONSTANTS.STATE_MATCH_IN_PROGRESS]: async _lobbyState => ( { ..._lobbyState }),
    [CONSTANTS.STATE_MATCH_ENDED]: async function (_lobbyState) {
        const lobbyState = { ..._lobbyState };
        await MatchTracker.updatePlayerRatings(lobbyState);
        lobbyState.state = CONSTANTS.STATE_COMPLETED;
        return lobbyState;
    },
    [CONSTANTS.STATE_PENDING_KILL]: async function (_lobbyState) {
        const lobbyState = { ..._lobbyState };
        if (lobbyState.bot_id != null) {
            const dotaBot = this.bots[lobbyState.bot_id];
            if (dotaBot) {
                await DotaBot.disconnectDotaBot(dotaBot);
            }
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
        lobbyState.bot_id = null;
        lobbyState.state = CONSTANTS.STATE_KILLED;
        return lobbyState;
    },
    [CONSTANTS.STATE_KILLED]: async _lobbyState => ( { ..._lobbyState }),
    [CONSTANTS.STATE_COMPLETED]: async _lobbyState => ( { ..._lobbyState }),
    [CONSTANTS.STATE_FAILED]: async _lobbyState => ( { ..._lobbyState }),
};

module.exports = {
    LobbyQueueHandlers,
    LobbyStateTransitions,
    LobbyStateHandlers,
}