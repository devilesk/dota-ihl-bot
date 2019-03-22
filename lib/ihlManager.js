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
} = require('./lobby');
const {
    createInhouseState,
    loadLobbiesIntoInhouse,
    runLobbiesForInhouse,
    getLobbyFromInhouse,
    getLobbyFromInhouseByChannelId,
    addLobbyToInhouse,
    removeLobbyFromInhouse,
    createChallengeLobbyForInhouse,
    loadQueuesIntoInhouse,
    joinLobbyQueue,
    joinAllQueues,
    leaveLobbyQueue,
    leaveAllQueues,
    banInhouseQueue,
    transformLeagueGuild,
    loadInhouseState,
    isMessageFromInhouse,
    isMessageFromInhouseAdmin,
    isMessageFromInhouseLobby,
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
    findOrCreateLeague,
    findAllEnabledQueues,
} = require('./db');
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
* Gets the inhouse state with the given guild id in a list of inhouse states.
* @function 
* @param {module:ihl.InhouseState[]} inhouseStates - A list of inhouse states.
* @param {string} guildId - A guild id.
* @returns {number} The inhouse state in inhouseStates. Returns undefined if no inhouse state with the guild id exists.
*/
const getInhouseState = (inhouseStates, guildId) => inhouseStates.find(inhouseState => inhouseState.guild.id === guildId);

/**
* Gets the index of an inhouse state with the given guild id in a list of inhouse states.
* @function 
* @param {module:ihl.InhouseState[]} inhouseStates - A list of inhouse states.
* @param {string} guildId - A guild id.
* @returns {number} The index of the inhouse state in inhouseStates. Returns -1 if no inhouse state with the guild id exists.
*/
const getIndexOfInhouseState = (inhouseStates, guildId) => inhouseStates.findIndex(inhouseState => inhouseState.guild.id === guildId);

