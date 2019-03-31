/**
 * @module ihlManager
 */
 
 /**
 * Node.js EventEmitter object
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter}
 */

const Commando = require('discord.js-commando');
const events = require('events');
const path = require('path');
const util = require('util');
const logger = require('./logger');
const {
    updatePlayerRatings,
    MatchTracker,
    createMatchEndMessageEmbed,
} = require('./matchTracker');
const CONSTANTS = require('./constants');
const {
    findAllLeagues,
    findAllActiveLobbiesForInhouse,
    findUserByDiscordId,
    findUserBySteamId64,
    findUserByNickname,
    findUserByNicknameLevenshtein,
    unvouchUser,
    updateLobbyState,
    updateLobby,
    findQueue,
} = require('./db');
const {
    getLobby,
    getQueuers,
    removeQueuers,
    removePlayers,
    getPlayers,
    mapPlayers,
    runLobby,
    isPlayerDraftable,
    isCaptain,
    setPlayerReady,
    getPlayerByUserId,
    getPlayerByDiscordId,
    getFactionCaptain,
    setPlayerTeam,
    returnPlayersToQueue,
    forceLobbyDraft,
    getActiveQueuers,
    addRoleToPlayers,
    resetLobbyState,
    lobbyToLobbyState,
    setLobbyStateKilled,
    setLobbyTopic,
} = require('./lobby');
const {
    parseSteamID64,
    createNewLeague,
    createLobbiesFromQueues,
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
    createInhouseState,
    createLobby,
} = require('./ihl');
const {
    pipeP,
    mapPromise,
} = require('./util/fp');
const {
    makeRole,
    resolveUser,
    findOrCreateChannelInCategory,
    setChannelPosition,
    setChannelTopic,
} = require('./guild');
const {
    findLeagueById,
    findBot,
    findAllEnabledQueues,
    findLobbyByDiscordChannel,
    updateBotStatus,
} = require('./db');
const {
    isDotaLobbyReady,
    createDotaBot,
    invitePlayer,
    disconnectDotaBot,
    connectDotaBot,
    createDotaBotLobby,
    joinDotaBotLobby,
    startDotaLobby,
} = require('./dotaBot');
const toHHMMSS = require('./util/toHHMMSS');

/**
* Searches the discord guild for a member.
* @function 
* @param {external:Guild} guild - A list of guilds to initialize leagues with.
* @param {string|external:GuildMember} member - A name or search string for an inhouse player or their guild member instance.
* @returns {Array} The search result in an array containing the user record, discord guild member, and type of match.
*/
const findUser = guild => async (member) => {
    let discord_id;
    let discord_user;
    let user;
    let result_type;
    logger.debug(`Member ${util.inspect(member)}`);
    const discord_id_matches = member.match(/<@(\d+)>/);
    logger.debug(discord_id_matches);
    if (discord_id_matches) {
        discord_id = discord_id_matches[1];
        discord_user = guild.members.get(discord_id);
        user = await findUserByDiscordId(guild.id)(discord_id);
        result_type = CONSTANTS.MATCH_EXACT_DISCORD_MENTION;
    }
    else {
        // check exact discord name match
        discord_user = guild.members.find(guildMember => guildMember.displayName.toLowerCase() === member.toLowerCase());
        if (discord_user) {
            logger.debug('Matched on displayName exact.');
            discord_id = discord_user.id;
            user = await findUserByDiscordId(guild.id)(discord_id);
            result_type = CONSTANTS.MATCH_EXACT_DISCORD_NAME;
        }
        else {
            // try to parse a steamid_64 from text
            const steamid_64 = await parseSteamID64(member);
            if (steamid_64 != null) {
                logger.debug('Matched on steamid_64.');
                user = await findUserBySteamId64(guild.id)(steamid_64);
                discord_user = guild.members.get(user.discord_id);
                result_type = CONSTANTS.MATCH_STEAMID_64;
            }
            else {
                // check exact nickname match
                user = await findUserByNickname(guild.id)(member);
                if (user) {
                    discord_id = user.discord_id;
                    discord_user = guild.members.get(discord_id);
                    result_type = CONSTANTS.MATCH_EXACT_NICKNAME;
                }
                else {
                    // check close nickname match
                    try {
                        [user] = await findUserByNicknameLevenshtein(guild.id)(member);
                        if (user) {
                            discord_id = user.discord_id;
                            discord_user = guild.members.get(discord_id);
                            result_type = CONSTANTS.MATCH_CLOSEST_NICKNAME;
                        }
                    }
                    catch (e) {
                        logger.error('', e);
                    }
                }
            }
        }
    }

    return [user, discord_user, result_type];
};

