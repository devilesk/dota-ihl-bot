/* eslint-disable class-methods-use-this */
/**
 * @module ihlManager
 */

/**
 * Node.js EventEmitter object
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter}
 */

const Dota2 = require('dota2');
const assert = require('assert').strict;
const { GuildMember } = require('discord.js');
const Commando = require('discord.js-commando');
const Permissions = require('discord.js/src/util/Permissions.js');
const Promise = require('bluebird');
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
const equalsLong = require('./util/equalsLong');
const Guild = require('./guild');
const DotaBot = require('./dotaBot');
const LobbyStateHandlers = require('./lobbyStateHandlers');
const LobbyQueueHandlers = require('./lobbyQueueHandlers');
const EventListeners = require('./eventListeners');
const MessageListeners = require('./messageListeners');

/**
* Searches the discord guild for a member.
* @function
* @param {external:Guild} guild - A list of guilds to initialize leagues with.
* @param {string|external:GuildMember} member - A name or search string for an inhouse player or their guild member instance.
* @returns {Array} The search result in an array containing the user record, discord guild member, and type of match.
*/
const findUser = guild => async (member) => {
    let discordId;
    let discorduser;
    let user;
    let resultType;
    const discordIdMatches = `${member}`.match(/<@!?(\d+)>/);
    logger.silly(`findUser ${util.inspect(member)} ${discordIdMatches}`);
    if (discordIdMatches) {
        discordId = discordIdMatches[1];
        discorduser = guild.members.get(discordId);
        user = await Db.findUserByDiscordId(guild.id)(discordId);
        resultType = CONSTANTS.MATCH_EXACT_DISCORD_MENTION;
    }
    else {
        // check exact discord displayName match
        discorduser = guild.members.find(guildMember => guildMember.displayName.toLowerCase() === member.toLowerCase());
        if (discorduser) {
            logger.silly(`findUser matched on displayName exact ${member.toLowerCase()}`);
            discordId = discorduser.id;
            user = await Db.findUserByDiscordId(guild.id)(discordId);
            resultType = CONSTANTS.MATCH_EXACT_DISCORD_NAME;
        }
        else {
            // check exact discord username match
            discorduser = guild.members.find(guildMember => guildMember.user.username.toLowerCase() === member.toLowerCase());
            if (discorduser) {
                logger.silly(`findUser matched on username exact ${member.toLowerCase()}`);
                discordId = discorduser.id;
                user = await Db.findUserByDiscordId(guild.id)(discordId);
                resultType = CONSTANTS.MATCH_EXACT_DISCORD_NAME;
            }
            else {
                // check exact nickname match
                user = await Db.findUserByNickname(guild.id)(member);
                if (user) {
                    logger.silly(`findUser matched on user nickname exact ${user.nickname}`);
                    discordId = user.discord_id;
                    discorduser = guild.members.get(discordId);
                    resultType = CONSTANTS.MATCH_EXACT_NICKNAME;
                }
                else {
                    // try to parse a steamid_64 from text
                    const steamId64 = await Ihl.parseSteamID64(member);
                    if (steamId64 != null) {
                        user = await Db.findUserBySteamId64(guild.id)(steamId64);
                        logger.silly(`findUser matched on steamid_64 ${steamId64} ${user}`);
                    }
                    if (user) {
                        discorduser = guild.members.get(user.discord_id);
                        resultType = CONSTANTS.MATCH_STEAMID_64;
                    }
                    else {
                        // check close nickname match
                        try {
                            [user] = await Db.findUserByNicknameLevenshtein(guild.id)(member);
                            if (user) {
                                logger.silly(`findUser matched on user nickname approximate ${user.nickname}`);
                                discordId = user.discord_id;
                                discorduser = guild.members.get(discordId);
                                resultType = CONSTANTS.MATCH_CLOSEST_NICKNAME;
                            }
                        }
                        catch (e) {
                            logger.error(e);
                        }
                    }
                }
            }
        }
    }
    logger.silly(`findUser ${user ? user.id : null} ${discorduser ? discorduser.id : null} ${resultType}`);
    if (user && discorduser) {
        return [user, discorduser, resultType];
    }
    logger.silly('findUser not found');
    return [null, null, null];
};

/**
* Maps league records to inhouse states.
* @function
* @async
* @param {external:Guild[]} guilds - A list of guilds to initialize leagues with.
* @param {module:db.League[]} leagues - A list of database league records.
* @returns {module:ihl.InhouseState[]} The inhouse states loaded from league records.
*/
const loadInhouseStates = guilds => async leagues => Fp.mapPromise(Ihl.createInhouseState)(leagues.map(league => ({ league, guild: guilds.get(league.guild_id) })).filter(o => o.guild));