/**
* Adds an inhouse state to a list of inhouse states.
* @function 
* @param {module:ihl.InhouseState[]} inhouseStates - A list of inhouse states.
* @param {module:ihl.InhouseState} inhouseState - The inhouse state to add.
* @returns {module:ihl.InhouseState[]} A new list of inhouse states with the inhouse state added to it.
*/
const addInhouseState = inhouseStates => inhouseState => {
    const index = getIndexOfInhouseState(inhouseStates, inhouseState.guild.id);
    if (index !== -1) {
        const _inhouseStates = [...inhouseStates];
        _inhouseStates.splice(index, 1);
        return [..._inhouseStates, inhouseState];
    }

    return [...inhouseStates, inhouseState];
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
const loadInhouseStates = eventEmitter => guilds => async leagues => mapPromise(loadInhouseState(eventEmitter))(leagues.map(transformLeagueGuild(guilds)));

/**
* Gets all league records from the database turns them into inhouse states.
* @function
* @async
* @param {external:EventEmitter} eventEmitter - The event listener object.
* @param {external:Guild[]} guilds - A list of guilds to initialize leagues with.
* @returns {module:ihl.InhouseState[]} The inhouse states loaded from all league records.
*/
const loadInhouseStatesFromLeagues = eventEmitter => async guilds => pipeP(
    findAllLeagues,
    loadInhouseStates(eventEmitter)(guilds),
)();

/**
* Checks if a message was sent from an inhouse guild.
* @function
* @param {module:ihl.InhouseState[]} inhouseStates - A list of inhouse states.
* @param {external:Message} msg - A discord message sent from a lobby channel.
* @returns {boolean} Whether the message was sent from an inhouse guild.
*/
const isMessageFromAnyInhouse = (inhouseStates, msg) => inhouseStates.some(isMessageFromInhouse(msg));

/**
* Checks if a message was sent by an inhouse admin.
* @function
* @param {module:ihl.InhouseState[]} inhouseStates - A list of inhouse states.
* @param {external:Message} msg - A discord message sent from a lobby channel.
* @returns {boolean} Whether the message author is an inhouse admin.
*/
const isMessageFromAnyInhouseAdmin = (inhouseStates, msg) => inhouseStates.some(isMessageFromInhouseAdmin(msg));

/**
* Checks if a message was sent from an inhouse lobby.
* @function
* @param {module:ihl.InhouseState[]} inhouseStates - A list of inhouse states.
* @param {external:Message} msg - A discord message sent from a lobby channel.
* @returns {boolean} Whether the message was sent from an inhouse lobby.
*/
const isMessageFromAnyInhouseLobby = (inhouseStates, msg) => inhouseStates.some(isMessageFromInhouseLobby(msg));

const sendMatchEndMessage = async (inhouseStates, lobbyState) => {
    const inhouseState = getInhouseState(inhouseStates, lobbyState.guild.id);
    const embed = await createMatchEndMessageEmbed(lobbyState.match_id);
    return inhouseState.channel.send(embed).catch(console.error);
}

const initLeague = async (guild) => findOrCreateLeague(guild.id)([
    { queue_type: CONSTANTS.QUEUE_TYPE_DRAFT, queue_name: 'player-draft-queue' },
    { queue_type: CONSTANTS.QUEUE_TYPE_AUTO, queue_name: 'autobalanced-queue' },
]);

class IHLManager extends events.EventEmitter {
    /**
     * Creates an inhouse league manager.
     * @classdesc Class representing the inhouse league manager.
     * @extends external:EventEmitter
     */
    constructor() {
        super();

        this.client = null;
        this.inhouseStates = [];
        this.lobbyTimeoutTimers = {};
        this.matchTracker = new MatchTracker(this);
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
        this.inhouseStates = await loadInhouseStatesFromLeagues(this)(this.client.guilds);
        logger.debug('ihlManager init done');
    }

    /**
     * Creates a new inhouse league and adds the inhouse state to list of inhouse states.
     * @async
     * @param {external:Guild} guild - A discord.js guild.
     */
    async createNewLeague(guild) {
        const league = await initLeague(guild);
        const inhouseState = await createInhouseState(this)({ league, guild });
        this.inhouseStates = addInhouseState(this.inhouseStates)(inhouseState);
    }

    /**
     * Creates a new challenge lobby.
     * @async
     * @param {module:ihl.InhouseState} _inhouseState - The inhouse for the challenge.
     * @param {module:db.Challenge} challenge - The challenge object.
     * @param {module:db.User} giver - The challenge giver.
     * @param {module:db.User} receiver - The challenge receiver.
     */
    async createChallengeLobbyForInhouse(_inhouseState, challenge, giver, receiver) {
        const inhouseState = await createChallengeLobbyForInhouse({ resolveUser, findOrCreateChannelInCategory, makeRole })(_inhouseState, challenge, this, giver, receiver);
        this.inhouseStates = addInhouseState(this.inhouseStates)(inhouseState);
    }

    /**
     * Checks the inhouse queues.
     * @async
     * @param {module:ihl.InhouseState} _inhouseState - The inhouse to check.
     */
    async checkInhouseQueues(_inhouseState) {
        const inhouseState = await runLobbiesForInhouse(eventEmitter)(this)(inhouseState);
        this.inhouseStates = addInhouseState(this.inhouseStates)(inhouseState);
    }

    /**
     * Adds a user to all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to queue.
     * @param {module:db.User} user - The user to queue.
     */
    async joinAllQueues(inhouseState, user) {
        await joinAllQueues(inhouseState, user, this);
        await this.checkInhouseQueues(inhouseState);
    }

    /**
     * Adds a user to a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to queue.
     */
    async joinLobbyQueue(lobbyState, user) {
        await joinLobbyQueue(user, this)(lobbyState);
        await this.runLobby(lobbyState, [CONSTANTS.STATE_WAITING_FOR_QUEUE]);
    }

    /**
     * Removes a user from all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {module:db.User} user - The user to dequeue.
     */
    async leaveAllQueues(inhouseState, user) {
        await leaveAllQueues(inhouseState, user, this);
        await this.checkInhouseQueues(inhouseState);
    }

    /**
     * Removes a user from a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to dequeue.
     */    
    async leaveLobbyQueue(lobbyState, user) {
        await leaveLobbyQueue(user, this)(lobbyState);
        await this.runLobby(lobbyState, [CONSTANTS.STATE_WAITING_FOR_QUEUE]);
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
        await leaveAllQueues(inhouseState, user, this);
        await this.checkInhouseQueues(inhouseState);
    }

    /**
     * Processes and executes a lobby state if it matches any of the given states.
     * If no states to match against are given, the lobby state is run by default.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {string[]} states - A list of valid lobby states.
     */
    async runLobby(_lobbyState, states = []) {
        logger.debug(`ihlManager runLobby ${_lobbyState.lobby_name} ${states}`);
        let inhouseState = getInhouseState(this.inhouseStates, _lobbyState.guild.id);
        if (!inhouseState) {
            let lobbyState = getLobbyFromInhouse(inhouseState, _lobbyState.lobby_name);
            if (!lobbyState) {
                if (!states.length || states.indexOf(lobbyState.state) !== -1) {
                    logger.debug(`ihlManager runLobby valid state ${lobbyState.state} ${states}`);
                    lobbyState = await runLobby(lobbyState, this);
                    if (lobbyState.state === CONSTANTS.STATE_KILLED) {
                        inhouseState = await pipeP(
                            reloadQueueForInhouse(lobbyState),
                            removeLobbyFromInhouse(lobbyState),
                        )(inhouseState);
                        this.emit(CONSTANTS.MSG_LOBBY_KILLED, inhouseState);
                    }
                    else {
                        inhouseState = addLobbyToInhouse(inhouseState, lobbyState);
                    }
                    this.inhouseStates = addInhouseState(this.inhouseStates)(inhouseState);
                }
                else {
                    logger.debug(`ihlManager runLobby invalid state ${lobbyState.state} ${states}`);
                }
            }
            else {
                logger.debug(`ihlManager runLobby lobbyState not found ${_lobbyState.lobby_name}`);
            }
        }
        else {
            logger.debug(`ihlManager runLobby inhouseState not found ${_lobbyState.guild.id}`);
        }
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
        await this.runLobby(lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
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
        await this.reloadQueue(lobbyState);
        await this.runLobby(lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
    }
    
    /**
     * Reload a queue state from a lobby state.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    async reloadQueue(lobbyState) {
        let inhouseState = getInhouseState(this.inhouseStates, lobbyState.guild.id);
        inhouseState = await reloadQueueForInhouse(this)({ findOrCreateChannelInCategory, makeRole })(lobbyState)(inhouseState);
        this.inhouseStates = addInhouseState(this.inhouseStates)(inhouseState);
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
        await this.runLobby(lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
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
        await this.runLobby(lobbyState, [CONSTANTS.STATE_DRAFTING_PLAYERS]);
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
        await this.runLobby(lobbyState, [CONSTANTS.STATE_CHOOSING_SIDE]);
    }

    /**
     * Runs a lobby state when the lobby is ready (all players have joined and are in the right team slot).
     * Checks for STATE_WAITING_FOR_PLAYERS lobby state
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     */
    async onLobbyReady(_lobbyState) {
        logger.debug('ihlManager onLobbyReady');
        await this.runLobby(_lobbyState, [CONSTANTS.STATE_WAITING_FOR_PLAYERS]);
    }

    /**
     * Kills a lobby state.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {module:ihl.InhouseState} _inhouseState - The inhouse state for the lobby.
     */
    async onLobbyKill(_lobbyState, _inhouseState) {
        logger.debug('ihlManager onLobbyKill');
        const lobbyState = { ..._lobbyState };
        lobbyState.state = CONSTANTS.STATE_PENDING_KILL;
        await this.runLobby(lobbyState, [CONSTANTS.STATE_PENDING_KILL]);
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
        logger.debug('ihlManager onMatchEnd');
        await this.runLobby(lobbyState, [CONSTANTS.STATE_MATCH_IN_PROGRESS]);
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

    /**
     * Bind all lobby events to their corresponding event handler functions
     */
    attachEventHandlers() {
        logger.debug('ihlManager attachEventHandlers');
        this.on(CONSTANTS.EVENT_READY_CHECK_START, lobbyState => this.registerLobbyTimeout(lobbyState));
        this.on(CONSTANTS.EVENT_PLAYER_READY, (lobbyState, user) => this.queueEvent(this.onPlayerReady, [lobbyState, user]));
        this.on(CONSTANTS.EVENT_PLAYERS_READY, lobbyState => this.queueEvent(this.onPlayersReady, [lobbyState]));
        this.on(CONSTANTS.EVENT_PICK_PLAYER, (lobbyState, user, faction) => this.queueEvent(this.onDraftMember, [lobbyState, user, faction]));
        this.on(CONSTANTS.EVENT_FORCE_LOBBY_DRAFT, (lobbyState, captain_1, captain_2) => this.queueEvent(this.onForceLobbyDraft, [lobbyState, captain_1, captain_2]));

        this.on(CONSTANTS.EVENT_MATCH_ENDED, lobbyState => this.queueEvent(this.onMatchEnd, [lobbyState]));

        this.on(CONSTANTS.EVENT_LOBBY_SET_FP, async (lobbyState, cm_pick) => lobbyState.dotaBot.configPracticeLobby({ cm_pick }));
        this.on(CONSTANTS.EVENT_LOBBY_SET_GAMEMODE, async (lobbyState, game_mode) => lobbyState.dotaBot.configPracticeLobby({ game_mode }));
        this.on(CONSTANTS.EVENT_LOBBY_SWAP_TEAMS, async (lobbyState) => lobbyState.dotaBot.flipLobbyTeams());

        this.on(CONSTANTS.EVENT_LOBBY_READY, lobbyState => this.queueEvent(this.onLobbyReady, [lobbyState]));
        this.on(CONSTANTS.EVENT_LOBBY_KILL, (lobbyState, inhouseState) => this.queueEvent(this.onLobbyKill, [lobbyState, inhouseState]));
        
        this.on(CONSTANTS.EVENT_USER_LEFT_GUILD, (user) => this.queueEvent(unvouchUser, [user]));
        this.on(CONSTANTS.EVENT_DISCORD_MESSAGE, (msg) => {
            const inhouseState = getInhouseState(this.inhouseStates, msg.guild.id);
            if (inhouseState) {
                const lobbyState = getLobbyFromInhouseByChannelId(inhouseState, msg.channel.id);
                if (lobbyState && lobbyState.dotaBot) {
                    lobbyState.dotaBot.sendMessage(`${msg.member.displayName}: ${msg.content}`);
                }
            }
        });
    }

    /**
     * Bind all message events to their corresponding event handler functions
     */
    attachMessageHandlers() {
        logger.debug('ihlManager attachMessageHandlers');
        this.on(CONSTANTS.MSG_READY_CHECK_START, async lobbyState => lobbyState.channel.send(`Queue popped. ${lobbyState.role} reply with \`!ready\``).catch(console.error));
        this.on(CONSTANTS.MSG_READY_CHECK_FAILED, async (lobbyState) => {
            const inhouseState = getInhouseState(this.inhouseStates, lobbyState.guild.id);
            return inhouseState.channel.send('Failed to ready up.').catch(console.error);
        });
        this.on(CONSTANTS.MSG_PLAYERS_READY, async lobbyState => lobbyState.channel.send('All players ready.').catch(console.error));
        this.on(CONSTANTS.MSG_AUTOBALANCING, async lobbyState => lobbyState.channel.send('No suitable captain pairing. Autobalancing teams instead.').catch(console.error));
        this.on(CONSTANTS.MSG_ASSIGNED_CAPTAINS, async (lobbyState) => {
            const captain_1 = getPlayerByUserId(lobbyState)(lobbyState.captain_1_user_id);
            const captain_2 = getPlayerByUserId(lobbyState)(lobbyState.captain_2_user_id);
            const captain_member_1 = await resolveUser(lobbyState.guild, captain_1.discord_id);
            const captain_member_2 = await resolveUser(lobbyState.guild, captain_2.discord_id);
            return lobbyState.channel.send(`Assigned ${captain_member_1} and ${captain_member_2} as captains`).catch(console.error);
        });
        this.on(CONSTANTS.MSG_DRAFT_TURN, async (lobbyState) => {
            const lobbyPlayer = await getFactionCaptain(lobbyState)(lobbyState.faction);
            const player = await lobbyPlayer.getUser();
            const user = lobbyState.guild.members.get(player.discord_id);
            return lobbyState.channel.send(`${user}'s turn to draft a player. Use \`!pick @mention\``).catch(console.error);
        });
        this.on(CONSTANTS.MSG_TEAMS_SELECTED, async (lobbyState) => {
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

        this.on(CONSTANTS.MSG_INVALID_DRAFT_CAPTAIN, async lobbyState => lobbyState.channel.send('Cannot draft a captain.').catch(console.error));
        this.on(CONSTANTS.MSG_INVALID_DRAFT_PLAYER, async lobbyState => lobbyState.channel.send('Player already drafted.').catch(console.error));
        this.on(CONSTANTS.MSG_INVALID_PLAYER_NOT_FOUND, async lobbyState => lobbyState.channel.send('Player not found.').catch(console.error));
        this.on(CONSTANTS.MSG_PLAYER_DRAFTED, async (lobbyState, drafter, member) => lobbyState.channel.send(`${member} drafted by ${drafter}`).catch(console.error));

        this.on(CONSTANTS.MSG_LOBBY_STARTED, lobbyState => lobbyState.channel.send(`Lobby started. Match id: ${lobbyState.match_id}.`).catch(console.error));
        this.on(CONSTANTS.MSG_LOBBY_KILLED, async (inhouseState) => inhouseState.channel.send('Lobby killed.').catch(console.error));

        this.on(CONSTANTS.MSG_CHAT_MESSAGE, async (lobbyState, channel, sender_name, message) => lobbyState.channel.send(`**${sender_name}:** ${message}`).catch(console.error));

        this.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, async (lobbyState, member) => lobbyState.channel.send(`${member.name} joined lobby`).catch(console.error));
        this.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, async (lobbyState, member) => lobbyState.channel.send(`${member.name} left lobby`).catch(console.error));
        this.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, async (lobbyState, state) => lobbyState.channel.send(`${state.current.name} ${state.current.id} changed slot`).catch(console.error));

        this.on(CONSTANTS.MSG_QUEUE_LEFT, async (inhouseState, queueCount) => inhouseState.channel.send(`Left queue. ${queueCount} in queue.`).catch(console.error));
        this.on(CONSTANTS.MSG_QUEUE_JOINED, async (inhouseState, queueCount) => inhouseState.channel.send(`Joined queue. ${queueCount} in queue.`).catch(console.error));
        this.on(CONSTANTS.MSG_QUEUE_BANNED, async (inhouseState, user) => inhouseState.channel.send(`You are banned from queuing. Remaining time: ${toHHMMSS((user.queue_timeout - Date.now()) / 1000)}.`).catch(console.error));
        this.on(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, async (inhouseState, user) => {
            const author = inhouseState.guild.members.get(user.discord_id);
            return inhouseState.channel.send(`${author} already in queue or game.`).catch(console.error);
        });

        this.on(CONSTANTS.MSG_MATCH_ENDED, async (lobbyState) => sendMatchEndMessage(this.inhouseStates, lobbyState));
        
        this.on(CONSTANTS.MSG_INHOUSE_CREATED, async (inhouseState) => inhouseState.channel.send('Inhouse league started.').catch(console.error));
        this.on(CONSTANTS.MSG_QUEUES_LOADED, async (inhouseState, total, loaded) => inhouseState.channel.send(`${loaded}/${total} queues loaded.`).catch(console.error));
        this.on(CONSTANTS.MSG_LOBBIES_LOADED, async (inhouseState, total, loaded) => inhouseState.channel.send(`${loaded}/${total} lobbies loaded.`).catch(console.error));
        
        this.on(CONSTANTS.MSG_LOBBY_STATUS, async (lobbyState) => {
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
    getInhouseState,
    getIndexOfInhouseState,
    addInhouseState,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    isMessageFromAnyInhouse,
    isMessageFromAnyInhouseAdmin,
    isMessageFromAnyInhouseLobby,
    sendMatchEndMessage,
    initLeague,
    IHLManager,
    ihlManager,
};
