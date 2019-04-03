/**
 * @module ihlManager
 */

/**
 * Node.js EventEmitter object
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter}
 */
const assert = require('assert').strict;
const Commando = require('discord.js-commando');
const { EventEmitter } = require('events');
const path = require('path');
const util = require('util');
const logger = require('./logger');
const MatchTracker = require('./matchTracker');
const CONSTANTS = require('./constants');
const Db = require('./db');
const Lobby = require('./lobby');
const Ihl = require('./ihl');
const Fp = require('./util/fp');
const Guild = require('./guild');
const DotaBot = require('./dotaBot');
const LobbyStateHandlers = require('./lobbyStateHandlers');
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
        user = await Db.findUserByDiscordId(guild.id)(discord_id);
        result_type = CONSTANTS.MATCH_EXACT_DISCORD_MENTION;
    }
    else {
        // check exact discord name match
        discord_user = guild.members.find(guildMember => guildMember.displayName.toLowerCase() === member.toLowerCase());
        if (discord_user) {
            logger.debug('Matched on displayName exact.');
            discord_id = discord_user.id;
            user = await Db.findUserByDiscordId(guild.id)(discord_id);
            result_type = CONSTANTS.MATCH_EXACT_DISCORD_NAME;
        }
        else {
            // try to parse a steamid_64 from text
            const steamid_64 = await Ihl.parseSteamID64(member);
            if (steamid_64 != null) {
                logger.debug('Matched on steamid_64.');
                user = await Db.findUserBySteamId64(guild.id)(steamid_64);
                discord_user = guild.members.get(user.discord_id);
                result_type = CONSTANTS.MATCH_STEAMID_64;
            }
            else {
                // check exact nickname match
                user = await Db.findUserByNickname(guild.id)(member);
                if (user) {
                    discord_id = user.discord_id;
                    discord_user = guild.members.get(discord_id);
                    result_type = CONSTANTS.MATCH_EXACT_NICKNAME;
                }
                else {
                    // check close nickname match
                    try {
                        [user] = await Db.findUserByNicknameLevenshtein(guild.id)(member);
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
const loadInhouseStates = guilds => async leagues => Fp.mapPromise(Ihl.createInhouseState)(leagues.map(league => ({ league, guild: guilds.get(league.guild_id) })));

/**
* Gets all league records from the database turns them into inhouse states.
* @function
* @async
* @param {external:EventEmitter} eventEmitter - The event listener object.
* @param {external:Guild[]} guilds - A list of guilds to initialize leagues with.
* @returns {module:ihl.InhouseState[]} The inhouse states loaded from all league records.
*/
const loadInhouseStatesFromLeagues = async guilds => Fp.pipeP(
    Db.findAllLeagues,
    loadInhouseStates(guilds),
)();

const sendMatchEndMessage = inhouseState => async (lobbyState) => {
    const embed = await MatchTracker.createMatchEndMessageEmbed(lobbyState.match_id);
    await lobbyState.channel.send(embed).catch(console.error);
    return inhouseState.channel.send(embed).catch(console.error);
};

const createClient = options => new Commando.CommandoClient({
    commandPrefix: options.COMMAND_PREFIX,
    owner: options.OWNER_DISCORD_ID,
    disableEveryone: true,
    commandEditableDuration: 0,
    unknownCommandResponse: false,
});

class IHLManager {
    /**
     * Creates an inhouse league manager.
     * @classdesc Class representing the inhouse league manager.
     */
    constructor(options) {
        this.options = options;
        this.eventEmitter = new EventEmitter();
        this.client = null;
        this.lobbyTimeoutTimers = {};
        this.bots = {};
        this.matchTracker = null;
        this.attachEventHandlers();
        this.attachMessageHandlers();
        this.eventQueue = [];
        this.blocking = false;
        this._runLobbyCount = 0;
    }

    /**
     * Initializes the inhouse league manager with a discord client and loads inhouse states for each league.
     * @async
     * @param {external:Client} client - A discord.js client.
     */
    async init(client) {
        logger.debug(`ihlManager init ${this.options.COMMAND_PREFIX}`);
        this.matchTracker = new MatchTracker.MatchTracker(parseInt(this.options.MATCH_POLL_INTERVAL));
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
        await Fp.mapPromise(Ihl.createLobbiesFromQueues({ findOrCreateChannelInCategory: Guild.findOrCreateChannelInCategory, makeRole: Guild.makeRole }))(inhouseStates);
        for (const inhouseState of inhouseStates) {
            await this.runLobbiesForInhouse(inhouseState);
        }
        await this.matchTracker.loadInProgressLobbies();
        this.matchTracker.run();
        logger.debug('Inhouse lobbies loaded and run.');
        this.eventEmitter.emit('ready');
    }

    async onDiscordMessage(msg) {
        if (msg.author.id !== this.client.user.id) {
            this.eventEmitter.emit(CONSTANTS.EVENT_DISCORD_MESSAGE, msg);
        }
    }

    async onDiscordMemberLeave(member) {
        logger.debug(`onDiscordMemberLeave ${member}`);
        const user = await Db.findUserByDiscordId(member.guild.id)(member.id);
        if (user) {
            this.eventEmitter.emit(CONSTANTS.EVENT_USER_LEFT_GUILD, user);
        }
    }
    
    async getDotaBot(bot_id) {
        return Fp.pipeP(
            Db.findBot,
            DotaBot.createDotaBot,
        )(bot_id);
    }

    async Ihl.createNewLeague(guild) {
        logger.debug(`ihlManager Ihl.createNewLeague ${guild.id}`);
        const inhouseState = await Ihl.createNewLeague(guild);
        logger.debug('ihlManager Ihl.createNewLeague inhouseState created');
        await Ihl.createLobbiesFromQueues({ findOrCreateChannelInCategory: Guild.findOrCreateChannelInCategory, makeRole: Guild.makeRole })(inhouseState);
        logger.debug('ihlManager Ihl.createNewLeague queue lobbies created');
        await this.runLobbiesForInhouse(inhouseState);
        logger.debug('ihlManager Ihl.createNewLeague lobbies run');
    }

    /**
    * Runs all lobbies.
    * @async
    */
    async runLobbiesForInhouse(inhouseState) {
        const lobbies = await Db.findAllActiveLobbiesForInhouse(inhouseState.guild.id);
        for (const lobby of lobbies) {
            const lobbyState = await Fp.pipeP(
                Lobby.lobbyToLobbyState({ findOrCreateChannelInCategory: Guild.findOrCreateChannelInCategory, makeRole: Guild.makeRole })(inhouseState),
                Lobby.resetLobbyState,
            )(lobby);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [lobbyState.state]);
        }
    }

    /**
     * Adds a user to a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to queue.
     */
    async Ihl.joinLobbyQueue(lobbyState, user, discordUser) {
        logger.debug('ihlManager Ihl.joinLobbyQueue');
        const result = await Ihl.joinLobbyQueue(user)(lobbyState);
        logger.debug(`ihlManager Ihl.joinLobbyQueue result ${result}`);
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
    async joinAllLobbyQueues(inhouseState, user, discordUser) {
        const lobbyStates = await Ihl.getAllLobbyQueues(inhouseState);
        for (const lobbyState of lobbyStates) {
            await this.Ihl.joinLobbyQueue(lobbyState, user, discordUser);
        }
    }

    /**
     * Removes a user from a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to dequeue.
     */
    async Ihl.leaveLobbyQueue(lobbyState, user, discordUser) {
        const inQueue = await Ihl.leaveLobbyQueue(user)(lobbyState);
        if (inQueue) {
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
        const lobbyStates = await Ihl.getAllLobbyQueuesForUser(inhouseState, user);
        for (const lobbyState of lobbyStates) {
            await this.Ihl.leaveLobbyQueue(lobbyState, user, discordUser);
        }
    }

    /**
     * Bans a user from the inhouse queue.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {external:User} user - A discord.js user.
     * @param {number} timeout - Duration of ban in minutes.
     */
    async Ihl.banInhouseQueue(inhouseState, user, timeout, discordUser) {
        await Ihl.banInhouseQueue(user, timeout);
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
        this._runLobbyCount += 1;
        assert.equal(this._runLobbyCount, 1, `Invalid runLobby count: ${this._runLobbyCount}`);
        const lobby = await Lobby.getLobby(_lobbyState);
        logger.debug(`runLobby ${_lobbyState.id} ${_lobbyState.state} ${states} ${!states.length || states.indexOf(lobby.state) !== -1}`);
        if (!states.length || states.indexOf(lobby.state) !== -1) {
            let lobbyState = await Fp.pipeP(
                Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState),
                Lobby.validateLobbyPlayers,
            )(lobby);
            logger.debug(`runLobby ${_lobbyState.id} post-validate ${_lobbyState.state} to ${lobbyState.state}`);
            let beginState = -1;
            let endState = lobbyState.state;
            while (beginState !== endState) {
                beginState = lobbyState.state;
                logger.debug(`runLobby beginState ${beginState}`);
                lobbyState = await this[beginState](lobbyState);
                endState = lobbyState.state;
                await Db.updateLobby(lobbyState);
            }
            logger.debug(`runLobby done ${_lobbyState.id} ${lobbyState.state}`);
            await Lobby.setLobbyTopic(lobbyState);
        }
        this._runLobbyCount -= 1;
    }

    async onCreateLobbyQueue(_lobbyState) {
        logger.debug(`ihlManager onCreateLobbyQueue ${_lobbyState.id}`);
        const queue = await Db.findQueue(_lobbyState.league_id, true, _lobbyState.queue_type);
        if (queue && queue.queue_type !== CONSTANTS.QUEUE_TYPE_CHALLENGE) {
            logger.debug(`ihlManager onCreateLobbyQueue queue ${queue.queue_type}`);
            const lobbyState = await Ihl.createLobby({ findOrCreateChannelInCategory: Guild.findOrCreateChannelInCategory, makeRole: Guild.makeRole })(_lobbyState.inhouseState)(queue);
            await Guild.setChannelPosition(1)(lobbyState.channel);
            this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_NEW]);
        }
    }
    
    async onSetLobbyState(lobbyState, state) {
        lobbyState.state = state;
        await Db.updateLobbyState(lobbyState)(state);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [state]);
    }

    /**
     * Creates and registers a ready up timer for a lobby state.
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    registerLobbyTimeout(lobbyState) {
        this.unregisterLobbyTimeout(lobbyState);
        const delay = Math.max(0, lobbyState.ready_check_time + lobbyState.inhouseState.ready_check_timeout - Date.now());
        logger.debug(`ihlManager registerLobbyTimeout ${lobbyState.id} ${lobbyState.ready_check_time} ${lobbyState.inhouseState.ready_check_timeout}. timeout ${delay}ms`);
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
        await Lobby.setPlayerReady(true)(lobbyState)(user.id);
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
        await Lobby.setPlayerTeam(faction)(lobbyState)(user.id);
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
    async onforceLobbyDraft(lobbyState, captain_1, captain_2) {
        logger.debug('ihlManager forceLobbyDraft');
        if (lobbyState.bot_id) {
            const dotaBot = this.bots[lobbyState.bot_id];
            await DotaBot.DotaBot.disconnectDotaBot(dotaBot);
        }
        await Lobby.forceLobbyDraft(lobbyState, captain_1, captain_2);
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
     */
    async onLobbyKill(lobbyState) {
        logger.debug(`ihlManager onLobbyKill ${lobbyState.id}`);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_PENDING_KILL);
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
        const league = await Db.findLeagueById(lobby.league_id);
        const inhouseState = await Ihl.createInhouseState({ league, guild: this.client.guilds.get(league.guild_id) });
        const lobbyState = await Lobby.lobbyToLobbyState({ findOrCreateChannelInCategory: Guild.findOrCreateChannelInCategory, makeRole: Guild.makeRole })(inhouseState)(lobby);
        this.eventEmitter.emit(CONSTANTS.MSG_MATCH_ENDED, lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_ENDED);
        this.eventEmitter.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_ENDED]);
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
        this.processEventQueue().catch((e) => logger.error('', e) && process.exit(1));
    }

    /**
     * Bind all lobby events to their corresponding event handler functions
     */
    attachEventHandlers() {
        logger.debug('ihlManager attachEventHandlers');
        this.eventEmitter.on(CONSTANTS.EVENT_PLAYER_READY, (lobbyState, user) => this.queueEvent(this.onPlayerReady, [lobbyState, user]));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SET_STATE, (lobbyState, state) => this.queueEvent(this.onSetLobbyState, [lobbyState, state]));
        this.eventEmitter.on(CONSTANTS.EVENT_PICK_PLAYER, (lobbyState, user, faction) => this.queueEvent(this.onDraftMember, [lobbyState, user, faction]));
        this.eventEmitter.on(CONSTANTS.EVENT_FORCE_LOBBY_DRAFT, (lobbyState, captain_1, captain_2) => this.queueEvent(this.onforceLobbyDraft, [lobbyState, captain_1, captain_2]));

        this.eventEmitter.on(CONSTANTS.EVENT_MATCH_ENDED, lobby => this.queueEvent(this.onMatchEnd, [lobby]));

        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SET_FP, async (lobbyState, cm_pick) => {
            if (lobbyState.bot_id != null) {
                const dotaBot = this.bots[lobbyState.bot_id];
                if (dotaBot) {
                    await dotaBot.configPracticeLobby({ cm_pick });
                }
            }
        });
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SET_GAMEMODE, async (lobbyState, game_mode) => {
            if (lobbyState.bot_id != null) {
                const dotaBot = this.bots[lobbyState.bot_id];
                if (dotaBot) {
                    await dotaBot.configPracticeLobby({ game_mode });
                }
            }
        });
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_SWAP_TEAMS, async lobbyState => {
            if (lobbyState.bot_id != null) {
                const dotaBot = this.bots[lobbyState.bot_id];
                if (dotaBot) {
                    await dotaBot.flipLobbyTeams();
                }
            }
        });
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_READY, lobbyState => this.queueEvent(this.onLobbyReady, [lobbyState]));
        this.eventEmitter.on(CONSTANTS.EVENT_LOBBY_KILL, (lobbyState, inhouseState) => this.queueEvent(this.onLobbyKill, [lobbyState, inhouseState]));
        this.eventEmitter.on(CONSTANTS.EVENT_RUN_LOBBY, (lobbyState, states) => this.queueEvent(this.runLobby, [lobbyState, states]));

        this.eventEmitter.on(CONSTANTS.EVENT_USER_LEFT_GUILD, user => this.queueEvent(Db.unvouchUser, [user]));
        this.eventEmitter.on(CONSTANTS.EVENT_DISCORD_MESSAGE, async (msg) => {
            const lobby = await Db.findLobbyByDiscordChannel(msg.guild.id)(msg.channel.id);
            if (lobby && lobby.bot_id != null && (lobby.state === CONSTANTS.STATE_BOT_STARTED || lobby.state === CONSTANTS.STATE_WAITING_FOR_PLAYERS)) {
                logger.debug(`EVENT_DISCORD_MESSAGE {msg.member.displayName}: ${msg.content}`);
                const dotaBot = this.bots[lobby.bot_id];
                if (dotaBot) {
                    await dotaBot.sendMessage(`${msg.member.displayName}: ${msg.content}`);
                }
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
            logger.debug('MSG_READY_CHECK_FAILED');
            logger.debug(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${notReadyPlayers.length}`);
            const users = notReadyPlayers.map(player => lobbyState.inhouseState.guild.members.get(player.discord_id).displayName).join(', ');
            logger.debug(`MSG_READY_CHECK_FAILED ${lobbyState.id} ${users}`);
            return lobbyState.channel.send(`${users} failed to ready up. Reopening queue.`).catch(console.error);
        });
        this.eventEmitter.on(CONSTANTS.MSG_PLAYERS_READY, async lobbyState => lobbyState.channel.send('All players ready.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_AUTOBALANCING, async lobbyState => lobbyState.channel.send('No suitable captain pairing. Autobalancing teams instead.').catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_ASSIGNED_CAPTAINS, async (lobbyState) => {
            const captain_1 = Lobby.getPlayerByUserId(lobbyState)(lobbyState.captain_1_user_id);
            const captain_2 = Lobby.getPlayerByUserId(lobbyState)(lobbyState.captain_2_user_id);
            const captain_member_1 = await Guild.resolveUser(lobbyState.inhouseState.guild)(captain_1.discord_id);
            const captain_member_2 = await Guild.resolveUser(lobbyState.inhouseState.guild)(captain_2.discord_id);
            return lobbyState.channel.send(`Assigned ${captain_member_1} and ${captain_member_2} as captains`).catch(console.error);
        });
        this.eventEmitter.on(CONSTANTS.MSG_DRAFT_TURN, async (lobbyState) => {
            const lobbyPlayer = await Lobby.getFactionCaptain(lobbyState)(lobbyState.faction);
            const player = await lobbyPlayer.getUser();
            const user = lobbyState.inhouseState.guild.members.get(player.discord_id);
            return lobbyState.channel.send(`${user}'s turn to draft a player. Use \`!pick @mention\``).catch(console.error);
        });
        this.eventEmitter.on(CONSTANTS.MSG_TEAMS_SELECTED, async (lobbyState) => {
            const lobby = await Lobby.getLobby(lobbyState);
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
        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_KILLED, async inhouseState => inhouseState.channel.send('Lobby killed.').catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_CHAT_MESSAGE, async (lobbyState, channel, sender_name, message) => lobbyState.channel.send(`**${sender_name}:** ${message}`).catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, async (lobbyState, member) => lobbyState.channel.send(`${member.name} joined lobby`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, async (lobbyState, member) => lobbyState.channel.send(`${member.name} left lobby`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, async (lobbyState, state) => lobbyState.channel.send(`${state.current.name} ${state.current.id} changed slot`).catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_LEFT, async (lobbyState, discordUser) => Lobby.getQueuers()(lobbyState).then(queuers => lobbyState.channel.send(`${discordUser} left queue. ${queuers.length} in queue.`).catch(console.error)));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_JOINED, async (lobbyState, discordUser) => Lobby.getQueuers()(lobbyState).then(queuers => lobbyState.channel.send(`${discordUser} joined queue. ${queuers.length} in queue.`).catch(console.error)));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_BANNED, async (lobbyState, discordUser, user) => lobbyState.channel.send(`${discordUser} banned from queuing. Remaining time: ${toHHMMSS((user.queue_timeout - Date.now()) / 1000)}.`).catch(console.error));
        this.eventEmitter.on(CONSTANTS.MSG_QUEUE_ALREADY_JOINED, async (lobbyState, discordUser) => lobbyState.channel.send(`${discordUser} already in queue or game.`).catch(console.error));

        this.eventEmitter.on(CONSTANTS.MSG_MATCH_ENDED, async (lobbyState, inhouseState) => sendMatchEndMessage(inhouseState)(lobbyState));

        this.eventEmitter.on(CONSTANTS.MSG_INHOUSE_CREATED, async inhouseState => inhouseState.channel.send('Inhouse league started.').catch(console.error));
    }
}
Object.assign(IHLManager.prototype, LobbyStateHandlers.LobbyStateHandlers);

module.exports = {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    sendMatchEndMessage,
    createClient,
    IHLManager,
};