/**
* Maps league records to inhouse states.
* @function 
* @async
* @param {external:EventEmitter} eventEmitter - The event listener object.
* @param {external:Guild[]} guilds - A list of guilds to initialize leagues with.
* @param {module:db.League[]} leagues - A list of database league records.
* @returns {module:ihl.InhouseState[]} The inhouse states loaded from league records.
*/
const loadInhouseStates = guilds => async leagues => mapPromise(createInhouseState)(leagues.map(league => ({ league, guild: guilds.get(league.guild_id) })));

/**
* Gets all league records from the database turns them into inhouse states.
* @function
* @async
* @param {external:EventEmitter} eventEmitter - The event listener object.
* @param {external:Guild[]} guilds - A list of guilds to initialize leagues with.
* @returns {module:ihl.InhouseState[]} The inhouse states loaded from all league records.
*/
const loadInhouseStatesFromLeagues = async guilds => pipeP(
    findAllLeagues,
    loadInhouseStates(guilds),
)();

const sendMatchEndMessage = inhouseState => async lobbyState => {
    const embed = await createMatchEndMessageEmbed(lobbyState.match_id);
    await lobbyState.channel.send(embed).catch(console.error);
    return inhouseState.channel.send(embed).catch(console.error);
}

const createClient = options => new Commando.CommandoClient({
    commandPrefix: options.COMMAND_PREFIX,
    owner: options.OWNER_DISCORD_ID,
    disableEveryone: true,
    commandEditableDuration: 0,
    unknownCommandResponse: false,
});

const reducePlayerToFactionCache = (_factionCache, player) => {
    logger.debug('reducePlayerToFactionCache');
    const factionCache = { ..._factionCache };
    factionCache[player.steamid_64] = player.LobbyPlayer.faction;
    return factionCache;
};

const setupLobbyBot = async (lobbyState) => {
    logger.debug(`setupLobbyBot ${lobbyState.lobby_name} ${lobbyState.bot_id} ${lobbyState.password}`);
    let dotaBot;
    try {
        await updateBotStatus(CONSTANTS.BOT_LOADING)(lobbyState.bot_id);
        dotaBot = await pipeP(
            findBot,
            createDotaBot,
            connectDotaBot,
        )(lobbyState.bot_id);
        logger.debug(`setupLobbyBot bot connected lobby_id:${lobbyState.lobby_id}`);
        if (lobbyState.lobby_id) {
            await joinDotaBotLobby(lobbyState)(dotaBot);
        }
        else {
            await createDotaBotLobby(lobbyState)(dotaBot);
        }
        logger.debug('setupLobbyBot lobby created');
        const players = await getPlayers()(lobbyState);
        logger.debug(`setupLobbyBot getPlayers ${players.length}`);
        dotaBot.factionCache = players.reduce(reducePlayerToFactionCache, {});
        logger.debug('setupLobbyBot factionCache updated');
        return dotaBot;
    }
    catch (e) {
        logger.log({level: 'error', message: e});
        if (dotaBot) {
            await disconnectDotaBot(dotaBot);
        }
        return null;
    }
};

class IHLManager {
    /**
     * Creates an inhouse league manager.
     * @classdesc Class representing the inhouse league manager.
     */
    constructor(options) {
        this.options = options;
        this.eventEmitter = new events.EventEmitter();
        this.client = null;
        this.lobbyTimeoutTimers = {};
        this.bots = {};
        this.matchTracker = null;
        this.attachStateHandlers();
        this.attachEventHandlers();
        this.attachMessageHandlers();
        this.eventQueue = [];
        this.blocking = false;
    }

    /**
     * Initializes the inhouse league manager with a discord client and loads inhouse states for each league.
     * @async
     * @param {external:Client} client - A discord.js client.
     */
    async init(client) {
        console.log('ihlManager', this.options.COMMAND_PREFIX);
        logger.debug('ihlManager init');
        this.matchTracker = new MatchTracker(parseInt(this.options.MATCH_POLL_INTERVAL));
        this.matchTracker.on(CONSTANTS.EVENT_MATCH_ENDED, lobby => this.eventEmitter.emit(CONSTANTS.EVENT_MATCH_ENDED, lobby));
        this.client = client;
        this.client.ihlManager = this;
        this.client.registry
            .registerDefaultTypes()
            .registerGroups([
                ['ihl', 'Inhouse League General Commands'],
                ['queue', 'Inhouse League Queue Commands'],
                ['challenge', 'Inhouse League Challenge Commands'],
                ['admin', 'Inhouse League Admin Commands'],
            ])
            .registerDefaultGroups()
            .registerDefaultCommands()
            .registerCommandsIn(path.join(__dirname, '../commands'));
        this.attachClientHandlers();
        this.client.login(this.options.TOKEN);
    }
    
