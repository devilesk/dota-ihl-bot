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
const Guild = require('./guild');
const DotaBot = require('./dotaBot');
const LobbyStateHandlers = require('./lobbyStateHandlers');
const LobbyQueueHandlers = require('./lobbyQueueHandlers');
const EventListeners = require('./eventListeners');

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
            }
            if (user) {
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
                        logger.error(e);
                    }
                }
            }
        }
    }

    if (user && discord_user) {
        return [user, discord_user, result_type];
    }
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
const loadInhouseStates = guilds => async leagues => Fp.mapPromise(Ihl.createInhouseState)(leagues.map(league => ({ league, guild: guilds.get(league.guild_id) })));

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
    commandPrefix: options.COMMAND_PREFIX,
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
            if (((player_data.team === dota2.schema.lookupEnum('DOTA_GC_TEAM').values.DOTA_GC_TEAM_GOOD_GUYS)
                 && (match_outcome === dota2.schema.lookupEnum('EMatchOutcome').values.k_EMatchOutcome_RadVictory))
                || ((player_data.team === dota2.schema.lookupEnum('DOTA_GC_TEAM').values.DOTA_GC_TEAM_BAD_GUYS)
                 && (match_outcome === dota2.schema.lookupEnum('EMatchOutcome').values.k_EMatchOutcome_DireVictory))) {
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
        this.attachEventListeners();
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
        return new Promise((resolve, reject) => {
            this.client.on('ready', async () => {
                await this.onClientReady();
                resolve();
            });
            this.client.login(this.options.TOKEN);
        });
    }

    async onClientReady() {
        logger.debug(`Logged in as ${this.client.user.tag}`);
        await Db.setAllBotsOffline();
        const inhouseStates = await loadInhouseStatesFromLeagues(this.client.guilds);
        await Fp.mapPromise(Ihl.createLobbiesFromQueues)(inhouseStates);
        for (const inhouseState of inhouseStates) {
            await this.runLobbiesForInhouse(inhouseState);
        }
        await this.matchTracker.loadLobbies();
        this.matchTracker.run();
        logger.debug('Inhouse lobbies loaded and run.');
        this.emit('ready');
    }

    async onDiscordMessage(msg) {
        if (msg.author.id !== this.client.user.id) {
            this.emit(CONSTANTS.EVENT_DISCORD_MESSAGE, msg);
        }
    }

    async onDiscordMemberLeave(member) {
        logger.debug(`onDiscordMemberLeave ${member}`);
        const user = await Db.findUserByDiscordId(member.guild.id)(member.id);
        if (user) {
            this.emit(CONSTANTS.EVENT_USER_LEFT_GUILD, user);
        }
    }

    async createNewLeague(guild) {
        const inhouseState = await Ihl.createNewLeague(guild);
        await Ihl.createLobbiesFromQueues(inhouseState);
        await this.runLobbiesForInhouse(inhouseState);
    }
    
    async createChallengeLobby(inhouseState, captain_1, captain_2, challenge) {
        const lobbyState = await Lobby.createChallengeLobby({ inhouseState, captain_1, captain_2, challenge });
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_NEW]);
    }

    /**
    * Runs all lobbies.
    * @async
    */
    async runLobbiesForInhouse(inhouseState) {
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
        logger.debug('ihlManager Ihl.joinLobbyQueue');
        const result = await Ihl.joinLobbyQueue(user)(lobbyState);
        logger.debug(`ihlManager Ihl.joinLobbyQueue result ${result}`);
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
        logger.debug(`clearLobbyQueue ${lobbyState.id}`);
        await Db.destroyLobbyQueuers(lobbyState);
    }
    
    /**
     * Clear all lobby queues.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse queue to clear.
     */
    async clearAllLobbyQueues(inhouseState) {
        const lobbies = await Db.findAllLobbiesForInhouse(inhouseState);
        logger.debug(`clearAllLobbyQueues ${lobbies.length}`);
        for (const lobby of lobbies) {
            await Db.destroyLobbyQueuers(lobby);
        }
    }

    /**
     * Bans a user from the inhouse queue.
     * @async
     * @param {module:ihl.InhouseState} inhouseState - The inhouse to dequeue.
     * @param {external:User} user - A discord.js user.
     * @param {number} timeout - Duration of ban in minutes.
     * @param {external:User} discordUser - A discord.js user.
     */
    async banInhouseQueue(inhouseState, user, timeout, discordUser) {
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
        if (!states.length || states.indexOf(lobby.state) !== -1) {
            let lobbyState = await Fp.pipeP(
                Lobby.createLobbyState(_lobbyState.inhouseState)(_lobbyState),
                Lobby.validateLobbyPlayers,
            )(lobby);
            let beginState = -1;
            let endState = lobbyState.state;
            while (beginState !== endState) {
                beginState = lobbyState.state;
                lobbyState = await this[beginState](lobbyState);
                endState = lobbyState.state;
                logger.debug(`runLobby ${lobbyState.id} ${beginState} to ${endState}`);
                this.emit(beginState, lobbyState); // test hook event
            }
            try {
                await Lobby.setLobbyTopic(lobbyState);
            }
            catch (e) {
                logger.error(e);
            }
        }
        this._runLobbyCount -= 1;
    }

    async onCreateLobbyQueue(_lobbyState) {
        logger.debug(`ihlManager onCreateLobbyQueue ${_lobbyState.id}`);
        const queue = await Db.findQueue(_lobbyState.league_id, true, _lobbyState.queue_type);
        if (queue && queue.queue_type !== CONSTANTS.QUEUE_TYPE_CHALLENGE) {
            logger.debug(`ihlManager onCreateLobbyQueue queue ${queue.queue_type}`);
            const lobbyState = await Ihl.createLobby(_lobbyState.inhouseState)(queue);
            await Guild.setChannelPosition(1)(lobbyState.channel);
            this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_NEW]);
        }
    }

    async onSetLobbyState(lobbyState, state) {
        lobbyState.state = state;
        await Db.updateLobbyState(lobbyState)(state);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [state]);
    }

    async onSetBotStatus(steamid_64, status) {
        await Db.updateBot(steamid_64)({ status });
    }

    async onLeagueTicketAdd(league, leagueid, name) {
        const ticket = await Db.upsertTicket({ leagueid, name });
        logger.debug(`onLeagueTicketAdd ${ticket}`);
        if (ticket) {
            await Db.addTicketOf(league)(ticket);
        }
    }

    async onLeagueTicketSet(league, leagueid) {
        const tickets = await Db.getTicketsOf({ where: { leagueid } })(league);
        if (tickets.length) {
            await Db.updateLeague(league.guild_id)({ leagueid });
        }
    }

    async onLeagueTicketRemove(league, leagueid) {
        const ticket = await Db.findTicketByDotaLeagueId(leagueid);
        if (ticket) {
            await Db.removeTicketOf(league)(ticket);
        }
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
        this.emit(CONSTANTS.MSG_READY_CHECK_START, lobbyState);
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
        logger.debug(`ihlManager onPlayerReady ${user.id}`);
        await Lobby.setPlayerReady(true)(lobbyState)(user.id);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_CHECKING_READY]);
    }

    async onSelectionPick(_lobbyState, captain, pick) {
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
        logger.debug(`ihlManager onDraftMember ${lobby.state} ${faction} ${captain.id} ${Lobby.isFactionCaptain(lobbyState)(faction)(captain)}`);
        if (lobby.state === CONSTANTS.STATE_DRAFTING_PLAYERS && Lobby.isFactionCaptain(lobbyState)(faction)(captain)) {
            const player = await Lobby.getPlayerByUserId(lobbyState)(user.id);
            if (player) {
                const result = await Lobby.isPlayerDraftable(lobbyState)(player);
                logger.debug(`ihlManager onDraftMember draftable ${result}`);
                if (result === CONSTANTS.PLAYER_DRAFTED) {
                    await Lobby.setPlayerFaction(faction)(lobbyState)(user.id);
                    this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_DRAFTING_PLAYERS]);
                }
                return result;
            }
            else {
                return CONSTANTS.INVALID_PLAYER_NOT_FOUND;
            }
        }
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
            await this.botLeaveLobby(lobbyState);
            await Lobby.unassignBotFromLobby(lobbyState);
        }
        await Lobby.forceLobbyDraft(lobbyState, captain_1, captain_2);
        await Db.updateLobby(lobbyState);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState);
    }
    
    async onLobbyInvite(lobbyState, user) {
        logger.debug('ihlManager onLobbyInvite');
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            DotaBot.invitePlayer(dotaBot)(user);
        }
    }

    /**
     * Runs a lobby state when the lobby is ready (all players have joined and are in the right team slot).
     * Checks for STATE_WAITING_FOR_PLAYERS lobby state
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     */
    async onLobbyReady(lobby_id) {
        logger.debug('ihlManager onLobbyReady');
        const lobby = await Db.findLobbyByLobbyId(lobby_id);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobby, [CONSTANTS.STATE_WAITING_FOR_PLAYERS]);
    }

    /**
     * Kills a lobby state.
     * @async
     * @param {module:lobby.LobbyState} _lobbyState - An inhouse lobby state.
     */
    async onLobbyKill(lobbyState) {
        logger.debug(`ihlManager onLobbyKill ${lobbyState.id}`);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_PENDING_KILL);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_PENDING_KILL]);
    }

    /**
     * Handles match signed out bot event.
     * Updates STATE_MATCH_IN_PROGRESS lobby state to STATE_MATCH_ENDED
     */
    async onMatchSignedOut(match_id) {
        const lobbyState = await Ihl.loadLobbyStateFromMatchId(this.client.guilds)(match_id);
        logger.debug(`onMatchSignedOut ${match_id} ${lobbyState.id} ${lobbyState.state}`);
        if (lobbyState.state === CONSTANTS.STATE_MATCH_IN_PROGRESS) {
            await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_ENDED);
            logger.debug(`onMatchSignedOut state set to STATE_MATCH_ENDED`);
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
     */
    async onMatchOutcome(lobby_id, match_outcome, members) {
        const lobbyState = await Ihl.loadLobbyStateFromLobbyId(this.client.guilds)(lobby_id);
        await setMatchPlayerDetails(match_outcome)(members)(lobbyState);
        this.emit(CONSTANTS.MSG_MATCH_STATS, lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_STATS);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_STATS]);
    }

    /**
     * Handles match tracker match stats event.
     * Sends match stats message.
     * Puts lobby into STATE_MATCH_STATS state
     */
    async onMatchStats(lobby) {
        const league = await Db.findLeagueById(lobby.league_id);
        const inhouseState = await Ihl.createInhouseState({ league, guild: this.client.guilds.get(league.guild_id) });
        const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
        this.emit(CONSTANTS.MSG_MATCH_STATS, lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_STATS);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_STATS]);
    }
    
    async onMatchNoStats(lobby) {
        const league = await Db.findLeagueById(lobby.league_id);
        const inhouseState = await Ihl.createInhouseState({ league, guild: this.client.guilds.get(league.guild_id) });
        const lobbyState = await Lobby.lobbyToLobbyState(inhouseState)(lobby);
        this.emit(CONSTANTS.MSG_MATCH_NO_STATS, lobbyState, inhouseState);
        await Db.updateLobbyState(lobbyState)(CONSTANTS.STATE_MATCH_NO_STATS);
        this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_MATCH_NO_STATS]);
    }

    /**
     * Processes the inhouse manager event queue until it is empty.
     * Events are actions to perform on lobby states.
     * @async
     */
    async processEventQueue() {
        if (this.blocking) return;
        if (this.eventQueue.length) {
            this.blocking = true;
            const [fn, args, resolve, reject] = this.eventQueue.shift();
            logger.debug(`processEventQueue processing ${fn.name} ${this.eventQueue.length}`);
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
    async queueEvent(fn, args) {
        logger.debug(`queueEvent ${fn.name} ${args}`);
        return new Promise((resolve, reject) => {
            this.eventQueue.push([fn, args, resolve, reject]);
            this.processEventQueue().catch(e => logger.error(e) && process.exit(1));
        });
    }

    getBot(bot_id) {
        return bot_id != null ? this.bots[bot_id] : null;
    }

    async loadBot(bot_id) {
        let dotaBot = this.getBot(bot_id);
        if (!dotaBot) {
            await Db.updateBotStatus(CONSTANTS.BOT_LOADING)(bot_id);
            try {
                dotaBot = await Fp.pipeP(
                    Db.findBot,
                    DotaBot.createDotaBot,
                    DotaBot.connectDotaBot,
                )(bot_id);
                dotaBot.on(CONSTANTS.MSG_CHAT_MESSAGE, (channel, sender_name, message, chatData) => this.emit(CONSTANTS.MSG_CHAT_MESSAGE, dotaBot.lobby_id.toString(), channel, sender_name, message, chatData));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, member => this.emit(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, dotaBot.lobby_id.toString(), member));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, member => this.emit(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, dotaBot.lobby_id.toString(), member));
                dotaBot.on(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, state => this.emit(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, dotaBot.lobby_id.toString(), state));
                dotaBot.on(CONSTANTS.EVENT_LOBBY_READY, () => this.emit(CONSTANTS.EVENT_LOBBY_READY, dotaBot.lobby_id.toString()));
                dotaBot.on(CONSTANTS.EVENT_MATCH_SIGNEDOUT, match_id => this.emit(CONSTANTS.EVENT_MATCH_SIGNEDOUT, match_id));
                dotaBot.on(CONSTANTS.EVENT_MATCH_OUTCOME, (lobby_id, match_outcome) => this.emit(CONSTANTS.EVENT_MATCH_OUTCOME, lobby_id.toString(), match_outcome));
                this.bots[bot_id] = dotaBot;
            }
            catch (e) {
                await Db.updateBotStatus(CONSTANTS.BOT_FAILED)(bot_id);
                return null;
            }
        }
        logger.debug(`ihlManager loadBot done.`);
        return dotaBot;
    }

    async removeBot(bot_id) {
        const dotaBot = this.get(bot_id);
        if (dotaBot) {
            try {
                delete this.bots[bot_id];
                await DotaBot.disconnectDotaBot(dotaBot);
            }
            catch (e) {
                await Db.updateBotStatus(CONSTANTS.BOT_FAILED)(bot_id);
            }
        }
    }

    async botLeaveLobby(lobbyState) {
        const dotaBot = this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            if (lobbyState.lobby_id === dotaBot.lobby_id.toString()) {
                await dotaBot.leavePracticeLobby();
                await dotaBot.abandonCurrentGame();
                await Db.updateBotStatus(CONSTANTS.BOT_IDLE)(lobbyState.bot_id);
                logger.debug(`botLeaveLobby bot: ${lobbyState.bot_id} lobby_id: ${lobbyState.lobby_id}`);
                const lobbyStates = await Fp.mapPromise(Ihl.loadLobbyState(this.client.guilds))(Db.findAllLobbiesInState(CONSTANTS.STATE_WAITING_FOR_BOT));
                for (const lobbyState of lobbyStates) {
                    this.emit(CONSTANTS.EVENT_RUN_LOBBY, lobbyState, [CONSTANTS.STATE_WAITING_FOR_BOT]);
                }
            }
        }
    }
    
    async onStartDotaLobby(lobbyState, dotaBot) {
        logger.debug('onStartDotaLobby');
        if (lobbyState.state !== CONSTANTS.STATE_WAITING_FOR_PLAYERS) return false;
        dotaBot = dotaBot || this.getBot(lobbyState.bot_id);
        if (dotaBot) {
            lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
            lobbyState.started_at = Date.now();
            lobbyState.match_id = await DotaBot.startDotaLobby(dotaBot);
            if (lobbyState.leagueid) {
                await this.botLeaveLobby(lobbyState);
            }
            await Lobby.removeQueuers(lobbyState);
            await Db.updateLobby(lobbyState);
            this.matchTracker.addLobby(lobbyState);
            this.matchTracker.run();
            this.emit(CONSTANTS.MSG_LOBBY_STARTED, lobbyState);
            logger.debug('onStartDotaLobby done');
            return true;
        }
        return false;
    }

    /**
     * Bind all events to their corresponding event handler functions
     */
     attachEventListeners() {
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
Object.assign(IHLManager.prototype, EventListeners({
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
