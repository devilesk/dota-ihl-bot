const logger = require('./logger');
const CONSTANTS = require('./constants');

const EventListeners = ({
    Db, Guild, Lobby, MatchTracker, Ihl,
}) => ({
    async [CONSTANTS.EVENT_BOT_AVAILABLE]() {
        return this.queueEvent(this.onBotAvailable);
    },
    async [CONSTANTS.EVENT_BOT_SET_STATUS](steamid_64, status) {
        return this.queueEvent(this.onSetBotStatus, [steamid_64, status]);
    },
    async [CONSTANTS.EVENT_GUILD_MESSAGE](msg) {
        const lobby = await Db.findLobbyByDiscordChannel(msg.guild.id)(msg.channel.id);
        if (lobby && lobby.bot_id != null && (lobby.state === CONSTANTS.STATE_BOT_STARTED || lobby.state === CONSTANTS.STATE_WAITING_FOR_PLAYERS)) {
            logger.silly(`EVENT_GUILD_MESSAGE {msg.member.displayName}: ${msg.content}`);
            const dotaBot = this.getBot(lobby.bot_id);
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
    async [CONSTANTS.EVENT_LOBBY_FORCE_DRAFT](lobbyState, captain_1, captain_2) {
        return this.queueEvent(this.onforceLobbyDraft, [lobbyState, captain_1, captain_2]);
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
    async [CONSTANTS.EVENT_LOBBY_READY](lobby_id) {
        return this.queueEvent(this.onLobbyReady, [lobby_id]);
    },
    async [CONSTANTS.EVENT_LOBBY_SET_FP](lobbyState, cm_pick) {
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            await dotaBot.configPracticeLobby({ cm_pick });
        }
    },
    async [CONSTANTS.EVENT_LOBBY_SET_GAMEMODE](lobbyState, game_mode) {
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            await dotaBot.configPracticeLobby({ game_mode });
        }
    },
    async [CONSTANTS.EVENT_LOBBY_SET_STATE](lobbyState, state) {
        return this.queueEvent(this.onSetLobbyState, [lobbyState, state]);
    },
    async [CONSTANTS.EVENT_LOBBY_START](lobbyState) {
        return this.queueEvent(this.onStartDotaLobby, [lobbyState]);
    },
    async [CONSTANTS.EVENT_LOBBY_SWAP_TEAMS](lobbyState) {
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            await dotaBot.flipLobbyTeams();
        }
    },
    async [CONSTANTS.EVENT_MATCH_OUTCOME](lobby_id, match_outcome, members) {
        return this.queueEvent(this.onMatchOutcome, [lobby_id, match_outcome, members]);
    },
    async [CONSTANTS.EVENT_MATCH_NO_STATS](lobby) {
        return this.queueEvent(this.onMatchNoStats, [lobby]);
    },
    async [CONSTANTS.EVENT_MATCH_SIGNEDOUT](match_id) {
        return this.queueEvent(this.onMatchSignedOut, [match_id]);
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