    async attachClientHandlers() {
        this.client.on('ready', this.onClientReady.bind(this));
        this.client.on('message', this.onDiscordMessage.bind(this));
        this.client.on('guildMemberRemove', this.onDiscordMemberLeave.bind(this));
    }
    
    async onClientReady() {
        logger.debug(`Logged in as ${this.client.user.tag}`);
        const inhouseStates = await loadInhouseStatesFromLeagues(this.client.guilds);
        await mapPromise(createLobbiesFromQueues({ findOrCreateChannelInCategory, makeRole }))(inhouseStates);
        for (const inhouseState of inhouseStates) {
            await this.runLobbiesForInhouse(inhouseState);
        }
        await this.matchTracker.loadInProgressLobbies();
        this.matchTracker.run();
        logger.debug(`Inhouse lobbies loaded and run.`);
        this.eventEmitter.emit('ready');
    }
    
    async onDiscordMessage(msg) {
        if (msg.author.id !== this.client.user.id) {
            this.eventEmitter.emit(CONSTANTS.EVENT_DISCORD_MESSAGE, msg);
        }
    }
    
    async onDiscordMemberLeave(member) {
        logger.debug(`onDiscordMemberLeave ${member}`);
        const user = await findUserByDiscordId(member.guild.id)(member.id);
        if (user) {
            this.eventEmitter.emit(CONSTANTS.EVENT_USER_LEFT_GUILD, user);
        }
    }
    
    async createNewLeague(guild) {
        logger.debug(`ihlManager createNewLeague ${guild.id}`);
        const inhouseState = await createNewLeague(guild);
        logger.debug(`ihlManager createNewLeague inhouseState created`);
        await createLobbiesFromQueues({ findOrCreateChannelInCategory, makeRole })(inhouseState);
        logger.debug(`ihlManager createNewLeague queue lobbies created`);
        await this.runLobbiesForInhouse(inhouseState);
        logger.debug(`ihlManager createNewLeague lobbies run`);
    }
    
