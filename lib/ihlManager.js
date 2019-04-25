/* eslint-disable class-methods-use-this */
/**
 * @module ihlManager
 */

/**
 * Node.js EventEmitter object
 * @external EventEmitter
 * @category Other
 * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter}
 */

const Dota2 = require('dota2');
const assert = require('assert').strict;
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
                    discordId = user.discordId;
                    discorduser = guild.members.get(discordId);
                    resultType = CONSTANTS.MATCH_EXACT_NICKNAME;
                }
                else {
                    // try to parse a steamId64 from text
                    const steamId64 = await Ihl.parseSteamID64(member);
                    if (steamId64 != null) {
                        user = await Db.findUserBySteamId64(guild.id)(steamId64);
                        logger.silly(`findUser matched on steamId64 ${steamId64} ${user}`);
                    }
                    if (user) {
                        discorduser = guild.members.get(user.discordId);
                        resultType = CONSTANTS.MATCH_STEAMID_64;
                    }
                    else {
                        // check close nickname match
                        try {
                            [user] = await Db.findUserByNicknameLevenshtein(guild.id)(member);
                            if (user) {
                                logger.silly(`findUser matched on user nickname approximate ${user.nickname}`);
                                discordId = user.discordId;
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
const loadInhouseStates = guilds => async leagues => Fp.mapPromise(Ihl.createInhouseState)(leagues.map(league => ({ league, guild: guilds.get(league.guildId) })).filter(o => o.guild));

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

const setMatchPlayerDetails = matchOutcome => members => async (_lobby) => {
    const lobby = await Lobby.getLobby(_lobby);
    const players = await Lobby.getPlayers()(lobby);
    let winner = 0;
    const tasks = [];
    for (const playerData of members) {
        const steamId64 = playerData.id.toString();
        const player = players.find(p => p.steamId64 === steamId64);
        if (player) {
            const data = {
                win: 0,
                lose: 0,
                heroId: playerData.hero_id,
                kills: 0,
                deaths: 0,
                assists: 0,
                gpm: 0,
                xpm: 0,
            };
            if (((playerData.team === Dota2.schema.DOTA_GC_TEAM.DOTA_GC_TEAM_GOOD_GUYS)
                 && (matchOutcome === Dota2.schema.EMatchOutcome.k_EMatchOutcome_RadVictory))
                || ((playerData.team === Dota2.schema.DOTA_GC_TEAM.DOTA_GC_TEAM_BAD_GUYS)
                 && (matchOutcome === Dota2.schema.EMatchOutcome.k_EMatchOutcome_DireVictory))) {
                data.win = 1;
                winner = player.LobbyPlayer.faction;
            }
            else {
                data.lose = 1;
            }
            tasks.push(Lobby.updateLobbyPlayerBySteamId(data)(_lobby)(steamId64));
        }
    }
    await Fp.allPromise(tasks);
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
        this.matchTracker.on(CONSTANTS.EVENT_MATCH_STATS, lobby => this[CONSTANTS.EVENT_MATCH_STATS](lobby).catch(e => logger.error(e)));
        this.matchTracker.on(CONSTANTS.EVENT_MATCH_NO_STATS, lobby => this[CONSTANTS.EVENT_MATCH_NO_STATS](lobby).catch(e => logger.error(e)));
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


    /**
     * IHLManager ready event.
     *
     * @event module:ihlManager~ready
     */

    /**
    * Discord client ready handler.
    * @async
    * @fires module:ihlManager~ready
    */
    async onClientReady() {
        logger.debug(`ihlManager onClientReady logged in as ${this.client.user.tag}`);
        await Db.setAllBotsOffline();
        const inhouseStates = await loadInhouseStatesFromLeagues(this.guilds);
        logger.silly('ihlManager inhouseStates loaded');
        await Fp.mapPromise(Ihl.createLobbiesFromQueues)(inhouseStates);
        logger.silly('ihlManager created lobbies from queues');
        await Fp.mapPromise(this.runLobbiesForInhouse.bind(this))(inhouseStates);
        await this.matchTracker.loadLobbies();
        this.matchTracker.run();
        logger.debug('ihlManager onClientReady lobbies loaded and run.');
        this.emit('ready');
    }

    /**
    * Discord message handler.
    * @async
    * @param {external:discordjs.Message}  msg - The discord message.
    */
    async onDiscordMessage(msg) {
        if (msg.author.id !== this.client.user.id) {
            logger.silly(`ihlManager onDiscordMessage ${msg.channel.guild} ${msg.channel.id} ${msg.author.id} ${msg.content}`);
            if (msg.channel.guild) {
                this[CONSTANTS.EVENT_GUILD_MESSAGE](msg).catch(e => logger.error(e));
            }
        }
    }

    /**
    * Discord user left guild handler.
    * @async
    * @param {external:discordjs.GuildMember} member - The member that left.
    */
    async onDiscordMemberLeave(member) {
        logger.debug(`ihlManager onDiscordMemberLeave ${member}`);
        const user = await Db.findUserByDiscordId(member.guild.id)(member.id);
        if (user) {
            this[CONSTANTS.EVENT_GUILD_USER_LEFT](user).catch(e => logger.error(e));
        }
    }

    /**
     * Creates a new inhouse in a discord guild.
     * @async
     * @param {external:discordjs.Guild} guild - The discord guild for the inhouse.
     */
    async createNewLeague(guild) {
        logger.debug(`ihlManager createNewLeague ${guild.id}`);
        const inhouseState = await Ihl.createNewLeague(guild);
        await Ihl.createLobbiesFromQueues(inhouseState);
        await this.runLobbiesForInhouse(inhouseState);
    }

    /**
     * Creates and runs a challenge lobby.
     * @async
     * @param {module:ihl.inhouseState} inhouseState - The inhouse state.
     * @param {module:db.User} captain1 - The first lobby captain.
     * @param {module:db.User} captain2 - The second lobby captain.
     * @param {module:db.Challenge} challenge - The challenge between the two captains.
     */
    async createChallengeLobby(inhouseState, captain1, captain2, challenge) {
        logger.debug(`ihlManager createChallengeLobby ${inhouseState.guild.id} ${captain1.id} ${captain2.id}`);
        const lobbyState = await Lobby.createChallengeLobby({ inhouseState, captain1, captain2, challenge });
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_NEW]).catch(e => logger.error(e));
    }

    /**
    * Runs all lobbies for an inhouse.
    * @async
    * @param {module:ihl.inhouseState} inhouseState - The inhouse state.
    */
    async runLobbiesForInhouse(inhouseState) {
        logger.silly(`ihlManager runLobbiesForInhouse ${inhouseState.guild.id}`);
        const lobbies = await Db.findAllActiveLobbiesForInhouse(inhouseState.guild.id);
        return Fp.allPromise(lobbies.map(lobby => Fp.pipeP(
            Lobby.lobbyToLobbyState(inhouseState),
            Lobby.resetLobbyState,
        )(lobby).then((lobbyState) => {
            this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [lobbyState.state]).catch(e => logger.error(e));
        })));
    }

    /**
     * Adds a user to a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to queue.
     * @param {external:discordjs.User} discordUser - A discord.js user.
     */
    async joinLobbyQueue(lobbyState, user, discordUser) {
        logger.silly(`ihlManager joinLobbyQueue ${lobbyState.id} ${user.id} ${discordUser.id}`);
        const result = await Ihl.joinLobbyQueue(user)(lobbyState);
        logger.silly(`ihlManager joinLobbyQueue result ${result}`);
        if (result) {
            this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_WAITING_FOR_QUEUE]).catch(e => logger.error(e));
        }
        return result;
    }

    /**
     * Adds a user to all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to queue.
     * @param {module:db.User} user - The user to queue.
     * @param {external:discordjs.User} discordUser - A discord.js user.
     */
    async joinAllLobbyQueues(inhouseState, user, discordUser) {
        logger.silly(`ihlManager joinAllLobbyQueues ${inhouseState.guild.id} ${user.id} ${discordUser.id}`);
        const lobbyStates = await Ihl.getAllLobbyQueues(inhouseState);
        await Fp.allPromise(lobbyStates.map(lobbyState => this.joinLobbyQueue(lobbyState, user, discordUser)));
    }

    /**
     * Removes a user from a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby to join.
     * @param {module:db.User} user - The user to dequeue.
     * @param {external:discordjs.User} discordUser - A discord.js user.
     */
    async leaveLobbyQueue(lobbyState, user, discordUser) {
        logger.silly(`ihlManager leaveLobbyQueue ${lobbyState.id} ${user.id} ${discordUser.id}`);
        const inQueue = await Ihl.leaveLobbyQueue(user)(lobbyState);
        if (inQueue) {
            this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState).catch(e => logger.error(e));
        }
        return inQueue;
    }

    /**
     * Removes a user from all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {module:db.User} user - The user to dequeue.
     * @param {external:discordjs.User} discordUser - A discord.js user.
     */
    async leaveAllLobbyQueues(inhouseState, user, discordUser) {
        logger.silly(`ihlManager leaveAllLobbyQueues ${inhouseState.guild.id} ${user.id} ${discordUser.id}`);
        const lobbyStates = await Ihl.getAllLobbyQueuesForUser(inhouseState, user);
        await Fp.allPromise(lobbyStates.map(lobbyState => this.leaveLobbyQueue(lobbyState, user, discordUser)));
    }

    /**
     * Clear a lobby queue.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - The lobby queue to clear.
     */
    async clearLobbyQueue(lobbyState) {
        logger.silly(`ihlManager clearLobbyQueue ${lobbyState.id}`);
        await Db.destroyLobbyQueuers(lobbyState);
        await Lobby.setLobbyTopic(lobbyState);
    }

    /**
     * Clear all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse queue to clear.
     */
    async clearAllLobbyQueues(inhouseState) {
        const lobbies = await Db.findAllLobbiesForInhouse(inhouseState);
        logger.silly(`ihlManager clearAllLobbyQueues ${inhouseState.guild.id} ${lobbies.length}`);
        await Fp.mapPromise(Db.destroyLobbyQueuers)(lobbies);
        const lobbyStates = await Fp.mapPromise(Ihl.loadLobbyState(this.client.guilds))(lobbies);
        await Fp.mapPromise(Lobby.setLobbyTopic)(lobbyStates);
    }

    /**
     * Bans a user from the inhouse queue.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {module:db.User} user - The player to ban.
     * @param {number} timeout - Duration of ban in minutes.
     * @param {external:discordjs.User} discordUser - A discord.js user.
     */
    async banInhouseQueue(inhouseState, user, timeout, discordUser) {
        logger.silly(`ihlManager banInhouseQueue ${inhouseState.guild.id} ${user.id} ${timeout} ${discordUser.id}`);
        await Ihl.banInhouseQueue(user, timeout);
        await this.leaveAllLobbyQueues(inhouseState, user, discordUser);
    }

    /**
     * Creates and registers a ready up timer for a lobby state.
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    registerLobbyTimeout(lobbyState) {
        this.unregisterLobbyTimeout(lobbyState);
        const delay = Math.max(0, lobbyState.readyCheckTime + lobbyState.inhouseState.readyCheckTimeout - Date.now());
        logger.silly(`ihlManager registerLobbyTimeout ${lobbyState.id} ${lobbyState.readyCheckTime} ${lobbyState.inhouseState.readyCheckTimeout}. timeout ${delay}ms`);
        this.lobbyTimeoutTimers[lobbyState.id] = setTimeout(() => {
            logger.silly(`ihlManager registerLobbyTimeout ${lobbyState.id} timed out`);
            this.queueEvent(this.onLobbyTimedOut, [lobbyState]);
        }, delay);
        this[CONSTANTS.MSG_READY_CHECK_START](lobbyState).catch(e => logger.error(e));
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
                    // eslint-disable-next-line no-await-in-loop
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

    /**
     * Creates a queue lobby.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - The lobby state to create the queue from.
     */
    async onCreateLobbyQueue(_lobbyState) {
        logger.silly(`ihlManager onCreateLobbyQueue ${_lobbyState.id}`);
        const queue = await Db.findQueue(_lobbyState.leagueId, true, _lobbyState.queueType);
        if (queue && queue.queueType !== CONSTANTS.QUEUE_TYPE_CHALLENGE) {
            logger.silly(`ihlManager onCreateLobbyQueue queue ${queue.queueType}`);
            const lobbyState = await Ihl.createLobby(_lobbyState.inhouseState)(queue);
            await Guild.setChannelPosition(1)(lobbyState.channel);
            this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_NEW]).catch(e => logger.error(e));
        }
    }

    /**
     * Sets a lobby state.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - The lobby state being changed.
     * @param {string} state - The state to set the lobby to.
     */
    async onSetLobbyState(_lobbyState, state) {
        logger.silly(`ihlManager onSetLobbyState ${_lobbyState.id} ${state}`);
        const lobbyState = { ..._lobbyState, state };
        await Db.updateLobbyState(lobbyState)(state);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [state]).catch(e => logger.error(e));
    }

    /**
     * Sets a bot status.
     * @async
     * @param {string} steamId64 - Bot steam id.
     * @param {string} status - Bot status.
     */
    async onSetBotStatus(steamId64, status) {
        logger.silly(`ihlManager onSetBotStatus ${steamId64} ${status}`);
        await Db.updateBot(steamId64)({ status });
    }

    /**
     * Associates a league with a ticket.
     * @async
     * @param {module:db.League} league - The league to add the ticket to.
     * @param {number} leagueid - The ticket league id.
     * @param {string} name - The ticket name.
     */
    async onLeagueTicketAdd(league, leagueid, name) {
        const ticket = await Db.upsertTicket({ leagueid, name });
        logger.silly(`ihlManager onLeagueTicketAdd ${league.id} ${leagueid} ${name} ${util.inspect(ticket)}`);
        if (ticket) {
            await Db.addTicketOf(league)(ticket);
        }
    }

    /**
     * Sets the league ticket.
     * @async
     * @param {module:db.League} league - The league to set the ticket to.
     * @param {number} leagueid - The ticket league id.
     * @returns {module:db.Ticket}
     */
    async onLeagueTicketSet(league, leagueid) {
        const tickets = await Db.getTicketsOf({ where: { leagueid } })(league);
        logger.silly(`ihlManager onLeagueTicketSet ${league.id} ${leagueid} ${util.inspect(tickets)}`);
        if (tickets.length) {
            await Db.updateLeague(league.guildId)({ leagueid });
            return tickets[0];
        }
        return null;
    }

    /**
     * Removes a ticket from a league.
     * @async
     * @param {module:db.League} league - The league to remove the ticket from.
     * @param {number} leagueid - The ticket league id.
     */
    async onLeagueTicketRemove(league, leagueid) {
        const ticket = await Db.findTicketByDotaLeagueId(leagueid);
        logger.silly(`ihlManager onLeagueTicketRemove ${league.id} ${leagueid} ${util.inspect(ticket)}`);
        if (ticket) {
            await Db.removeTicketOf(league)(ticket);
        }
    }

    /**
     * Runs lobbies waiting for bots.
     * @async
     */
    async onBotAvailable() {
        const lobbies = await Db.findAllLobbiesInState(CONSTANTS.STATE_WAITING_FOR_BOT);
        logger.silly(`ihlManager onBotAvailable ${lobbies.length}`);
        const lobbyStates = await Fp.mapPromise(Ihl.loadLobbyState(this.client.guilds))(lobbies);
        lobbyStates.forEach(lobbyState => this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_WAITING_FOR_BOT]).catch(e => logger.error(e)));
    }

    /**
     * Set bot idle then call onBotAvailable to run lobbies waiting for bots.
     * @async
     */
    async onBotLobbyLeft(botId) {
        await Db.updateBotStatus(CONSTANTS.BOT_IDLE)(botId);
        return this.onBotAvailable();
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
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_CHECKING_READY]).catch(e => logger.error(e));
    }

    /**
     * Runs a lobby state when a player has readied up and update their player ready state.
     * Checks for STATE_CHECKING_READY lobby state
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - An inhouse user.
     */
    async onPlayerReady(lobbyState, user) {
        logger.silly(`ihlManager onPlayerReady ${lobbyState.id} ${user.id}`);
        await Lobby.setPlayerReady(true)(lobbyState)(user.id);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_CHECKING_READY]).catch(e => logger.error(e));
    }

    /**
     * Updates a lobby state with a captain pick selection
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {module:db.User} captain - The captain user
     * @param {number} pick - The selected pick
     */
    async onSelectionPick(_lobbyState, captain, pick) {
        logger.silly(`ihlManager onSelectionPick ${_lobbyState.id} ${captain.id} ${pick}`);
        const lobby = await Lobby.getLobby(_lobbyState);
        const lobbyState = await Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState)(_lobbyState);
        if (lobby.state === CONSTANTS.STATE_SELECTION_PRIORITY && Lobby.isCaptain(lobbyState)(captain)) {
            if (!lobbyState.playerFirstPick) {
                if (lobbyState[`captain${3 - lobbyState.selectionPriority}UserId`] === captain.id) {
                    lobbyState.playerFirstPick = pick === 1 ? 3 - lobbyState.selectionPriority : lobbyState.selectionPriority;
                    await Db.updateLobby(lobbyState);
                    this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]).catch(e => logger.error(e));
                }
            }
            else if (!lobbyState.firstPick) {
                if (!lobbyState.radiantFaction && lobbyState[`captain${lobbyState.selectionPriority}UserId`] === captain.id) {
                    lobbyState.firstPick = pick === 1 ? lobbyState.selectionPriority : 3 - lobbyState.selectionPriority;
                    await Db.updateLobby(lobbyState);
                    this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]).catch(e => logger.error(e));
                }
                else if (lobbyState.radiantFaction && lobbyState[`captain${3 - lobbyState.selectionPriority}UserId`] === captain.id) {
                    lobbyState.firstPick = pick === 1 ? 3 - lobbyState.selectionPriority : lobbyState.selectionPriority;
                    await Db.updateLobby(lobbyState);
                    this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]).catch(e => logger.error(e));
                }
            }
        }
    }

    /**
     * Updates a lobby state with a captain side selection
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     * @param {module:db.User} captain - The captain user
     * @param {number} side - The selected faction
     */
    async onSelectionSide(_lobbyState, captain, side) {
        logger.silly(`ihlManager onSelectionSide ${_lobbyState.id} ${captain.id} ${side}`);
        const lobby = await Lobby.getLobby(_lobbyState);
        const lobbyState = await Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState)(_lobbyState);
        if (lobby.state === CONSTANTS.STATE_SELECTION_PRIORITY && Lobby.isCaptain(lobbyState)(captain)) {
            if (lobbyState.playerFirstPick) {
                if (!lobbyState.radiantFaction) {
                    if (!lobbyState.firstPick && lobbyState[`captain${lobbyState.selectionPriority}UserId`] === captain.id) {
                        lobbyState.radiantFaction = side === 1 ? lobbyState.selectionPriority : 3 - lobbyState.selectionPriority;
                        await Db.updateLobby(lobbyState);
                        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]).catch(e => logger.error(e));
                    }
                    else if (lobbyState.firstPick && lobbyState[`captain${3 - lobbyState.selectionPriority}UserId`] === captain.id) {
                        lobbyState.radiantFaction = side === 1 ? 3 - lobbyState.selectionPriority : lobbyState.selectionPriority;
                        await Db.updateLobby(lobbyState);
                        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_SELECTION_PRIORITY]).catch(e => logger.error(e));
                    }
                }
            }
        }
    }

    /**
     * Checks if a player is draftable and fires an event representing the result.
     * If the player is draftable, checks for STATE_DRAFTING_PLAYERS lobby state and runs the lobby state.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - The picked user
     * @param {number} faction - The picking faction
     */
    async onDraftMember(_lobbyState, captain, user) {
        const lobby = await Lobby.getLobby(_lobbyState);
        const lobbyState = await Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState)(_lobbyState);
        const faction = await Lobby.getDraftingFaction(lobbyState.inhouseState.draftOrder)(lobbyState);
        logger.silly(`ihlManager onDraftMember ${lobbyState.id} ${lobby.state} ${faction} ${captain.id} ${Lobby.isFactionCaptain(lobbyState)(faction)(captain)}`);
        if (lobby.state === CONSTANTS.STATE_DRAFTING_PLAYERS && Lobby.isFactionCaptain(lobbyState)(faction)(captain)) {
            const player = await Lobby.getPlayerByUserId(lobbyState)(user.id);
            if (player) {
                const result = await Lobby.isPlayerDraftable(lobbyState)(player);
                logger.silly(`ihlManager onDraftMember draftable ${result}`);
                if (result === CONSTANTS.PLAYER_DRAFTED) {
                    await Lobby.setPlayerFaction(faction)(lobbyState)(user.id);
                    this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_DRAFTING_PLAYERS]).catch(e => logger.error(e));
                }
                return result;
            }
            return CONSTANTS.INVALID_PLAYER_NOT_FOUND;
        }
        return null;
    }

    /**
     * Force lobby into player draft with assigned captains.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} captain1 - The captain 1 user
     * @param {module:db.User} captain2 - The captain 2 user
     */
    async onForceLobbyDraft(lobbyState, captain1, captain2) {
        logger.silly(`ihlManager onForceLobbyDraft ${captain1.id} ${captain2.id}`);
        if (lobbyState.botId) {
            await this.botLeaveLobby(lobbyState);
            await Lobby.unassignBotFromLobby(lobbyState);
        }
        await Lobby.forceLobbyDraft(lobbyState, captain1, captain2);
        await Db.updateLobby(lobbyState);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState).catch(e => logger.error(e));
    }

    /**
     * Start a dota lobby if all players are in the lobby and on the correct teams.
     * @param {module:lobby.lobbyState} _lobbyState - The lobby state to check.
     * @param {module:lobby.lobbyState} _dotaBot - The bot to check.
     * @returns {module:lobby.lobbyState}
     */
    async onStartDotaLobby(_lobbyState, _dotaBot) {
        const lobbyState = { ..._lobbyState };
        logger.silly(`ihlManager onStartDotaLobby ${lobbyState.id} ${lobbyState.botId} ${lobbyState.state}`);
        if (lobbyState.state !== CONSTANTS.STATE_WAITING_FOR_PLAYERS) return false;
        const dotaBot = _dotaBot || this.getBot(lobbyState.botId);
        if (dotaBot) {
            lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
            lobbyState.startedAt = Date.now();
            lobbyState.matchId = await DotaBot.startDotaLobby(dotaBot);
            logger.silly(`ihlManager onStartDotaLobby matchId ${lobbyState.matchId} leagueid ${lobbyState.leagueid}`);
            if (lobbyState.leagueid) {
                await this.botLeaveLobby(lobbyState);
            }
            await Lobby.removeQueuers(lobbyState);
            await Db.updateLobby(lobbyState);
            this.matchTracker.addLobby(lobbyState);
            this.matchTracker.run();
            this[CONSTANTS.MSG_LOBBY_STARTED](lobbyState);
            logger.silly('ihlManager onStartDotaLobby true');
        }
        logger.silly('ihlManager onStartDotaLobby false');
        return lobbyState;
    }

    /**
     * Kicks a player from the dota lobby.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     * @param {module:db.User} user - The player to kick
     */
    async onLobbyKick(lobbyState, user) {
        logger.silly(`ihlManager onLobbyKick ${lobbyState.id} ${user.id} ${lobbyState.botId} ${user.steamId64}`);
        const dotaBot = this.getBot(lobbyState.botId);
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
        logger.silly(`ihlManager onLobbyInvite ${lobbyState.id} ${user.id} ${lobbyState.botId} ${user.steamId64}`);
        const dotaBot = this.getBot(lobbyState.botId);
        if (dotaBot) {
            DotaBot.invitePlayer(dotaBot)(user);
        }
    }

    /**
     * Runs a lobby state when the lobby is ready (all players have joined and are in the right team slot).
     * Checks for STATE_WAITING_FOR_PLAYERS lobby state
     * @async
     * @param {string} dotaLobbyId - A dota lobby id.
     */
    async onLobbyReady(dotaLobbyId) {
        const lobby = await Db.findLobbyByDotaLobbyId(dotaLobbyId);
        logger.silly(`ihlManager onLobbyReady ${dotaLobbyId} ${lobby.id}`);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobby, [CONSTANTS.STATE_WAITING_FOR_PLAYERS]).catch(e => logger.error(e));
    }

    /**
     * Puts a lobby state in STATE_PENDING_KILL and runs lobby.
     * @async
     * @param {module:lobby.LobbyState} lobbyState - An inhouse lobby state.
     */
    async onLobbyKill(lobbyState) {
        logger.silly(`ihlManager onLobbyKill ${lobbyState.id}`);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_PENDING_KILL);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_PENDING_KILL]).catch(e => logger.error(e));
    }

    /**
     * Handles match signed out bot event.
     * Updates STATE_MATCH_IN_PROGRESS lobby state to STATE_MATCH_ENDED
     * @async
     * @param {number} matchId - A dota match id.
     */
    async onMatchSignedOut(matchId) {
        const lobbyState = await Ihl.loadLobbyStateFromMatchId(this.client.guilds)(matchId.toString());
        logger.silly(`ihlManager onMatchSignedOut ${matchId} ${lobbyState.id} ${lobbyState.state}`);
        if (lobbyState.state === CONSTANTS.STATE_MATCH_IN_PROGRESS) {
            await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_ENDED);
            logger.silly('ihlManager onMatchSignedOut state set to STATE_MATCH_ENDED');
            this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_MATCH_ENDED]).catch(e => logger.error(e));
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
     * @param {string} dotaLobbyId - A dota lobby id.
     * @param {external:Dota2.schema.EMatchOutcome} matchOutcome - The dota match outcome
     * @param {external:Dota2.schema.CDOTALobbyMember[]} members - Array of dota lobby members
     */
    async onMatchOutcome(dotaLobbyId, matchOutcome, members) {
        const lobbyState = await Ihl.loadLobbyStateFromDotaLobbyId(this.client.guilds)(dotaLobbyId);
        logger.silly(`ihlManager onMatchOutcome ${dotaLobbyId} ${matchOutcome} ${lobbyState.id}`);
        await setMatchPlayerDetails(matchOutcome)(members)(lobbyState);
        this[CONSTANTS.MSG_MATCH_STATS](lobbyState, lobbyState.inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_STATS);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_MATCH_STATS]).catch(e => logger.error(e));
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
        const league = await Db.findLeagueById(lobby.leagueId);
        const inhouseState = await Ihl.createInhouseState({ league, guild: this.client.guilds.get(league.guildId) });
        const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
        this[CONSTANTS.MSG_MATCH_STATS](lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_STATS);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_MATCH_STATS]).catch(e => logger.error(e));
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
        const league = await Db.findLeagueById(lobby.leagueId);
        const inhouseState = await Ihl.createInhouseState({ league, guild: this.client.guilds.get(league.guildId) });
        const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
        this[CONSTANTS.MSG_MATCH_NO_STATS](lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_NO_STATS);
        this[CONSTANTS.EVENT_RUN_LOBBY](lobbyState, [CONSTANTS.STATE_MATCH_NO_STATS]).catch(e => logger.error(e));
    }

    /**
     * IHLManager event queue empty event.
     *
     * @event module:ihlManager~empty
     */

    /**
     * Processes the inhouse manager event queue until it is empty.
     * Events are actions to perform (mostly on lobby states or something that resolves to a lobby state).
     * An event consists of a function, the arguments to call it with,
     * and the resolve and reject callbacks of the Promise wrapping the action.
     * When the action is executed, resolve with the returned value
     * or reject if an error was thrown.
     * The queue blocks while processing an action, so only 1 can be processed at a time.
     * @async
     * @fires module:ihlManager~empty
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
     * @async
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

    /**
     * Gets a bot.
     * @param {number} botId - The bot id.
     * @returns {module:dotaBot.DotaBot}
     */
    getBot(botId) {
        logger.silly(`ihlManager getBot ${botId}`);
        return botId != null ? this.bots[botId] : null;
    }

    /**
     * Start a dota bot.
     * @async
     * @param {number} botId - The bot id.
     * @returns {module:dotaBot.DotaBot}
     */
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
                dotaBot.on(CONSTANTS.MSG_CHAT_MESSAGE, (channel, senderName, message, chatData) => this[CONSTANTS.MSG_CHAT_MESSAGE](dotaBot.dotaLobbyId.toString(), channel, senderName, message, chatData));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, member => this[CONSTANTS.MSG_LOBBY_PLAYER_JOINED](dotaBot.dotaLobbyId.toString(), member));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, member => this[CONSTANTS.MSG_LOBBY_PLAYER_LEFT](dotaBot.dotaLobbyId.toString(), member));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, state => this[CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT](dotaBot.dotaLobbyId.toString(), state));
                dotaBot.on(CONSTANTS.EVENT_LOBBY_READY, () => this[CONSTANTS.EVENT_LOBBY_READY](dotaBot.dotaLobbyId.toString()).catch(e => logger.error(e)));
                dotaBot.on(CONSTANTS.EVENT_BOT_LOBBY_LEFT, () => this[CONSTANTS.EVENT_BOT_LOBBY_LEFT](botId).catch(e => logger.error(e)));
                dotaBot.on(CONSTANTS.EVENT_MATCH_SIGNEDOUT, matchId => this[CONSTANTS.EVENT_MATCH_SIGNEDOUT](matchId).catch(e => logger.error(e)));
                dotaBot.on(CONSTANTS.EVENT_MATCH_OUTCOME, (dotaLobbyId, matchOutcome, members) => this[CONSTANTS.EVENT_MATCH_OUTCOME](dotaLobbyId.toString(), matchOutcome, members).catch(e => logger.error(e)));
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

    /**
     * Remove a dota bot.
     * @async
     * @param {number} botId - The bot id.
     */
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

    /**
     * Disconnect a dota bot from its lobby.
     * The bot should eventually emit EVENT_BOT_LOBBY_LEFT.
     * @param {module:lobby.lobbyState} lobbyState - The lobby for the bot.
     * @returns {null|string} Null if the bot left the lobby or a string containing the error reason.
     */
    async botLeaveLobby(lobbyState) {
        logger.silly(`ihlManager botLeaveLobby ${lobbyState.id}`);
        const dotaBot = this.getBot(lobbyState.botId);
        if (dotaBot) {
            if (equalsLong(lobbyState.dotaLobbyId, dotaBot.dotaLobbyId)) {
                await dotaBot.leavePracticeLobby();
                await dotaBot.abandonCurrentGame();
                logger.silly(`ihlManager botLeaveLobby bot ${lobbyState.botId} left lobby ${lobbyState.dotaLobbyId}`);
                return null;
            }
            return `Lobby ID mismatch. Expected: ${lobbyState.dotaLobbyId}. Actual: ${dotaBot.dotaLobbyId}.`;
        }
        return `Bot ID: ${lobbyState.botId} not found.`;
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
Object.assign(IHLManager.prototype, LobbyStateHandlers.LobbyStateHandlers({ DotaBot, Db, Guild, Lobby, MatchTracker }));
Object.assign(IHLManager.prototype, LobbyQueueHandlers({ Db, Lobby }));
Object.assign(IHLManager.prototype, EventListeners({ Db }));
Object.assign(IHLManager.prototype, MessageListeners({ Db, Guild, Lobby, MatchTracker, Ihl }));

module.exports = {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    createClient,
    setMatchPlayerDetails,
    IHLManager,
};