/**
* Gets all league records from the database turns them into inhouse states.
* @function
* @async
* @param {external:Guild[]} guilds - A list of guilds to initialize leagues with.
* @returns {module:ihl.InhouseState[]} The inhouse states loaded from all league records.
*/
const loadInhouseStatesFromLeagues = async guilds => Fp.pipeP(
    Db.findAllLeagues,
    loadInhouseStates(guilds),
)();

const createClient = options => new Commando.CommandoClient({
    commandPrefix: options.COMMAND_PREFIX || '!',
    owner: options.OWNER_DISCORD_ID,
    disableEveryone: true,
    commandEditableDuration: 0,
    unknownCommandResponse: false,
});

const setMatchPlayerDetails = match_outcome => members => async (_lobby) => {
    const lobby = await Lobby.getLobby(_lobby);
    const players = await Lobby.getPlayers()(lobby);
    let winner = 0;
    for (const player_data of members) {
        const steamid_64 = player_data.id.toString();
        const player = players.find(p => p.steamid_64 === steamid_64);
        if (player) {
            const data = {
                win: 0,
                lose: 0,
                hero_id: player_data.hero_id,
                kills: 0,
                deaths: 0,
                assists: 0,
                gpm: 0,
                xpm: 0,
            };
            if (((player_data.team === Dota2.schema.DOTA_GC_TEAM.DOTA_GC_TEAM_GOOD_GUYS)
                 && (match_outcome === Dota2.schema.EMatchOutcome.k_EMatchOutcome_RadVictory))
                || ((player_data.team === Dota2.schema.DOTA_GC_TEAM.DOTA_GC_TEAM_BAD_GUYS)
                 && (match_outcome === Dota2.schema.EMatchOutcome.k_EMatchOutcome_DireVictory))) {
                data.win = 1;
                winner = player.LobbyPlayer.faction;
            }
            else {
                data.lose = 1;
            }
            await Lobby.updateLobbyPlayerBySteamId(data)(_lobby)(steamid_64);
        }
    }
    await Db.updateLobbyWinner(lobby)(winner);
};

class IHLManager extends EventEmitter {
    /**
     * Creates an inhouse league manager.
     * @classdesc Class representing the inhouse league manager.
     */
    constructor(options) {
        super();

        this.options = options;
        this.client = null;
        this.lobbyTimeoutTimers = {};
        this.bots = {};
        this.matchTracker = null;
        this.attachListeners();
        this.eventQueue = [];
        this.blocking = false;
        this._runningLobby = false;
    }

    static get botPermissions() {
        return [
            'MANAGE_ROLES',
            'MANAGE_CHANNELS',
            'VIEW_CHANNEL',
            'SEND_MESSAGES',
            'EMBED_LINKS',
        ];
    }

    static get inviteUrl() {
        // eslint-disable-next-line no-bitwise
        return `https://discordapp.com/oauth2/authorize/?permissions=${IHLManager.botPermissions.reduce((all, p) => all | Permissions.FLAGS[p], 0)}&scope=bot&client_id=${process.env.CLIENT_ID}`;
    }

    /**
     * Initializes the inhouse league manager with a discord client and loads inhouse states for each league.
     * @async
     * @param {external:Client} client - A discord.js client.
     */
    async init(client) {
        logger.debug(`ihlManager init ${this.options.COMMAND_PREFIX}`);
        this.matchTracker = new MatchTracker.MatchTracker(parseInt(this.options.MATCH_POLL_INTERVAL || 5000));
        this.matchTracker.on(CONSTANTS.EVENT_MATCH_STATS, lobby => this.emit(CONSTANTS.EVENT_MATCH_STATS, lobby));
        this.matchTracker.on(CONSTANTS.EVENT_MATCH_NO_STATS, lobby => this.emit(CONSTANTS.EVENT_MATCH_NO_STATS, lobby));
        this.client = client;
        this.client.ihlManager = this;
        this.client.registry
            .registerDefaultTypes()
            .registerGroups([
                ['ihl', 'Inhouse League General Commands'],
                ['queue', 'Inhouse League Queue Commands'],
                ['challenge', 'Inhouse League Challenge Commands'],
                ['admin', 'Inhouse League Admin Commands'],
                ['owner', 'Bot Owner Commands'],
            ])
            .registerDefaultGroups()
            .registerDefaultCommands()
            .registerCommandsIn(path.join(__dirname, '../commands'));
        this.client.on('message', this.onDiscordMessage.bind(this));
        this.client.on('guildMemberRemove', this.onDiscordMemberLeave.bind(this));
        this.client.on('commandError', (cmd, err) => {
            if (err instanceof Commando.FriendlyError) return;
            logger.error(err);
        });
        return new Promise((resolve, reject) => {
            try {
                this.client.on('ready', async () => {
                    await this.onClientReady();
                    resolve();
                });
                this.client.login(this.options.TOKEN);
            }
            catch (e) {
                logger.error(e);
                reject(e);
            }
        });
    }