    /**
    * Runs all lobbies.
    * @async 
    */
    async runLobbiesForInhouse(inhouseState) {
        const lobbies = await findAllActiveLobbiesForInhouse(inhouseState.guild.id);
        for (const lobby of lobbies) {
            const lobbyState = await pipeP(
                lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState),
                resetLobbyState,
            )(lobby);
            await this.runLobby(lobbyState);
        }
    }

    /**
     * Adds a user to a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to queue.
     */
    async joinLobbyQueue(lobbyState, user, discordUser) {
        logger.debug('ihlManager joinLobbyQueue');
        const result = await joinLobbyQueue(user)(lobbyState);
        logger.debug(`ihlManager joinLobbyQueue result ${result}`);
        if (result) {
            this.eventEmitter.emit(result, lobbyState, discordUser, user);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_WAITING_FOR_QUEUE]);
        }
    }

    /**
     * Adds a user to all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to queue.
     * @param {module:db.User} user - The user to queue.
     */
    async joinAllQueues(inhouseState, user, discordUser) {
        const lobbyStates = await getAllLobbyQueues(inhouseState);
        for (const lobbyState of lobbyStates) {
            await this.joinLobbyQueue(lobbyState, user, discordUser);
        }
    }

    /**
     * Removes a user from a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to dequeue.
     */    
    async leaveLobbyQueue(lobbyState, user, discordUser) {
        const inQueue = await leaveLobbyQueue(user)(lobbyState);
        if (inQueue) {
            const queuers = await getQueuers(lobbyState);
            this.eventEmitter.emit(CONSTANTS.MSG_QUEUE_LEFT, lobbyState, discordUser);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
        }
        else {
            this.eventEmitter.emit(CONSTANTS.EVENT_QUEUE_NOT_JOINED, lobbyState);
        }
    }

    /**
     * Removes a user from all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {module:db.User} user - The user to dequeue.
     */
    async leaveAllLobbyQueues(inhouseState, user, discordUser) {
        const lobbyStates = await getAllLobbyQueuesForUser(inhouseState, user);
        for (const lobbyState of lobbyStates) {
            await this.leaveLobbyQueue(lobbyState, user, discordUser);
        }
    }

    /**
     * Bans a user from the inhouse queue.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {external:User} user - A discord.js user.
     * @param {number} timeout - Duration of ban in minutes.
     */
    async banInhouseQueue(inhouseState, user, timeout, discordUser) {
        await banInhouseQueue(user, timeout);
        await this.leaveAllLobbyQueues(inhouseState, user, discordUser);
    }

    /**
     * Processes and executes a lobby state if it matches any of the given states.
     * If no states to match against are given, the lobby state is run by default.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {string[]} states - A list of valid lobby states.
     */
    async runLobby(_lobbyState, states = []) {
        const lobby = await getLobby(_lobbyState);
        logger.debug(`ihlManager runLobby ${_lobbyState.id} ${states} ${!states.length || states.indexOf(lobby.state) !== -1}`);
        if (!states.length || states.indexOf(lobby.state) !== -1) {
            let lobbyState = _lobbyState;
            let events = [];
            ({ lobbyState, events } = await runLobby(_lobbyState));
            events.forEach(evt => Array.isArray(evt) ? this.eventEmitter.emit.apply(this.eventEmitter, [evt[0], lobbyState].concat(evt.slice(1))) : this.eventEmitter.emit(evt, lobbyState));
            this.eventEmitter.emit(lobbyState.state, lobbyState);
            while (lobbyState.state !== _lobbyState.state) {
                _lobbyState = lobbyState;
                ({ lobbyState, events } = await runLobby(_lobbyState));
                if (lobbyState.state !== _lobbyState.state) {
                    events.forEach(evt => Array.isArray(evt) ? this.eventEmitter.emit.apply(this.eventEmitter, [evt[0], lobbyState].concat(evt.slice(1))) : this.eventEmitter.emit(evt, lobbyState));
                    this.eventEmitter.emit(lobbyState.state, lobbyState);
                }
            }
            logger.debug(`ihlManager runLobby done ${_lobbyState.id} ${lobbyState.state}`);
            await setLobbyTopic(lobbyState);
        }
    }
    
    async onCreateLobbyQueue(_lobbyState) {
        logger.debug(`ihlManager onCreateLobbyQueue ${_lobbyState.id}`);
        const queue = await findQueue(_lobbyState.league_id, true, _lobbyState.queue_type);
        if (queue && queue.queue_type !== CONSTANTS.QUEUE_TYPE_CHALLENGE) {
            logger.debug(`ihlManager onCreateLobbyQueue queue ${queue.queue_type}`);
            const lobbyState = await createLobby({ findOrCreateChannelInCategory, makeRole })(_lobbyState)(queue);
            await setChannelPosition(1)(lobbyState.channel);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_NEW]);
        }
    }
    
    /**
     * Creates and registers a ready up timer for a lobby state.
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    registerLobbyTimeout(lobbyState) {
        this.unregisterLobbyTimeout(lobbyState);
        const delay = Math.max(0, lobbyState.ready_check_time + lobbyState.ready_check_timeout - Date.now());
        logger.debug(`ihlManager registerLobbyTimeout ${lobbyState.id} ${lobbyState.ready_check_time} ${lobbyState.ready_check_timeout}. timeout ${delay}ms`);
        this.lobbyTimeoutTimers[lobbyState.id] = setTimeout(() => {
            logger.debug(`ihlManager lobby ${lobbyState.lobby_name} timed out`);
            this.queueEvent(this.onLobbyTimedOut, [lobbyState]);
        }, delay);
    }

    /**
     * Clears and unregisters the ready up timer for a lobby state.
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    unregisterLobbyTimeout(lobbyState) {
        logger.debug('ihlManager unregisterLobbyTimeout');
        if (this.lobbyTimeoutTimers[lobbyState.id]) {
            clearTimeout(this.lobbyTimeoutTimers[lobbyState.id]);
        }
        delete this.lobbyTimeoutTimers[lobbyState.id];
    }

    /**
     * Runs a lobby state when its ready up timer has expired.
     * Checks for STATE_CHECKING_READY lobby state
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    async onLobbyTimedOut(lobbyState) {
        logger.debug('ihlManager onLobbyTimedOut');
        delete this.lobbyTimeoutTimers[lobbyState.id];
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
    }
    
    /**
     * Event reporting that a player has readied up.
     *
     * @event module:ihlManager~EVENT_PLAYER_READY
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - The picked user
     */

    /**
     * Runs a lobby state when a player has readied up and update their player ready state.
     * Checks for STATE_CHECKING_READY lobby state
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - An inhouse user.
     * @listens module:ihlManager~event:EVENT_PLAYER_READY
     */
    async onPlayerReady(lobbyState, user) {
        logger.debug('ihlManager onPlayerReady');
        await setPlayerReady(true)(lobbyState)(user.id);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
    }

    /**
     * Event reporting that a player has been picked.
     *
     * @event module:ihlManager~EVENT_PICK_PLAYER
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - The picked user
     * @param {number} faction - The picking faction
     */

    /**
     * Checks if a player is draftable and fires an event representing the result.
     * If the player is draftable, checks for STATE_DRAFTING_PLAYERS lobby state and runs the lobby state.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - The picked user
     * @param {number} faction - The picking faction
     * @listens module:ihlManager~event:EVENT_PICK_PLAYER
     */
    async onDraftMember(lobbyState, user, faction) {
        logger.debug('ihlManager onDraftMember');
        await setPlayerTeam(faction)(lobbyState)(user.id);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_DRAFTING_PLAYERS]);
    }

    /**
     * Event setting lobby into a player draft state.
     *
     * @event module:ihlManager~EVENT_FORCE_LOBBY_DRAFT
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} captain_1 - The captain 1 user
     * @param {module:db.User} captain_2 - The captain 2 user
     */

    /**
     * Force lobby into player draft with assigned captains.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} captain_1 - The captain 1 user
     * @param {module:db.User} captain_2 - The captain 2 user
     * @listens module:ihlManager~event:EVENT_FORCE_LOBBY_DRAFT
     */
    async onForceLobbyDraft(lobbyState, captain_1, captain_2) {
        logger.debug('ihlManager onForceLobbyDraft');
        if (lobbyState.bot_id) {
            const dotaBot = this.bots[lobbyState.bot_id];
            await disconnectDotaBot(dotaBot);
        }
        await forceLobbyDraft(lobbyState, captain_1, captain_2);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
    }

    /**
     * Runs a lobby state when the lobby is ready (all players have joined and are in the right team slot).
     * Checks for STATE_WAITING_FOR_PLAYERS lobby state
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     */
    async onLobbyReady(lobbyState) {
        logger.debug('ihlManager onLobbyReady');
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_WAITING_FOR_PLAYERS]);
    }

    /**
     * Kills a lobby state.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {module:ihl.InhouseState} _inhouseState - The inhouse state for the lobby.
     */
    async onLobbyKill(lobbyState, _inhouseState) {
        logger.debug(`ihlManager onLobbyKill ${lobbyState.id}`);
        await updateLobbyState(lobbyState)(CONSTANTS.STATE_PENDING_KILL);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_PENDING_KILL]);
    }

    /**
     * Event reporting that a match has ended.
     *
     * @event module:ihlManager~EVENT_MATCH_ENDED
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */

    /**
     * Runs a lobby state when the match has ended.
     * Checks for STATE_MATCH_IN_PROGRESS lobby state
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @listens module:ihlManager~event:EVENT_MATCH_ENDED
     */
    async onMatchEnd(lobby) {
        const league = await findLeagueById(lobby.league_id);
        const inhouseState = await createInhouseState({ league, guild: this.client.guilds.get(league.guild_id) });
        const lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState)(lobby);
        this.eventEmitter.emit(CONSTANTS.MSG_MATCH_ENDED, lobbyState, inhouseState);
        await updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_ENDED);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_ENDED]);
    }
    
    async onStateBeginReady(lobbyState) {
        await lobbyState.channel.setName(lobbyState.lobby_name)
        await lobbyState.role.setName(lobbyState.lobby_name)
        await addRoleToPlayers(lobbyState);
    }
    
    async onStateChoosingSide(lobbyState) {
        this.unregisterLobbyTimeout(lobbyState);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_CHOOSING_SIDE]);
    }
    
    async onStateAutobalancing(lobbyState) {
        this.unregisterLobbyTimeout(lobbyState);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_AUTOBALANCING]);
    }
    
    async onStateBotAssigned(lobbyState) {
        if (lobbyState.bot_id != null) {
            const dotaBot = await setupLobbyBot(lobbyState);
            logger.debug(`lobby run setupLobbyBot dotaBot exists ${!!dotaBot}`);
            if (dotaBot) {
                this.bots[lobbyState.bot_id] = dotaBot;
                lobbyState.lobby_id = dotaBot.lobby_id;
                lobbyState.state = CONSTANTS.STATE_BOT_STARTED;
            }
            else {
                lobbyState.state = CONSTANTS.STATE_BOT_FAILED;
                lobbyState.bot_id = null;
                lobbyState.lobby_id = null;
            }
            await updateLobby(lobbyState);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_BOT_STARTED, CONSTANTS.STATE_BOT_FAILED]);
        }
        else {
            await updateLobbyState(lobbyState)(CONSTANTS.STATE_WAITING_FOR_BOT);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_WAITING_FOR_BOT]);
        }
    }
    
    async onStateBotStarted(lobbyState) {
        const dotaBot = this.bots[lobbyState.bot_id];
        dotaBot.on(CONSTANTS.MSG_CHAT_MESSAGE, (channel, sender_name, message, chatData) => this.eventEmitter.emit(CONSTANTS.MSG_CHAT_MESSAGE, lobbyState, channel, sender_name, message, chatData));
        dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, member => this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, lobbyState, member));
        dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, member => this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, lobbyState, member));
        dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, state => this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, lobbyState, state));
        dotaBot.on(CONSTANTS.EVENT_LOBBY_READY, () => this.eventEmitter.emit(CONSTANTS.EVENT_LOBBY_READY, lobbyState));
        await mapPlayers(invitePlayer(dotaBot))(lobbyState);
        await updateLobbyState(lobbyState)(CONSTANTS.STATE_WAITING_FOR_PLAYERS);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_WAITING_FOR_PLAYERS]);
    }
    
    async onStateWaitingForPlayers(lobbyState) {
        const dotaBot = this.bots[lobbyState.bot_id];
        if (dotaBot) {
            if (isDotaLobbyReady(dotaBot.factionCache, dotaBot.playerState)) {
                logger.debug('lobby run isDotaLobbyReady true');
                lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
                lobbyState.started_at = Date.now();
                lobbyState.match_id = await startDotaLobby(dotaBot);
                await disconnectDotaBot(dotaBot);
                delete this.bots[lobbyState.bot_id];
                lobbyState.bot_id = null;
                await updateLobby(lobbyState);
                await removeQueuers(lobbyState);
                this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_IN_PROGRESS]);
                this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_STARTED, lobbyState);
            }
        }
        else {
            await updateLobbyState(lobbyState)(CONSTANTS.STATE_BOT_ASSIGNED);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_BOT_ASSIGNED]);
        }
    }
    
    async onStatePendingKill(lobbyState) {
        logger.debug(`ihlManager onStatePendingKill ${lobbyState.id}`);
        if (lobbyState.bot_id != null) {
            const dotaBot = this.bots[lobbyState.bot_id];
            if (dotaBot) {
                await disconnectDotaBot(dotaBot);
            }
        }
        if (lobbyState.channel) {
            await lobbyState.channel.delete();
        }
        if (lobbyState.role) {
            await lobbyState.role.delete();
        }
        await removeQueuers(lobbyState);
        await removePlayers(lobbyState);
        await pipeP(
            setLobbyStateKilled,
            updateLobby,
        )(lobbyState);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_KILLED]);
    }
    
    async onStateMatchInProgress(lobbyState) {
        logger.debug(`ihlManager onStateMatchInProgress ${lobbyState.id}`);
        this.matchTracker.addLobby(lobbyState);
        this.matchTracker.run();
    }
    
    async onStateMatchEnded(lobbyState) {
        logger.debug(`ihlManager onStatePendingKill ${lobbyState.id}`);
        /*if (lobbyState.channel) {
            await lobbyState.channel.delete();
        }
        if (lobbyState.role) {
            await lobbyState.role.delete();
        }*/
        await updatePlayerRatings(lobbyState);
        await updateLobbyState(lobbyState)(CONSTANTS.STATE_COMPLETED);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_COMPLETED]);
    }

    /**
     * Processes the inhouse manager event queue until it is empty.
     * Events are actions to perform on lobby states.
     * @async
     */
    async processEventQueue() {
        logger.debug(`ihlManager processEventQueue ${this.blocking} ${this.eventQueue.length}`);
        if (this.blocking) return;
        if (this.eventQueue.length) {
            this.blocking = true;
            const [fn, args] = this.eventQueue.shift();
            logger.debug(`ihlManager processEventQueue processing ${fn.name} ${this.eventQueue.length}`);
            await fn.apply(this, args);
            logger.debug(`ihlManager processEventQueue processed ${fn.name} ${this.eventQueue.length}`);
            this.blocking = false;
            if (this.eventQueue.length) {
                logger.debug(`ihlManager processEventQueue looping ${this.eventQueue.length}`);
                await this.processEventQueue();
            }
        }
    }
    
    /**
     * Callback for a lobby processing event.
     *
     * @callback eventCallback
     */

    /**
     * Adds a lobby processing function and its arguments to the queue.
     * When the queue is processed the function will be executed with its arguments.
     * @param {eventCallback} fn - A lobby processing event function.
     * @param {...*} args - A list of arguments the lobby processing event function will be called with.
     */
    queueEvent(fn, args) {
        logger.debug(`ihlManager queuing event ${fn.name}`);
        this.eventQueue.push([fn, args]);
        this.processEventQueue();
    }
    
    attachStateHandlers() {
        this.eventEmitter.on(CONSTANTS.STATE_BEGIN_READY, lobbyState => this.queueEvent(this.onStateBeginReady, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_CHOOSING_SIDE, lobbyState => this.queueEvent(this.onStateChoosingSide, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_AUTOBALANCING, lobbyState => this.queueEvent(this.onStateAutobalancing, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_BOT_ASSIGNED, lobbyState => this.queueEvent(this.onStateBotAssigned, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_BOT_STARTED, lobbyState => this.queueEvent(this.onStateBotStarted, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_WAITING_FOR_PLAYERS, lobbyState => this.queueEvent(this.onStateWaitingForPlayers, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_PENDING_KILL, lobbyState => this.queueEvent(this.onStatePendingKill, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_MATCH_IN_PROGRESS, lobbyState => this.queueEvent(this.onStateMatchInProgress, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_MATCH_ENDED, lobbyState => this.queueEvent(this.onStateMatchEnded, [lobbyState]));
    }

    /**
     * Bind all lobby events to their corresponding event handler functions
     */
    attachEventHandlers() {
        logger.debug('ihlManager attachEventHandlers');
        this.eventEmitter.on(CONSTANTS.EVENT_CREATE_LOBBY_QUEUE, lobbyState => this.onCreateLobbyQueue(lobbyState));
        this.eventEmitter.on(CONSTANTS.EVENT_READY_CHECK_START, lobbyState => this.registerLobbyTimeout(lobbyState));
        this.eventEmitter.on(CONSTANTS.EVENT_PLAYER_READY, (lobbyState, user) => this.queueEvent(this.onPlayerReady, [lobbyState, user]));
        this.eventEmitter.on(CONSTANTS.EVENT_PICK_PLAYER, (lobbyState, user, faction) => this.queueEvent(this.onDraftMember, [lobbyState, user, faction]));
        this.eventEmitter.on(CONSTANTS.EVENT_FORCE_LOBBY_DRAFT, (lobbyState, captain_1, captain_2) => this.queueEvent(this.onForceLobbyDraft, [lobbyState, captain_1, captain_2]));

        this.eventEmitter.on(CONSTANTS.EVENT_MATCH_ENDED, lobby => this.queueEvent(this.onMatchEnd, [lobby]));

        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SET_FP, async (lobbyState, cm_pick) => lobbyState.dotaBot.configPracticeLobby({ cm_pick }));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SET_GAMEMODE, async (lobbyState, game_mode) => lobbyState.dotaBot.configPracticeLobby({ game_mode }));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SWAP_TEAMS, async (lobbyState) => lobbyState.dotaBot.flipLobbyTeams());

        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_READY, lobbyState => this.queueEvent(this.onLobbyReady, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_KILL, (lobbyState, inhouseState) => this.queueEvent(this.onLobbyKill, [lobbyState, inhouseState]));
        this.eventEmitter.on(CONSTANTS.EVENT_RUN_LOBBY, (lobbyState, states) => this.queueEvent(this.runLobby, [lobbyState, states]));
        
        this.eventEmitter.on(CONSTANTS.EVENT_USER_LEFT_GUILD, (user) => this.queueEvent(unvouchUser, [user]));
        this.eventEmitter.on(CONSTANTS.EVENT_DISCORD_MESSAGE, async (msg) => {
            const lobby = await findLobbyByDiscordChannel(msg.guild.id)(msg.channel.id);
            if (lobby && lobby.bot_id != null && (lobby.state === CONSTANTS.STATE_BOT_STARTED || lobby.state === CONSTANTS.STATE_WAITING_FOR_PLAYERS)) {
                logger.debug(`EVENT_DISCORD_MESSAGE {msg.member.displayName}: ${msg.content}`);
                const dotaBot = this.bots[lobby.bot_id];
                dotaBot.sendMessage(`${msg.member.displayName}: ${msg.content}`);
            }
        });
    }

    /**
     * Bind all message events to their corresponding event handler functions
     */
    attachMessageHandlers() {
        logger.debug('ihlManager attachMessageHandlers');
        this.eventEmitter.on(CONSTANTS.MSG_READY_CHECK_START, async lobbyState => lobbyState.channel.send(`Queue popped. ${lobbyState.role} reply with \`!ready\``).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_READY_CHECK_FAILED, async (lobbyState, notReadyPlayers) => {
            logger.debug(`MSG_READY_CHECK_FAILED`);
            logger.debug(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${notReadyPlayers.length}`);
            const users = notReadyPlayers.map(player => lobbyState.guild.members.get(player.discord_id).displayName).join(', ');
            logger.debug(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${users}`);
            return lobbyState.channel.send(users + ' failed to ready up. Reopening queue.').catch(console.error);
        });
        this.eventEmitter.on(CONSTANTS.MSG_PLAYERS_READY, async lobbyState => lobbyState.channel.send('All players ready.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_AUTOBALANCING, async lobbyState => lobbyState.channel.send('No suitable captain pairing. Autobalancing teams instead.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_ASSIGNED_CAPTAINS, async (lobbyState) => {
            const captain_1 = getPlayerByUserId(lobbyState)(lobbyState.captain_1_user_id);
            const captain_2 = getPlayerByUserId(lobbyState)(lobbyState.captain_2_user_id);
            const captain_member_1 = await resolveUser(lobbyState.guild)(captain_1.discord_id);
            const captain_member_2 = await resolveUser(lobbyState.guild)(captain_2.discord_id);
            return lobbyState.channel.send(`Assigned ${captain_member_1} and ${captain_member_2} as captains`).catch(console.error);
        });
        this.eventEmitter.on(CONSTANTS.MSG_DRAFT_TURN, async (lobbyState) => {
            const lobbyPlayer = await getFactionCaptain(lobbyState)(lobbyState.faction);
            const player = await lobbyPlayer.getUser();
            const user = lobbyState.guild.members.get(player.discord_id);
            return lobbyState.channel.send(`${user}'s turn to draft a player. Use \`!pick @mention\``).catch(console.error);
        });
        this.eventEmitter.on(CONSTANTS.MSG_TEAMS_SELECTED, async (lobbyState) => {
            const lobby = await getLobby(lobbyState);
            let players;
            let nicknames;
            players = await lobby.getTeam1Players();
            nicknames = players.map(player => player.nickname);
            await lobbyState.channel.send(`Team 1: ${nicknames.join(',')}`).catch(console.error);
            players = await lobby.getTeam2Players();
            nicknames = players.map(player => player.nickname);
            return lobbyState.channel.send(`Team 2: ${nicknames.join(',')}`).catch(console.error);
        });

        this.eventEmitter.on(CONSTANTS.MSG_INVALID_DRAFT_CAPTAIN, async lobbyState => lobbyState.channel.send('Cannot draft a captain.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_INVALID_DRAFT_PLAYER, async lobbyState => lobbyState.channel.send('Player already drafted.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_INVALID_PLAYER_NOT_FOUND, async lobbyState => lobbyState.channel.send('Player not found.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_PLAYER_DRAFTED, async (lobbyState, drafter, member) => lobbyState.channel.send(`${member} drafted by ${drafter}`).catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_STARTED, lobbyState => lobbyState.channel.send(`Lobby started. Match id: ${lobbyState.match_id}.`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_KILLED, async (inhouseState) => inhouseState.channel.send('Lobby killed.').catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_CHAT_MESSAGE, async (lobbyState, channel, sender_name, message) => lobbyState.channel.send(`**${sender_name}:** ${message}`).catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, async (lobbyState, member) => lobbyState.channel.send(`${member.name} joined lobby`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, async (lobbyState, member) => lobbyState.channel.send(`${member.name} left lobby`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, async (lobbyState, state) => lobbyState.channel.send(`${state.current.name} ${state.current.id} changed slot`).catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_LEFT, async (lobbyState, discordUser) => getQueuers()(lobbyState).then(queuers => lobbyState.channel.send(`${discordUser} left queue. ${queuers.length} in queue.`).catch(console.error)));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_JOINED, async (lobbyState, discordUser) => getQueuers()(lobbyState).then(queuers => lobbyState.channel.send(`${discordUser} joined queue. ${queuers.length} in queue.`).catch(console.error)));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_BANNED, async (lobbyState, discordUser, user) => lobbyState.channel.send(`${discordUser} banned from queuing. Remaining time: ${toHHMMSS((user.queue_timeout - Date.now()) / 1000)}.`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, async (lobbyState, discordUser) => lobbyState.channel.send(`${discordUser} already in queue or game.`).catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_MATCH_ENDED, async (lobbyState, inhouseState) => sendMatchEndMessage(inhouseState)(lobbyState));
        
        this.eventEmitter.on(CONSTANTS.MSG_INHOUSE_CREATED, async (inhouseState) => inhouseState.channel.send('Inhouse league started.').catch(console.error));
    }
}

module.exports = {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    sendMatchEndMessage,
    createClient,
    reducePlayerToFactionCache,
    setupLobbyBot,
    updatePlayerRatings,
    IHLManager,
};
