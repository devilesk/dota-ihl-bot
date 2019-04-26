const logger = require('./logger');
const CONSTANTS = require('./constants');

/**
 * This provides methods used for ihlManager event handling.
 * @mixin
 * @memberof module:ihlManager
 */
const EventListeners = ({ Db }) => ({
    async [CONSTANTS.EVENT_BOT_AVAILABLE]() {
        return this.queueEvent(this.onBotAvailable);
    },
    async [CONSTANTS.EVENT_BOT_LOBBY_LEFT](botId) {
        return this.queueEvent(this.onBotLobbyLeft, [botId]);
    },
    async [CONSTANTS.EVENT_BOT_SET_STATUS](steamId64, status) {
        return this.queueEvent(this.onSetBotStatus, [steamId64, status]);
    },
    async [CONSTANTS.EVENT_GUILD_MESSAGE](msg) {
        const lobby = await Db.findLobbyByDiscordChannel(msg.guild.id)(msg.channel.id);
        if (lobby && lobby.botId != null && (lobby.state === CONSTANTS.STATE_BOT_STARTED || lobby.state === CONSTANTS.STATE_WAITING_FOR_PLAYERS)) {
            logger.silly(`EVENT_GUILD_MESSAGE {msg.member.displayName}: ${msg.content}`);
            const dotaBot = this.getBot(lobby.botId);
            if (dotaBot) {
                await dotaBot.sendMessage(`${msg.member.displayName}: ${msg.content}`);
            }
        }
    },
    async [CONSTANTS.EVENT_GUILD_USER_LEFT](user) {
        return this.queueEvent(Db.unvouchUser, [user]);
    },
    async [CONSTANTS.EVENT_LEAGUE_TICKET_ADD](league, leagueid, name) {
        return this.queueEvent(this.onLeagueTicketAdd, [league, leagueid, name]);
    },
    async [CONSTANTS.EVENT_LEAGUE_TICKET_REMOVE](league, leagueid) {
        return this.queueEvent(this.onLeagueTicketRemove, [league, leagueid]);
    },
    async [CONSTANTS.EVENT_LEAGUE_TICKET_SET](league, leagueid) {
        return this.queueEvent(this.onLeagueTicketSet, [league, leagueid]);
    },
    async [CONSTANTS.EVENT_LOBBY_FORCE_DRAFT](lobbyState, captain1, captain2) {
        return this.queueEvent(this.onForceLobbyDraft, [lobbyState, captain1, captain2]);
    },
    async [CONSTANTS.EVENT_LOBBY_INVITE](lobbyState, user) {
        return this.queueEvent(this.onLobbyInvite, [lobbyState, user]);
    },
    async [CONSTANTS.EVENT_LOBBY_KICK](lobbyState, user) {
        return this.queueEvent(this.onLobbyKick, [lobbyState, user]);
    },
    async [CONSTANTS.EVENT_LOBBY_KILL](lobbyState, inhouseState) {
        return this.queueEvent(this.onLobbyKill, [lobbyState, inhouseState]);
    },
    async [CONSTANTS.EVENT_LOBBY_LEAVE](lobbyState) {
        return this.queueEvent(this.botLeaveLobby, [lobbyState]);
    },
    async [CONSTANTS.EVENT_LOBBY_READY](dotaLobbyId) {
        return this.queueEvent(this.onLobbyReady, [dotaLobbyId]);
    },
    async [CONSTANTS.EVENT_LOBBY_SET_FP](lobbyState, cmPick) {
        const dotaBot = this.getBot(lobbyState.botId);
        if (dotaBot) {
            await dotaBot.configPracticeLobby({ cm_pick: cmPick });
        }
    },
    async [CONSTANTS.EVENT_LOBBY_SET_GAMEMODE](lobbyState, gameMode) {
        const dotaBot = this.getBot(lobbyState.botId);
        if (dotaBot) {
            await dotaBot.configPracticeLobby({ game_mode: gameMode });
        }
    },
    async [CONSTANTS.EVENT_LOBBY_SET_STATE](lobbyState, state) {
        return this.queueEvent(this.onSetLobbyState, [lobbyState, state]);
    },
    async [CONSTANTS.EVENT_LOBBY_START](lobbyState) {
        return this.queueEvent(this.onStartDotaLobby, [lobbyState]);
    },
    async [CONSTANTS.EVENT_LOBBY_SWAP_TEAMS](lobbyState) {
        const dotaBot = this.getBot(lobbyState.botId);
        if (dotaBot) {
            await dotaBot.flipLobbyTeams();
        }
    },
    async [CONSTANTS.EVENT_MATCH_OUTCOME](dotaLobbyId, matchOutcome, members) {
        return this.queueEvent(this.onMatchOutcome, [dotaLobbyId, matchOutcome, members]);
    },
    async [CONSTANTS.EVENT_MATCH_NO_STATS](lobby) {
        return this.queueEvent(this.onMatchNoStats, [lobby]);
    },
    async [CONSTANTS.EVENT_MATCH_SIGNEDOUT](matchId) {
        return this.queueEvent(this.onMatchSignedOut, [matchId]);
    },
    async [CONSTANTS.EVENT_MATCH_STATS](lobby) {
        return this.queueEvent(this.onMatchStats, [lobby]);
    },
    async [CONSTANTS.EVENT_PICK_PLAYER](lobbyState, captain, user) {
        return this.queueEvent(this.onDraftMember, [lobbyState, captain, user]);
    },
    async [CONSTANTS.EVENT_PLAYER_READY](lobbyState, user) {
        return this.queueEvent(this.onPlayerReady, [lobbyState, user]);
    },
    async [CONSTANTS.EVENT_RUN_LOBBY](lobbyState, states) {
        return this.queueEvent(this.runLobby, [lobbyState, states]);
    },
    async [CONSTANTS.EVENT_SELECTION_PICK](lobbyState, captain, pick) {
        return this.queueEvent(this.onSelectionPick, [lobbyState, captain, pick]);
    },
    async [CONSTANTS.EVENT_SELECTION_SIDE](lobbyState, captain, side) {
        return this.queueEvent(this.onSelectionSide, [lobbyState, captain, side]);
    },
});

module.exports = EventListeners;