    get guilds() {
        return this.client.guilds.filter(guild => guild.me.hasPermission(IHLManager.botPermissions));
    }

    async onClientReady() {
        logger.debug(`ihlManager onClientReady logged in as ${this.client.user.tag}`);
        await Db.setAllBotsOffline();
        const inhouseStates = await loadInhouseStatesFromLeagues(this.guilds);
        logger.silly('ihlManager inhouseStates loaded');
        await Fp.mapPromise(Ihl.createLobbiesFromQueues)(inhouseStates);
        logger.silly('ihlManager created lobbies from queues');
        for (const inhouseState of inhouseStates) {
            await this.runLobbiesForInhouse(inhouseState);
        }
        await this.matchTracker.loadLobbies();
        this.matchTracker.run();
        logger.debug('ihlManager onClientReady lobbies loaded and run.');
        this.emit('ready');
    }

    async onDiscordMessage(msg) {
        if (msg.author.id !== this.client.user.id) {
            logger.silly(`ihlManager onDiscordMessage ${msg.channel.guild} ${msg.channel.id} ${msg.author.id} ${msg.content}`);
            if (msg.channel.guild) {
                this.emit(CONSTANTS.EVENT_GUILD_MESSAGE, msg);
            }
        }
    }

    async onDiscordMemberLeave(member) {
        logger.debug(`ihlManager onDiscordMemberLeave ${member}`);
        const user = await Db.findUserByDiscordId(member.guild.id)(member.id);
        if (user) {
            this.emit(CONSTANTS.EVENT_GUILD_USER_LEFT, user);
        }
    }

    async createNewLeague(guild) {
        logger.debug(`ihlManager createNewLeague ${guild.id}`);
        const inhouseState = await Ihl.createNewLeague(guild);
        await Ihl.createLobbiesFromQueues(inhouseState);
        await this.runLobbiesForInhouse(inhouseState);
    }

