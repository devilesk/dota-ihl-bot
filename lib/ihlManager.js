/**
 * @module ihlManager
 */
 
 /**
 * Node.js EventEmitter object
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter}
 */

const events = require('events');
const util = require('util');
const logger = require('./logger');
const {
    MatchTracker,
    createMatchEndMessageEmbed,
} = require('./matchTracker');
const CONSTANTS = require('./constants');
const {
    findAllLeagues,
    findUserByDiscordId,
    findUserByNicknameLevenshtein,
    unvouchUser,
} = require('./db');
const {
    getLobby,
    makeRole,
    runLobby,
    isPlayerDraftable,
    isCaptain,
    setPlayerReady,
    getPlayerByUserId,
    getPlayerByDiscordId,
    getFactionCaptain,
    setPlayerTeam,
    forceLobbyDraft,
    getActiveQueuers,
    addRoleToPlayers,
    lobbyToLobbyState,
    setLobbyStateKilled,
} = require('./lobby');
const {
    joinLobbyQueue,
    getAllLobbyQueues,
    leaveLobbyQueue,
    getAllLobbyQueuesForUser,
    banInhouseQueue,
    createInhouseState,
} = require('./ihl');
const {
    pipeP,
    mapPromise,
} = require('./util/fp');
const {
    resolveUser,
    findOrCreateChannelInCategory,
} = require('./guild');
const {
    findLeague,
    findOrCreateLeague,
    findAllEnabledQueues,
    findLobbyByDiscordChannel,
} = require('./db');
const {
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
        result_type = CONSTANTS.MATCH_EXACT_DISCORD_MENTION;
    }
    else {
        // check exact discord name match
        discord_user = guild.members.find(guildMember => guildMember.displayName.toLowerCase() === member.toLowerCase());
        if (discord_user) {
            discord_id = discord_user.id;
            logger.debug('Matched on displayName exact.');
            result_type = CONSTANTS.MATCH_EXACT_DISCORD_NAME;
        }
    }

    if (discord_id) {
        user = await findUserByDiscordId(guild.id)(discord_id);
    }

    if (!user) {
        [user] = await findUserByNicknameLevenshtein(member);
        if (user) {
            discord_id = user.discord_id;
            discord_user = guild.members.get(discord_id);
            result_type = CONSTANTS.MATCH_CLOSEST_NICKNAME;
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

const sendMatchEndMessage = async lobbyState => {
    const league = await findLeague(lobbyState.guild.id);
    const inhouseState = await createInhouseState({ league, guild: lobbyState.guild });
    const embed = await createMatchEndMessageEmbed(lobbyState.match_id);
    return inhouseState.channel.send(embed).catch(console.error);
}

class IHLManager {
    /**
     * Creates an inhouse league manager.
     * @classdesc Class representing the inhouse league manager.
     */
    constructor() {
        this.eventEmitter = new events.EventEmitter();
        this.client = null;
        this.lobbyTimeoutTimers = {};
        this.bots = {};
        this.matchTracker = new MatchTracker(this);
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
        logger.debug('ihlManager init');
        this.client = client;
        //this.matchTracker.start();
        logger.debug('ihlManager matchTracker started');
        const inhouseStates = await loadInhouseStatesFromLeagues(this.eventEmitter)(this.client.guilds);
        await mapPromise(createLobbiesFromQueues({ findOrCreateChannelInCategory, makeRole }))(inhouseStates);
        for (const inhouseState of inhouseStates) {
            await this.runLobbiesForInhouse(inhouseState);
        }
        logger.debug('ihlManager init done');
    }
    
    /**
    * Runs all lobbies.
    * @async 
    */
    async runLobbiesForInhouse(inhouseState) {
        const lobbies = await findAllActiveLobbiesForInhouse(inhouseState.guild.id);
        for (const lobby of lobbies) {
            const lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState);
            await this.runLobby(lobbyState);
        }
    }

    /**
     * Adds a user to a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to queue.
     */
    async joinLobbyQueue(lobbyState, user) {
        const result = await joinLobbyQueue(user)(lobbyState);
        this.eventEmitter.emit(result, lobbyState, user);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
    }

    /**
     * Adds a user to all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to queue.
     * @param {module:db.User} user - The user to queue.
     */
    async joinAllQueues(inhouseState, user) {
        const lobbyStates = await getAllLobbyQueues(inhouseState);
        for (const lobbyState of lobbyStates) {
            await this.joinLobbyQueue(lobbyState, user);
        }
    }

    /**
     * Removes a user from a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to dequeue.
     */    
    async leaveLobbyQueue(lobbyState, user) {
        const inQueue = await leaveLobbyQueue(user)(lobbyState);
        if (inQueue) {
            const queuers = await getQueuers(lobbyState);
            this.eventEmitter.emit(CONSTANTS.MSG_QUEUE_LEFT, lobbyState, user);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
        }
        else {
            eventEmitter.emit(CONSTANTS.EVENT_QUEUE_NOT_JOINED, lobbyState);
        }
    }

    /**
     * Removes a user from all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {module:db.User} user - The user to dequeue.
     */
    async leaveAllLobbyQueues(inhouseState, user) {
        const lobbyStates = await getAllLobbyQueuesForUser(inhouseState, user);
        for (const lobbyState of lobbyStates) {
            await this.leaveLobbyQueue(lobbyState, user);
        }
    }

    /**
     * Bans a user from the inhouse queue.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {external:User} user - A discord.js user.
     * @param {number} timeout - Duration of ban in minutes.
     */
    async banInhouseQueue(inhouseState, user, timeout) {
        await banInhouseQueue(user, timeout);
        await this.leaveAllLobbyQueues(inhouseState, user);
    }

    /**
     * Processes and executes a lobby state if it matches any of the given states.
     * If no states to match against are given, the lobby state is run by default.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {string[]} states - A list of valid lobby states.
     */
    async runLobby(_lobbyState) {
        logger.debug(`ihlManager runLobby valid state ${lobbyState.state} ${states}`);
        const { lobbyState, events } = await runLobby(lobbyState);
        events.forEach(evt => this.eventEmitter.emit(evt, lobbyState));
        await updateLobby(lobbyState);
        if (lobbyState.state !== _lobbyState.state) {
            logger.debug('runLobby continue');
            return this.runLobby(lobbyState);
        }
        eventEmitter.emit(lobbyState.state, lobbyState);
    }
    
    /**
     * Creates and registers a ready up timer for a lobby state.
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    registerLobbyTimeout(lobbyState) {
        this.unregisterLobbyTimeout(lobbyState);
        const delay = Math.max(0, lobbyState.ready_check_time + lobbyState.ready_check_timeout - Date.now());
        logger.debug(`ihlManager registerLobbyTimeout ${lobbyState.ready_check_time} ${lobbyState.ready_check_timeout}. timeout ${delay}ms`);
        this.lobbyTimeoutTimers[lobbyState.lobby_name] = setTimeout(() => {
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
        if (this.lobbyTimeoutTimers[lobbyState.lobby_name]) {
            clearTimeout(this.lobbyTimeoutTimers[lobbyState.lobby_name]);
        }
        this.lobbyTimeoutTimers[lobbyState.lobby_name] = null;
    }

    /**
     * Runs a lobby state when its ready up timer has expired.
     * Checks for STATE_CHECKING_READY lobby state
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    async onLobbyTimedOut(lobbyState) {
        logger.debug('ihlManager onLobbyTimedOut');
        this.lobbyTimeoutTimers[lobbyState.lobby_name] = null;
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
    }

    /**
     * Event reporting that all players are ready.
     *
     * @event module:ihlManager~EVENT_PLAYERS_READY
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */

    /**
     * Runs a lobby state when all players have readied up.
     * Checks for STATE_CHECKING_READY lobby state.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @listens module:ihlManager~event:EVENT_PLAYERS_READY
     */
    async onPlayersReady(lobbyState) {
        logger.debug('ihlManager onPlayersReady');
        this.unregisterLobbyTimeout(lobbyState);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
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
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
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
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
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
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
    }

    /**
     * Kills a lobby state.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {module:ihl.InhouseState} _inhouseState - The inhouse state for the lobby.
     */
    async onLobbyKill(lobbyState, _inhouseState) {
        await updateLobbyState(lobbyState)(CONSTANTS.STATE_PENDING_KILL);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
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
    async onMatchEnd(lobbyState) {
        this.eventEmitter.emit(CONSTANTS.MSG_MATCH_ENDED, lobbyState);
        await updateLobbyState(lobbyState)(CONSTANTS.STATE_COMPLETED);
    }
    
    async onStateBeginReady(lobbyState) {
        await lobbyState.channel.setName(lobbyState.lobby_name)
        await lobbyState.role.setName(lobbyState.lobby_name)
        await addRoleToPlayers(lobbyState);
    }
    
    async onStateBotAssigned(lobbyState) {
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
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
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
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
    }
    
    async onStateWaitingForPlayers(lobbyState) {
        const dotaBot = this.bots[lobbyState.bot_id];
        if (isDotaLobbyReady(dotaBot.factionCache, dotaBot.playerState)) {
            logger.debug('lobby run isDotaLobbyReady true');
            lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
            lobbyState.match_id = await startDotaLobby(dotaBot);
            await disconnectDotaBot(dotaBot);
            delete this.bots[lobbyState.bot_id];
            lobbyState.bot_id = null;
            await updateLobby(lobbyState);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
            this.eventEmitter.emit(CONSTANTS.MSG_LOBBY_STARTED, lobbyState);
        }
    }
    
    async onStatePendingKill(lobbyState) {
        if (lobbyState.bot_id) {
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
        await returnPlayersToQueue(lobbyState);
        await pipeP(
            setLobbyStateKilled,
            updateLobby,
        )(lobbyState);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
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
        this.eventEmitter.on(CONSTANTS.STATE_BOT_ASSIGNED, lobbyState => this.queueEvent(this.onStateBotAssigned, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_BOT_STARTED, lobbyState => this.queueEvent(this.onStateBotStarted, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_WAITING_FOR_PLAYERS, lobbyState => this.queueEvent(this.onStateWaitingForPlayers, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.STATE_PENDING_KILL, lobbyState => this.queueEvent(this.onStatePendingKill, [lobbyState]));
    }

    /**
     * Bind all lobby events to their corresponding event handler functions
     */
    attachEventHandlers() {
        logger.debug('ihlManager attachEventHandlers');
        this.eventEmitter.on(CONSTANTS.EVENT_READY_CHECK_START, lobbyState => this.registerLobbyTimeout(lobbyState));
        this.eventEmitter.on(CONSTANTS.EVENT_PLAYER_READY, (lobbyState, user) => this.queueEvent(this.onPlayerReady, [lobbyState, user]));
        this.eventEmitter.on(CONSTANTS.EVENT_PLAYERS_READY, lobbyState => this.queueEvent(this.onPlayersReady, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.EVENT_PICK_PLAYER, (lobbyState, user, faction) => this.queueEvent(this.onDraftMember, [lobbyState, user, faction]));
        this.eventEmitter.on(CONSTANTS.EVENT_FORCE_LOBBY_DRAFT, (lobbyState, captain_1, captain_2) => this.queueEvent(this.onForceLobbyDraft, [lobbyState, captain_1, captain_2]));

        this.eventEmitter.on(CONSTANTS.EVENT_MATCH_ENDED, lobbyState => this.queueEvent(this.onMatchEnd, [lobbyState]));

        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SET_FP, async (lobbyState, cm_pick) => lobbyState.dotaBot.configPracticeLobby({ cm_pick }));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SET_GAMEMODE, async (lobbyState, game_mode) => lobbyState.dotaBot.configPracticeLobby({ game_mode }));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SWAP_TEAMS, async (lobbyState) => lobbyState.dotaBot.flipLobbyTeams());

        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_READY, lobbyState => this.queueEvent(this.onLobbyReady, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_KILL, (lobbyState, inhouseState) => this.queueEvent(this.onLobbyKill, [lobbyState, inhouseState]));
        this.eventEmitter.on(CONSTANTS.EVENT_RUN_LOBBY, lobbyState => this.queueEvent(this.runLobby, [lobbyState]));
        
        this.eventEmitter.on(CONSTANTS.EVENT_USER_LEFT_GUILD, (user) => this.queueEvent(unvouchUser, [user]));
        this.eventEmitter.on(CONSTANTS.EVENT_DISCORD_MESSAGE, async (msg) => {
            const guild = msg.channel.guild;
            const league = await findLeague(guild.id);
            const inhouseState = await createInhouseState({ league, guild });
            const lobby = inhouseState ? await findLobbyByDiscordChannel(guild.id)(msg.channel.id) : null;
            const lobbyState = lobby ? await lobbyToLobbyState(inhouseState)({ findOrCreateChannelInCategory, makeRole })(lobby) : null;
            if (lobbyState && lobbyState.dotaBot) {
                lobbyState.dotaBot.sendMessage(`${msg.member.displayName}: ${msg.content}`);
            }
        });
    }

    /**
     * Bind all message events to their corresponding event handler functions
     */
    attachMessageHandlers() {
        logger.debug('ihlManager attachMessageHandlers');
        this.eventEmitter.on(CONSTANTS.MSG_READY_CHECK_START, async lobbyState => lobbyState.channel.send(`Queue popped. ${lobbyState.role} reply with \`!ready\``).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_READY_CHECK_FAILED, async (lobbyState) => {
            const league = await findLeague(lobbyState.guild.id);
            const inhouseState = await createInhouseState({ league, guild: lobbyState.guild });
            return inhouseState.channel.send('Failed to ready up.').catch(console.error);
        });
        this.eventEmitter.on(CONSTANTS.MSG_PLAYERS_READY, async lobbyState => lobbyState.channel.send('All players ready.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_AUTOBALANCING, async lobbyState => lobbyState.channel.send('No suitable captain pairing. Autobalancing teams instead.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_ASSIGNED_CAPTAINS, async (lobbyState) => {
            const captain_1 = getPlayerByUserId(lobbyState)(lobbyState.captain_1_user_id);
            const captain_2 = getPlayerByUserId(lobbyState)(lobbyState.captain_2_user_id);
            const captain_member_1 = await resolveUser(lobbyState.guild, captain_1.discord_id);
            const captain_member_2 = await resolveUser(lobbyState.guild, captain_2.discord_id);
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

        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_LEFT, async (inhouseState, queueCount) => inhouseState.channel.send(`Left queue. ${queueCount} in queue.`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_JOINED, async (inhouseState, queueCount) => inhouseState.channel.send(`Joined queue. ${queueCount} in queue.`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_BANNED, async (inhouseState, user) => inhouseState.channel.send(`You are banned from queuing. Remaining time: ${toHHMMSS((user.queue_timeout - Date.now()) / 1000)}.`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, async (inhouseState, user) => {
            const author = inhouseState.guild.members.get(user.discord_id);
            return inhouseState.channel.send(`${author} already in queue or game.`).catch(console.error);
        });

        this.eventEmitter.on(CONSTANTS.MSG_MATCH_ENDED, async lobbyState => sendMatchEndMessage(lobbyState));
        
        this.eventEmitter.on(CONSTANTS.MSG_INHOUSE_CREATED, async (inhouseState) => inhouseState.channel.send('Inhouse league started.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUES_LOADED, async (inhouseState, total, loaded) => inhouseState.channel.send(`${loaded}/${total} queues loaded.`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_LOBBIES_LOADED, async (inhouseState, total, loaded) => inhouseState.channel.send(`${loaded}/${total} lobbies loaded.`).catch(console.error));
        
        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_STATUS, async (lobbyState) => {
            const queuers = await getActiveQueuers()(lobbyState);
            return lobbyState.channel.send(`${queuers.length} queuing.`).catch(console.error);
        });
    }
}

/**
 * A singleton instance of IHLManager that is exported by this module.
 * @constant
 * @type {IHLManager}
*/
const ihlManager = new IHLManager();

module.exports = {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    sendMatchEndMessage,
    IHLManager,
    ihlManager,
};
