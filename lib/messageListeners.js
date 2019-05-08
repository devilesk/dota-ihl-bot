const logger = require('./logger');
const Db = require('./db');
const CONSTANTS = require('./constants');
const convertor = require('steam-id-convertor');

const MessageListeners = ({ Guild, Lobby, MatchTracker, Ihl }) => ({
    async [CONSTANTS.MSG_ASSIGNED_CAPTAINS](lobbyState) {
        const captain1 = Lobby.getPlayerByUserId(lobbyState)(lobbyState.captain1UserId);
        const captain2 = Lobby.getPlayerByUserId(lobbyState)(lobbyState.captain2UserId);
        const captainMember1 = await Guild.resolveUser(lobbyState.inhouseState.guild)(captain1.discordId);
        const captainMember2 = await Guild.resolveUser(lobbyState.inhouseState.guild)(captain2.discordId);
        return Guild.sendChannelMessage(lobbyState)(`Assigned ${captainMember1} and ${captainMember2} as captains`);
    },
    async [CONSTANTS.MSG_AUTOBALANCING](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)('No captain match found. Autobalancing teams instead.');
    },
    async [CONSTANTS.MSG_BOT_ASSIGNED](lobbyState, bot) {
        return Guild.sendChannelMessage(lobbyState)(`Bot ${bot.personaName} assigned to host lobby.`);
    },
    async [CONSTANTS.MSG_BOT_FAILED](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)('Bot failed.');
    },
    async [CONSTANTS.MSG_BOT_UNASSIGNED](lobbyState, reason) {
        return Guild.sendChannelMessage(lobbyState)(`Bot unassigned. Reason: ${reason}\nWaiting for bot...`);
    },
    async [CONSTANTS.MSG_CHAT_MESSAGE](dotaLobbyId, channel, senderName, message, chatData) {
        const lobbyState = await Ihl.loadLobbyStateFromDotaLobbyId(this.client.guilds)(dotaLobbyId);
        const steamId64 = convertor.to64(chatData.account_id);
        let user = await Db.findUserBySteamId64(lobbyState.inhouseState.guild.id)(steamId64);
        if (user) {
            user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(user);
        }
        else {
            user = senderName;
        }
        return Guild.sendChannelMessage(lobbyState)(`**${user}:** ${message}`);
    },
    async [CONSTANTS.MSG_DRAFT_TURN](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        const playersNoTeam = await Lobby.getNoFactionPlayers()(lobbyState);
        let msg = `${user}'s turn to draft a player.`;
        msg += `\nPlayer pool: ${playersNoTeam.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
        msg += '\nUse \`!pick @mention\`.';
        return Guild.sendChannelMessage(lobbyState)(msg);
    },
    async [CONSTANTS.MSG_LOBBY_INVITES_SENT](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)(`Lobby invites sent. Lobby name: ${lobbyState.lobbyName} password: ${lobbyState.password}. Use \`!invite\` to send another invite.`);
    },
    async [CONSTANTS.MSG_LOBBY_KILLED](inhouseState) {
        return Guild.sendChannelMessage(inhouseState)('Lobby killed.');
    },
    // eslint-disable-next-line no-unused-vars
    async [CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT](dotaLobbyId, state) {
        // const lobbyState = await Ihl.loadLobbyStateFromDotaLobbyId(this.client.guilds)(dotaLobbyId);
        // return Guild.sendChannelMessage(lobbyState)(`${state.current.name} ${state.current.id} changed slot`);
    },
    async [CONSTANTS.MSG_LOBBY_PLAYER_JOINED](dotaLobbyId, member) {
        const lobbyState = await Ihl.loadLobbyStateFromDotaLobbyId(this.client.guilds)(dotaLobbyId);
        return Guild.sendChannelMessage(lobbyState)(`${member.name} joined lobby`);
    },
    async [CONSTANTS.MSG_LOBBY_PLAYER_LEFT](dotaLobbyId, member) {
        const lobbyState = await Ihl.loadLobbyStateFromDotaLobbyId(this.client.guilds)(dotaLobbyId);
        return Guild.sendChannelMessage(lobbyState)(`${member.name} left lobby`);
    },
    async [CONSTANTS.MSG_LOBBY_STARTED](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)(`Lobby started. Match id: ${lobbyState.matchId}.`);
    },
    async [CONSTANTS.MSG_LOBBY_STATE](lobbyState) {
        const msg = await Lobby.createLobbyStateMessage(lobbyState);
        return Guild.sendChannelMessage(lobbyState)(msg);
    },
    async [CONSTANTS.MSG_MATCH_ENDED](lobbyState, inhouseState) {
        await Guild.sendChannelMessage(lobbyState)(`Lobby ${lobbyState.lobbyName} ended. Match ID: ${lobbyState.matchId}.`);
        return Guild.sendChannelMessage(inhouseState)(`Lobby ${lobbyState.lobbyName} ended. Match ID: ${lobbyState.matchId}.`);
    },
    async [CONSTANTS.MSG_MATCH_NO_STATS](lobbyState, inhouseState) {
        await Guild.sendChannelMessage(lobbyState)(`Stats not recorded for lobby ${lobbyState.lobbyName}.`);
        return Guild.sendChannelMessage(inhouseState)(`Stats not recorded for lobby ${lobbyState.lobbyName}.`);
    },
    async [CONSTANTS.MSG_MATCH_STATS](lobbyState, inhouseState) {
        const embed = await MatchTracker.createMatchEndMessageEmbed(lobbyState.matchId);
        await Guild.sendChannelMessage(lobbyState)(embed);
        return Guild.sendChannelMessage(inhouseState)(embed);
    },
    async [CONSTANTS.MSG_PLAYER_DRAFT_PRIORITY](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`Draft order is ${lobbyState.inhouseState.draftOrder}. ${user} draft a player \`!first\` or \`!second\`?`);
    },
    async [CONSTANTS.MSG_PLAYERS_READY](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)('All players ready.');
    },
    async [CONSTANTS.MSG_READY_CHECK_FAILED](lobbyState, notReadyPlayers) {
        logger.silly(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${notReadyPlayers.length}`);
        const users = notReadyPlayers.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ');
        logger.silly(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${users}`);
        return Guild.sendChannelMessage(lobbyState)(`${users} failed to ready up. Reopening queue.`);
    },
    async [CONSTANTS.MSG_READY_CHECK_START](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)(`Queue popped. ${lobbyState.role} reply with \`!ready\``);
    },
    async [CONSTANTS.MSG_SELECTION_PICK](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`${user} \`!first\` pick or \`!second\` pick?`);
    },
    async [CONSTANTS.MSG_SELECTION_PRIORITY](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`${user} has selection priority. Choose one: \`!first\`, \`!second\`, \`!radiant\`, or \`!dire\`.`);
    },
    async [CONSTANTS.MSG_SELECTION_SIDE](lobbyState, captain) {
        const user = Guild.userToDisplayName(lobbyState.inhouseState.guild)(captain);
        return Guild.sendChannelMessage(lobbyState)(`${user} \`!radiant\` side or \`!dire\` side?`);
    },
    async [CONSTANTS.MSG_TEAMS_SELECTED](lobbyState) {
        let msg = 'Teams selected.';
        const radiant = await Lobby.getRadiantPlayers()(lobbyState);
        msg += `\nRadiant: ${radiant.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
        const dire = await Lobby.getDirePlayers()(lobbyState);
        msg += `\nDire: ${dire.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
        msg += '\nWaiting for bot...';
        return Guild.sendChannelMessage(lobbyState)(msg);
    },
    async [CONSTANTS.MSG_WAITING_FOR_CAPTAINS](lobbyState) {
        return Guild.sendChannelMessage(lobbyState)('No captain match found. Waiting for captains.');
    },
});

module.exports = MessageListeners;