    async createChallengeLobby(inhouseState, captain_1, captain_2, challenge) {
        logger.debug(`ihlManager createChallengeLobby ${inhouseState.guild.id} ${captain_1.id} ${captain_2.id}`);
        const lobbyState = await Lobby.createChallengeLobby({
            inhouseState, captain_1, captain_2, challenge,
        });
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_NEW]);
    }

    /**
    * Runs all lobbies.
    * @async
    */
    async runLobbiesForInhouse(inhouseState) {
        logger.silly(`ihlManager runLobbiesForInhouse ${inhouseState.guild.id}`);
        const lobbies = await Db.findAllActiveLobbiesForInhouse(inhouseState.guild.id);
        for (const lobby of lobbies) {
            const lobbyState = await Fp.pipeP(
                Lobby.lobbyToLobbyState(inhouseState),
                Lobby.resetLobbyState,
            )(lobby);
            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [lobbyState.state]);
        }
    }

    /**
     * Adds a user to a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to queue.
     * @param {external:User} discordUser - A discord.js user.
     */
    async joinLobbyQueue(lobbyState, user, discordUser) {
        logger.silly(`ihlManager joinLobbyQueue ${lobbyState.id} ${user.id} ${discordUser.id}`);
        const result = await Ihl.joinLobbyQueue(user)(lobbyState);
        logger.silly(`ihlManager joinLobbyQueue result ${result}`);
        if (result) {
            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_WAITING_FOR_QUEUE]);
        }
        return result;
    }

    /**
     * Adds a user to all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to queue.
     * @param {module:db.User} user - The user to queue.
     * @param {external:User} discordUser - A discord.js user.
     */
    async joinAllLobbyQueues(inhouseState, user, discordUser) {
        logger.silly(`ihlManager joinAllLobbyQueues ${inhouseState.guild.id} ${user.id} ${discordUser.id}`);
        const lobbyStates = await Ihl.getAllLobbyQueues(inhouseState);
        for (const lobbyState of lobbyStates) {
            await this.joinLobbyQueue(lobbyState, user, discordUser);
        }
    }

    /**
     * Removes a user from a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to dequeue.
     * @param {external:User} discordUser - A discord.js user.
     */
    async leaveLobbyQueue(lobbyState, user, discordUser) {
        logger.silly(`ihlManager leaveLobbyQueue ${lobbyState.id} ${user.id} ${discordUser.id}`);
        const inQueue = await Ihl.leaveLobbyQueue(user)(lobbyState);
        if (inQueue) {
            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
        }
        return inQueue;
    }

    /**
     * Removes a user from all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {module:db.User} user - The user to dequeue.
     * @param {external:User} discordUser - A discord.js user.
     */
    async leaveAllLobbyQueues(inhouseState, user, discordUser) {
        logger.silly(`ihlManager leaveAllLobbyQueues ${inhouseState.guild.id} ${user.id} ${discordUser.id}`);
        const lobbyStates = await Ihl.getAllLobbyQueuesForUser(inhouseState, user);
        for (const lobbyState of lobbyStates) {
            await this.leaveLobbyQueue(lobbyState, user, discordUser);
        }
    }

    /**
     * Clear a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby queue to clear.
     */
    async clearLobbyQueue(lobbyState) {
        logger.silly(`ihlManager clearLobbyQueue ${lobbyState.id}`);
        await Db.destroyLobbyQueuers(lobbyState);
    }

    /**
     * Clear all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse queue to clear.
     */
    async clearAllLobbyQueues(inhouseState) {
        const lobbies = await Db.findAllLobbiesForInhouse(inhouseState);
        logger.silly(`ihlManager clearAllLobbyQueues ${inhouseState.guild.id} ${lobbies.length}`);
        for (const lobby of lobbies) {
            await Db.destroyLobbyQueuers(lobby);
        }
    }

    /**
     * Bans a user from the inhouse queue.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {module:db.User} user - The player to ban.
     * @param {number} timeout - Duration of ban in minutes.
     * @param {external:User} discordUser - A discord.js user.
     */
    async banInhouseQueue(inhouseState, user, timeout, discordUser) {
        logger.silly(`ihlManager banInhouseQueue ${inhouseState.guild.id} ${user.id} ${timeout} ${discordUser.id}`);
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
        logger.silly(`ihlManager runLobby ${_lobbyState.id} ${states.join(',')}`);
        let lobbyState;
        try {
            assert.equal(this._runningLobby, false, 'Already running a lobby.');
            this._runningLobby = true;
            const lobby = await Lobby.getLobby(_lobbyState);
            if (!states.length || states.indexOf(lobby.state) !== -1) {
                lobbyState = await Fp.pipeP(
                    Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState),
                    Lobby.validateLobbyPlayers,
                )(lobby);
                let beginState = -1;
                let endState = lobbyState.state;
                while (beginState !== endState) {
                    beginState = lobbyState.state;
                    lobbyState = await this[beginState](lobbyState);
                    endState = lobbyState.state;
                    logger.silly(`runLobby ${lobbyState.id} ${beginState} to ${endState}`);
                    this.emit(beginState, lobbyState); // test hook event
                }
                try {
                    await Lobby.setLobbyTopic(lobbyState);
                }
                catch (e) {
                    logger.error(e);
                }
            }
        }
        catch (e) {
            logger.error(e);
            if (lobbyState) {
                await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_FAILED);
            }
            process.exit(1);
        }
        finally {
            this._runningLobby = false;
        }
    }

    async onCreateLobbyQueue(_lobbyState) {
        logger.silly(`ihlManager onCreateLobbyQueue ${_lobbyState.id}`);
        const queue = await Db.findQueue(_lobbyState.league_id, true, _lobbyState.queue_type);
        if (queue && queue.queue_type !== CONSTANTS.QUEUE_TYPE_CHALLENGE) {
            logger.silly(`ihlManager onCreateLobbyQueue queue ${queue.queue_type}`);
            const lobbyState = await Ihl.createLobby(_lobbyState.inhouseState)(queue);
            await Guild.setChannelPosition(1)(lobbyState.channel);
            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_NEW]);
        }
    }

    async onSetLobbyState(lobbyState, state) {
        logger.silly(`ihlManager onSetLobbyState ${lobbyState.id} ${state}`);
        lobbyState.state = state;
        await Db.updateLobbyState(lobbyState)(state);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [state]);
    }

    async onSetBotStatus(steamid_64, status) {
        logger.silly(`ihlManager onSetBotStatus ${steamid_64} ${status}`);
        await Db.updateBot(steamid_64)({ status });
    }

    async onLeagueTicketAdd(league, leagueid, name) {
        const ticket = await Db.upsertTicket({ leagueid, name });
        logger.silly(`ihlManager onLeagueTicketAdd ${league.id} ${leagueid} ${name} ${util.inspect(ticket)}`);
        if (ticket) {
            await Db.addTicketOf(league)(ticket);
        }
    }

    async onLeagueTicketSet(league, leagueid) {
        const tickets = await Db.getTicketsOf({ where: { leagueid } })(league);
        logger.silly(`ihlManager onLeagueTicketSet ${league.id} ${leagueid} ${util.inspect(tickets)}`);
        if (tickets.length) {
            await Db.updateLeague(league.guild_id)({ leagueid });
            return tickets[0];
        }
        return null;
    }

    async onLeagueTicketRemove(league, leagueid) {
        const ticket = await Db.findTicketByDotaLeagueId(leagueid);
        logger.silly(`ihlManager onLeagueTicketRemove ${league.id} ${leagueid} ${util.inspect(ticket)}`);
        if (ticket) {
            await Db.removeTicketOf(league)(ticket);
        }
    }

    async onBotAvailable() {
        const lobbies = await Db.findAllLobbiesInState(CONSTANTS.STATE_WAITING_FOR_BOT);
        logger.silly(`ihlManager onBotAvailable ${lobbies.length}`);
        for (const lobby of lobbies) {
            const lobbyState = await Ihl.loadLobbyState(this.client.guilds)(lobby);
            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_WAITING_FOR_BOT]);
        }
    }

    /**
     * Creates and registers a ready up timer for a lobby state.
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    registerLobbyTimeout(lobbyState) {
        this.unregisterLobbyTimeout(lobbyState);
        const delay = Math.max(0, lobbyState.ready_check_time + lobbyState.inhouseState.ready_check_timeout - Date.now());
        logger.silly(`ihlManager registerLobbyTimeout ${lobbyState.id} ${lobbyState.ready_check_time} ${lobbyState.inhouseState.ready_check_timeout}. timeout ${delay}ms`);
        this.lobbyTimeoutTimers[lobbyState.id] = setTimeout(() => {
            logger.silly(`ihlManager registerLobbyTimeout ${lobbyState.id} timed out`);
            this.queueEvent(this.onLobbyTimedOut, [lobbyState]);
        }, delay);
        this.emit(CONSTANTS.MSG_READY_CHECK_START, lobbyState);
    }

    /**
     * Clears and unregisters the ready up timer for a lobby state.
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    unregisterLobbyTimeout(lobbyState) {
        logger.silly(`ihlManager unregisterLobbyTimeout ${lobbyState.id}`);
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
        logger.silly(`ihlManager onLobbyTimedOut ${lobbyState.id}`);
        delete this.lobbyTimeoutTimers[lobbyState.id];
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
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
        logger.silly(`ihlManager onPlayerReady ${lobbyState.id} ${user.id}`);
        await Lobby.setPlayerReady(true)(lobbyState)(user.id);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
    }

    async onSelectionPick(_lobbyState, captain, pick) {
        logger.silly(`ihlManager onSelectionPick ${_lobbyState.id} ${captain.id} ${pick}`);
        const lobby = await Lobby.getLobby(_lobbyState);
        const lobbyState = await Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState)(_lobbyState);
        if (lobby.state === CONSTANTS.STATE_SELECTION_PRIORITY && Lobby.isCaptain(lobbyState)(captain)) {
            if (!lobbyState.player_first_pick) {
                if (lobbyState[`captain_${3 - lobbyState.selection_priority}_user_id`] === captain.id) {
                    lobbyState.player_first_pick = pick === 1 ? 3 - lobbyState.selection_priority : lobbyState.selection_priority;
                    await Db.updateLobby(lobbyState);
                    this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]);
                }
            }
            else if (!lobbyState.first_pick) {
                if (!lobbyState.radiant_faction && lobbyState[`captain_${lobbyState.selection_priority}_user_id`] === captain.id) {
                    lobbyState.first_pick = pick === 1 ? lobbyState.selection_priority : 3 - lobbyState.selection_priority;
                    await Db.updateLobby(lobbyState);
                    this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]);
                }
                else if (lobbyState.radiant_faction && lobbyState[`captain_${3 - lobbyState.selection_priority}_user_id`] === captain.id) {
                    lobbyState.first_pick = pick === 1 ? 3 - lobbyState.selection_priority : lobbyState.selection_priority;
                    await Db.updateLobby(lobbyState);
                    this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]);
                }
            }
        }
    }

    async onSelectionSide(_lobbyState, captain, side) {
        logger.silly(`ihlManager onSelectionSide ${_lobbyState.id} ${captain.id} ${side}`);
        const lobby = await Lobby.getLobby(_lobbyState);
        const lobbyState = await Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState)(_lobbyState);
        if (lobby.state === CONSTANTS.STATE_SELECTION_PRIORITY && Lobby.isCaptain(lobbyState)(captain)) {
            if (lobbyState.player_first_pick) {
                if (!lobbyState.radiant_faction) {
                    if (!lobbyState.first_pick && lobbyState[`captain_${lobbyState.selection_priority}_user_id`] === captain.id) {
                        lobbyState.radiant_faction = side === 1 ? lobbyState.selection_priority : 3 - lobbyState.selection_priority;
                        await Db.updateLobby(lobbyState);
                        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]);
                    }
                    else if (lobbyState.first_pick && lobbyState[`captain_${3 - lobbyState.selection_priority}_user_id`] === captain.id) {
                        lobbyState.radiant_faction = side === 1 ? 3 - lobbyState.selection_priority : lobbyState.selection_priority;
                        await Db.updateLobby(lobbyState);
                        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]);
                    }
                }
            }
        }
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
    async onDraftMember(_lobbyState, captain, user) {
        const lobby = await Lobby.getLobby(_lobbyState);
        const lobbyState = await Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState)(_lobbyState);
        const faction = await Lobby.getDraftingFaction(lobbyState.inhouseState.draft_order)(lobbyState);
        logger.silly(`ihlManager onDraftMember ${lobbyState.id} ${lobby.state} ${faction} ${captain.id} ${Lobby.isFactionCaptain(lobbyState)(faction)(captain)}`);
        if (lobby.state === CONSTANTS.STATE_DRAFTING_PLAYERS && Lobby.isFactionCaptain(lobbyState)(faction)(captain)) {
            const player = await Lobby.getPlayerByUserId(lobbyState)(user.id);
            if (player) {
                const result = await Lobby.isPlayerDraftable(lobbyState)(player);
                logger.silly(`ihlManager onDraftMember draftable ${result}`);
                if (result === CONSTANTS.PLAYER_DRAFTED) {
                    await Lobby.setPlayerFaction(faction)(lobbyState)(user.id);
                    this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_DRAFTING_PLAYERS]);
                }
                return result;
            }
            return CONSTANTS.INVALID_PLAYER_NOT_FOUND;
        }
        return null;
    }

    /**
     * Event setting lobby into a player draft state.
     *
     * @event module:ihlManager~EVENT_LOBBY_FORCE_DRAFT
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
     */
    async onforceLobbyDraft(lobbyState, captain_1, captain_2) {
        logger.silly(`ihlManager onforceLobbyDraft ${captain_1.id} ${captain_2.id}`);
        if (lobbyState.bot_id) {
            await this.botLeaveLobby(lobbyState);
            await Lobby.unassignBotFromLobby(lobbyState);
        }
        await Lobby.forceLobbyDraft(lobbyState, captain_1, captain_2);
        await Db.updateLobby(lobbyState);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
    }

    /**
     * Kicks a player from the dota lobby.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - The player to kick
     */
    async onLobbyKick(lobbyState, user) {
        logger.silly(`ihlManager onLobbyKick ${lobbyState.id} ${user.id} ${lobbyState.bot_id} ${user.steamid_64}`);
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            DotaBot.kickPlayer(dotaBot)(user);
        }
    }

    /**
     * Invites a player to the dota lobby.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - The player to invite
     */
    async onLobbyInvite(lobbyState, user) {
        logger.silly(`ihlManager onLobbyInvite ${lobbyState.id} ${user.id} ${lobbyState.bot_id} ${user.steamid_64}`);
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            DotaBot.invitePlayer(dotaBot)(user);
        }
    }

    /**
     * Runs a lobby state when the lobby is ready (all players have joined and are in the right team slot).
     * Checks for STATE_WAITING_FOR_PLAYERS lobby state
     * @async
     * @param {string} lobby_id - A dota lobby id.
     */
    async onLobbyReady(lobby_id) {
        const lobby = await Db.findLobbyByLobbyId(lobby_id);
        logger.silly(`ihlManager onLobbyReady ${lobby_id} ${lobby.id}`);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobby, [CONSTANTS.STATE_WAITING_FOR_PLAYERS]);
    }

    /**
     * Puts a lobby state in STATE_PENDING_KILL and runs lobby.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    async onLobbyKill(lobbyState) {
        logger.silly(`ihlManager onLobbyKill ${lobbyState.id}`);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_PENDING_KILL);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_PENDING_KILL]);
    }

    /**
     * Handles match signed out bot event.
     * Updates STATE_MATCH_IN_PROGRESS lobby state to STATE_MATCH_ENDED
     * @async
     * @param {number} match_id - A dota match id.
     */
    async onMatchSignedOut(match_id) {
        const lobbyState = await Ihl.loadLobbyStateFromMatchId(this.client.guilds)(match_id.toString());
        logger.silly(`ihlManager onMatchSignedOut ${match_id} ${lobbyState.id} ${lobbyState.state}`);
        if (lobbyState.state === CONSTANTS.STATE_MATCH_IN_PROGRESS) {
            await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_ENDED);
            logger.silly('ihlManager onMatchSignedOut state set to STATE_MATCH_ENDED');
            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_ENDED]);
        }
        await this.botLeaveLobby(lobbyState);
        await Lobby.unassignBotFromLobby(lobbyState);
    }

    /**
     * Handles match outcome bot event.
     * Updates lobby winner and player stats.
     * Sends match stats message.
     * Puts lobby into STATE_MATCH_STATS state
     * @async
     * @param {string} lobby_id - A dota lobby id.
     * @param {external:Dota2.schema.EMatchOutcome} match_outcome - The dota match outcome
     */
    async onMatchOutcome(lobby_id, match_outcome, members) {
        const lobbyState = await Ihl.loadLobbyStateFromLobbyId(this.client.guilds)(lobby_id);
        logger.silly(`ihlManager onMatchOutcome ${lobby_id} ${match_outcome} ${lobbyState.id}`);
        await setMatchPlayerDetails(match_outcome)(members)(lobbyState);
        this.emit(CONSTANTS.MSG_MATCH_STATS, lobbyState, lobbyState.inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_STATS);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_STATS]);
    }

    /**
     * Handles match tracker match stats event.
     * Sends match stats message.
     * Puts lobby into STATE_MATCH_STATS state
     * @async
     * @param {module:db.Lobby} lobby - A lobby database model
     */
    async onMatchStats(lobby) {
        logger.silly(`ihlManager onMatchStats ${lobby.id}`);
        const league = await Db.findLeagueById(lobby.league_id);
        const inhouseState = await Ihl.createInhouseState({ league, guild: this.client.guilds.get(league.guild_id) });
        const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
        this.emit(CONSTANTS.MSG_MATCH_STATS, lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_STATS);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_STATS]);
    }

    /**
     * Handles match tracker match no stats event.
     * Sends match no stats message.
     * Puts lobby into STATE_MATCH_NO_STATS state
     * @async
     * @param {module:db.Lobby} lobby - A lobby database model
     */
    async onMatchNoStats(lobby) {
        logger.silly(`ihlManager onMatchNoStats ${lobby.id}`);
        const league = await Db.findLeagueById(lobby.league_id);
        const inhouseState = await Ihl.createInhouseState({ league, guild: this.client.guilds.get(league.guild_id) });
        const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
        this.emit(CONSTANTS.MSG_MATCH_NO_STATS, lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_NO_STATS);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_NO_STATS]);
    }

    /**
     * Processes the inhouse manager event queue until it is empty.
     * Events are actions to perform (mostly on lobby states or something that resolves to a lobby state).
     * An event consists of a function, the arguments to call it with,
     * and the resolve and reject callbacks of the Promise wrapping the action.
     * When the action is executed, resolve with the returned value
     * or reject if an error was thrown.
     * The queue blocks while processing an action, so only 1 can be processed at a time.
     * @async
     */
    async processEventQueue() {
        if (this.blocking) return;
        if (this.eventQueue.length) {
            this.blocking = true;
            const [fn, args, resolve, reject] = this.eventQueue.shift();
            logger.silly(`ihlManager processEventQueue ${fn.name} ${this.eventQueue.length}`);
            try {
                const value = await fn.apply(this, args);
                resolve(value);
            }
            catch (e) {
                logger.error(e);
                reject(e);
            }
            this.blocking = false;
            if (this.eventQueue.length) {
                await this.processEventQueue();
            }
            else {
                this.emit('empty'); // test hook event
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
    async queueEvent(fn, args = []) {
        logger.silly(`ihlManager queueEvent ${fn.name} ${args}`);
        return new Promise((resolve, reject) => {
            this.eventQueue.push([fn, args, resolve, reject]);
            this.processEventQueue().catch(e => logger.error(e) && process.exit(1));
        });
    }

    getBot(botId) {
        logger.silly(`ihlManager getBot ${botId}`);
        return botId != null ? this.bots[botId] : null;
    }

    async loadBot(botId) {
        logger.silly(`ihlManager loadBot ${botId}`);
        let dotaBot = this.getBot(botId);
        if (!dotaBot) {
            await Db.updateBotStatus(CONSTANTS.BOT_LOADING)(botId);
            try {
                dotaBot = await Fp.pipeP(
                    Db.findBot,
                    DotaBot.createDotaBot,
                    DotaBot.connectDotaBot,
                )(botId);
                dotaBot.on(CONSTANTS.MSG_CHAT_MESSAGE, (channel, sender_name, message, chatData) => this.emit(CONSTANTS.MSG_CHAT_MESSAGE, dotaBot.lobby_id.toString(), channel, sender_name, message, chatData));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, member => this.emit(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, dotaBot.lobby_id.toString(), member));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, member => this.emit(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, dotaBot.lobby_id.toString(), member));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, state => this.emit(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, dotaBot.lobby_id.toString(), state));
                dotaBot.on(CONSTANTS.EVENT_LOBBY_READY, () => this.emit(CONSTANTS.EVENT_LOBBY_READY, dotaBot.lobby_id.toString()));
                dotaBot.on(CONSTANTS.EVENT_MATCH_SIGNEDOUT, match_id => this.emit(CONSTANTS.EVENT_MATCH_SIGNEDOUT, match_id));
                dotaBot.on(CONSTANTS.EVENT_MATCH_OUTCOME, (lobby_id, match_outcome, members) => this.emit(CONSTANTS.EVENT_MATCH_OUTCOME, lobby_id.toString(), match_outcome, members));
                this.bots[botId] = dotaBot;
                logger.silly('ihlManager loadBot loaded');
            }
            catch (e) {
                logger.error(e);
                await Db.updateBotStatus(CONSTANTS.BOT_FAILED)(botId);
                return null;
            }
        }
        logger.silly('ihlManager loadBot done');
        return dotaBot;
    }

    async removeBot(botId) {
        logger.silly(`ihlManager removeBot ${botId}`);
        const dotaBot = this.get(botId);
        if (dotaBot) {
            try {
                delete this.bots[botId];
                await DotaBot.disconnectDotaBot(dotaBot);
                logger.silly('ihlManager removeBot removed');
            }
            catch (e) {
                logger.error(e);
                await Db.updateBotStatus(CONSTANTS.BOT_FAILED)(botId);
            }
        }
    }

    async botLeaveLobby(lobbyState) {
        logger.silly(`ihlManager botLeaveLobby ${lobbyState.id}`);
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            if (equalsLong(lobbyState.lobby_id, dotaBot.lobby_id)) {
                await dotaBot.leavePracticeLobby();
                await dotaBot.abandonCurrentGame();
                await Db.updateBotStatus(CONSTANTS.BOT_IDLE)(lobbyState.bot_id);
                logger.silly(`ihlManager botLeaveLobby bot ${lobbyState.bot_id} left lobby ${lobbyState.lobby_id}`);
                const lobbyStates = await Fp.mapPromise(Ihl.loadLobbyState(this.client.guilds))(Db.findAllLobbiesInState(CONSTANTS.STATE_WAITING_FOR_BOT));
                for (const _lobbyState of lobbyStates) {
                    this.emit(CONSTANTS.EVENT_RUN_LOBBY, _lobbyState, [CONSTANTS.STATE_WAITING_FOR_BOT]);
                }
            }
        }
    }

    async onStartDotaLobby(lobbyState, _dotaBot) {
        logger.silly(`ihlManager onStartDotaLobby ${lobbyState.id} ${lobbyState.bot_id} ${lobbyState.state}`);
        if (lobbyState.state !== CONSTANTS.STATE_WAITING_FOR_PLAYERS) return false;
        const dotaBot = _dotaBot || this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
            lobbyState.started_at = Date.now();
            lobbyState.match_id = await DotaBot.startDotaLobby(dotaBot);
            logger.silly(`ihlManager onStartDotaLobby match_id ${lobbyState.match_id} leagueid ${lobbyState.leagueid}`);
            if (lobbyState.leagueid) {
                await this.botLeaveLobby(lobbyState);
            }
            await Lobby.removeQueuers(lobbyState);
            await Db.updateLobby(lobbyState);
            this.matchTracker.addLobby(lobbyState);
            this.matchTracker.run();
            this.emit(CONSTANTS.MSG_LOBBY_STARTED, lobbyState);
            logger.silly('ihlManager onStartDotaLobby true');
            return true;
        }
        logger.silly('ihlManager onStartDotaLobby false');
        return false;
    }

    /**
     * Bind all events to their corresponding event handler functions
     */
    attachListeners() {
        for (const eventName of Object.keys(CONSTANTS)) {
            if (eventName.startsWith('EVENT_') || eventName.startsWith('MSG_')) {
                this.on(CONSTANTS[eventName], this[eventName].bind(this));
            }
        }
    }
}
Object.assign(IHLManager.prototype, LobbyStateHandlers.LobbyStateHandlers({
    DotaBot, Db, Guild, Lobby, MatchTracker, LobbyQueueHandlers,
}));
Object.assign(IHLManager.prototype, EventListeners({ Db }));
Object.assign(IHLManager.prototype, MessageListeners({
    Db, Guild, Lobby, MatchTracker, Ihl,
}));

module.exports = {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    createClient,
    setMatchPlayerDetails,
    IHLManager,
};
