const logger = require('./logger');
const CONSTANTS = require('./constants');

const EventListeners = ({
    Db, Guild, Lobby, MatchTracker, Ihl,
}) => ({
    async [CONSTANTS.EVENT_PLAYER_READY](lobbyState, user) {
        return this.queueEvent(this.onPlayerReady, [lobbyState, user]);
    },
    async [CONSTANTS.EVENT_BOT_SET_STATUS](steamid_64, status) {
        return this.queueEvent(this.onSetBotStatus, [steamid_64, status]);
    },
    async [CONSTANTS.EVENT_LEAGUE_TICKET_ADD](league, leagueid, name) {
        return this.queueEvent(this.onLeagueTicketAdd, [league, leagueid, name]);
    },
    async [CONSTANTS.EVENT_LEAGUE_TICKET_SET](league, leagueid) {
        return this.queueEvent(this.onLeagueTicketSet, [league, leagueid]);
    },
    async [CONSTANTS.EVENT_LEAGUE_TICKET_REMOVE](league, leagueid) {
        return this.queueEvent(this.onLeagueTicketRemove, [league, leagueid]);
    },
    async [CONSTANTS.EVENT_LOBBY_SET_STATE](lobbyState, state) {
        return this.queueEvent(this.onSetLobbyState, [lobbyState, state]);
    },
    async [CONSTANTS.EVENT_SELECTION_PICK](lobbyState, captain, pick) {
        return this.queueEvent(this.onSelectionPick, [lobbyState, captain, pick]);
    },
    async [CONSTANTS.EVENT_SELECTION_SIDE](lobbyState, captain, side) {
        return this.queueEvent(this.onSelectionSide, [lobbyState, captain, side]);
    },
    async [CONSTANTS.EVENT_PICK_PLAYER](lobbyState, captain, user) {
        return this.queueEvent(this.onDraftMember, [lobbyState, captain, user]);
    },
    async [CONSTANTS.EVENT_FORCE_LOBBY_DRAFT](lobbyState, captain_1, captain_2) {
        return this.queueEvent(this.onforceLobbyDraft, [lobbyState, captain_1, captain_2]);
    },
    async [CONSTANTS.EVENT_MATCH_STATS](lobby) {
        return this.queueEvent(this.onMatchStats, [lobby]);
    },
    async [CONSTANTS.EVENT_MATCH_NO_STATS](lobby) {
        return this.queueEvent(this.onMatchNoStats, [lobby]);
    },
    async [CONSTANTS.EVENT_MATCH_SIGNEDOUT](match_id) {
        return this.queueEvent(this.onMatchSignedOut, [match_id]);
    },
    async [CONSTANTS.EVENT_MATCH_OUTCOME](lobby_id, match_outcome) {
        return this.queueEvent(this.onMatchOutcome, [lobby_id, match_outcome]);
    },

    async [CONSTANTS.EVENT_LOBBY_START](lobbyState) {
        return this.queueEvent(this.onStartDotaLobby, [lobbyState]);
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
    async [CONSTANTS.EVENT_LOBBY_SWAP_TEAMS](lobbyState) {
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            await dotaBot.flipLobbyTeams();
        }
    },
    async [CONSTANTS.EVENT_LOBBY_INVITE](lobbyState, user) {
        return this.queueEvent(this.onLobbyInvite, [lobbyState, user]);
    },
    async [CONSTANTS.EVENT_LOBBY_READY](lobby_id) {
        return this.queueEvent(this.onLobbyReady, [lobby_id]);
    },
    async [CONSTANTS.EVENT_LOBBY_KILL](lobbyState, inhouseState) {
        return this.queueEvent(this.onLobbyKill, [lobbyState, inhouseState]);
    },
    async [CONSTANTS.EVENT_RUN_LOBBY](lobbyState, states) {
        return this.queueEvent(this.runLobby, [lobbyState, states]);
    },

    async [CONSTANTS.EVENT_USER_LEFT_GUILD](user) {
        return this.queueEvent(Db.unvouchUser, [user]);
    },
    async [CONSTANTS.EVENT_DISCORD_MESSAGE](msg) {
        const lobby = await Db.findLobbyByDiscordChannel(msg.guild.id)(msg.channel.id);
        if (lobby && lobby.bot_id != null && (lobby.state === CONSTANTS.STATE_BOT_STARTED || lobby.state === CONSTANTS.STATE_WAITING_FOR_PLAYERS)) {
            logger.debug(`EVENT_DISCORD_MESSAGE {msg.member.displayName}: ${msg.content}`);
            const dotaBot = this.getBot(lobby.bot_id);
            if (dotaBot) {
                await dotaBot.sendMessage(`${msg.member.displayName}: ${msg.content}`);
            }
        }
    },

    async [CONSTANTS.MSG_READY_CHECK_START](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)(`Queue popped. ${lobbyState.role} reply with \`!ready\``);
    },
    async [CONSTANTS.MSG_READY_CHECK_FAILED](lobbyState, notReadyPlayers) {
        logger.debug('MSG_READY_CHECK_FAILED');
        logger.debug(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${notReadyPlayers.length}`);
        const users = notReadyPlayers.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ');
        logger.debug(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${users}`);
        return Guild.sendChannelMessage(lobbyState)(`${users} failed to ready up. Reopening queue.`);
    },
    async [CONSTANTS.MSG_PLAYERS_READY](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)('All players ready.');
    },
    async [CONSTANTS.MSG_AUTOBALANCING](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)('No captain match found. Autobalancing teams instead.');
    },
    async [CONSTANTS.MSG_WAITING_FOR_CAPTAINS](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)('No captain match found. Waiting for captains.');
    },
    async [CONSTANTS.MSG_ASSIGNED_CAPTAINS](lobbyState) {
        const captain_1 = Lobby.getPlayerByUserId(lobbyState)(lobbyState.captain_1_user_id);
        const captain_2 = Lobby.getPlayerByUserId(lobbyState)(lobbyState.captain_2_user_id);
        const captain_member_1 = await Guild.resolveUser(lobbyState.inhouseState.guild)(captain_1.discord_id);
        const captain_member_2 = await Guild.resolveUser(lobbyState.inhouseState.guild)(captain_2.discord_id);
        return Guild.sendChannelMessage(lobbyState)(`Assigned ${captain_member_1} and ${captain_member_2} as captains`);
    },
    async [CONSTANTS.MSG_PLAYER_DRAFT_PRIORITY](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`Draft order is ${lobbyState.inhouseState.draft_order}. ${user} draft a player \`!first\` or \`!second\`?`);
    },
    async [CONSTANTS.MSG_SELECTION_PRIORITY](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`${user} has selection priority. Choose one: \`!first\`, \`!second\`, \`!radiant\`, or \`!dire\`.`);
    },
    async [CONSTANTS.MSG_SELECTION_PICK](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`${user} \`!first\` pick or \`!second\` pick?`);
    },
    async [CONSTANTS.MSG_SELECTION_SIDE](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`${user} \`!radiant\` side or \`!dire\` side?`);
    },
    async [CONSTANTS.MSG_DRAFT_TURN](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`${user}'s turn to draft a player. Use \`!pick @mention\`.`);
    },
    async [CONSTANTS.MSG_TEAMS_SELECTED](lobbyState) {
        let players;
        let names;
        players = await Lobby.getRadiantPlayers()(lobbyState);
        names = players.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user));
        await Guild.sendChannelMessage(lobbyState)(`Radiant: ${names.join(',')}`);
        players = await Lobby.getDirePlayers()(lobbyState);
        names = players.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user));
        return Guild.sendChannelMessage(lobbyState)(`Dire: ${names.join(',')}`);
    },

    async [CONSTANTS.MSG_LOBBY_INVITES_SENT](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)(`Lobby invites sent. Lobby name: ${lobbyState.lobby_name} password: ${lobbyState.password}. Use \`!invite\` to send another invite.`);
    },
    async [CONSTANTS.MSG_LOBBY_STARTED](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)(`Lobby started. Match id: ${lobbyState.match_id}.`);
    },
    async [CONSTANTS.MSG_LOBBY_KILLED](inhouseState) {
        return Guild.sendChannelMessage(inhouseState)('Lobby killed.');
    },

    async [CONSTANTS.MSG_CHAT_MESSAGE](lobby_id, channel, sender_name, message) {
        const lobbyState = await Ihl.loadLobbyStateFromLobbyId(this.client.guilds)(lobby_id);
        return Guild.sendChannelMessage(lobbyState)(`**${sender_name}:** ${message}`);
    },
    async [CONSTANTS.MSG_LOBBY_PLAYER_JOINED](lobby_id, member) {
        const lobbyState = await Ihl.loadLobbyStateFromLobbyId(this.client.guilds)(lobby_id);
        return Guild.sendChannelMessage(lobbyState)(`${member.name} joined lobby`);
    },
    async [CONSTANTS.MSG_LOBBY_PLAYER_LEFT](lobby_id, member) {
        const lobbyState = await Ihl.loadLobbyStateFromLobbyId(this.client.guilds)(lobby_id);
        return Guild.sendChannelMessage(lobbyState)(`${member.name} left lobby`);
    },
    async [CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT](lobby_id, state) {
        //const lobbyState = await Ihl.loadLobbyStateFromLobbyId(this.client.guilds)(lobby_id);
        //return Guild.sendChannelMessage(lobbyState)(`${state.current.name} ${state.current.id} changed slot`);
    },

    async [CONSTANTS.MSG_MATCH_ENDED](lobbyState, inhouseState) {
        await Guild.sendChannelMessage(lobbyState)(`Lobby ${lobbyState.lobby_name} ended. Match ID: ${lobbyState.match_id}.`);
        return Guild.sendChannelMessage(inhouseState)(`Lobby ${lobbyState.lobby_name} ended. Match ID: ${lobbyState.match_id}.`);
    },
    async [CONSTANTS.MSG_MATCH_STATS](lobbyState, inhouseState) {
        const embed = await MatchTracker.createMatchEndMessageEmbed(lobbyState.match_id);
        await Guild.sendChannelMessage(lobbyState)(embed);
        return Guild.sendChannelMessage(inhouseState)(embed);
    },
    async [CONSTANTS.MSG_MATCH_NO_STATS](lobbyState, inhouseState) {
        await Guild.sendChannelMessage(lobbyState)(`Stats not recorded for lobby ${lobbyState.lobby_name}.`);
        return Guild.sendChannelMessage(inhouseState)(`Stats not recorded for lobby ${lobbyState.lobby_name}.`);
    },
    
    [CONSTANTS.EVENT_BOT_AVAILABLE]: function () {},
});

module.exports = EventListeners;