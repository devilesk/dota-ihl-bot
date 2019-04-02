/**
 * @module dotaBot
 */

const convertor = require('steam-id-convertor');
const steam = require('steam');
const util = require('util');
const fs = require('fs');
const crypto = require('crypto');
const dota2 = require('dota2');
const Promise = require('bluebird');
const events = require('events');
const path = require('path');
const Queue = require('./util/queue');
const CONSTANTS = require('./constants');
const logger = require('./logger');
const {
    updateBotStatusBySteamId,
} = require('./db');

/**
 * @typedef module:dotaBot.LogOnDetails
 * @type {Object}
 * @property {string} account_name - The steam account name.
 * @property {string} password - The steam account password.
 * @property {string} persona_name - The steam account alias to use.
 */

steam.servers = JSON.parse(fs.readFileSync(path.join(__dirname, '../servers')));

/**
* Converts a Dota team slot value to a faction value.
* @function
* @param {number} slot - The Dota team slot.
* @returns {number} An inhouse lobby faction.
*/
const slotToFaction = (slot) => {
    switch (slot) {
    case dota2.schema.lookupEnum('DOTA_GC_TEAM').values.DOTA_GC_TEAM_GOOD_GUYS:
        return 1;
    case dota2.schema.lookupEnum('DOTA_GC_TEAM').values.DOTA_GC_TEAM_BAD_GUYS:
        return 2;
    default:
        return null;
    }
};

/**
* Updates a player to team mapping object.
* Used to track which players have joined team slots in lobby.
* A null slot value will remove the player from the mapping meaning they are not in a team slot.
* @function
* @param {string} steamid_64 - The player's steamid64.
* @param {?number} slot - The lobby team slot the player joined.
* @param {Object} playerState - A player to team mapping.
* @returns {Object} A player to team mapping.
*/
const updatePlayerState = (steamid_64, slot, playerState) => {
    const _playerState = { ...playerState };
    if (slot == null) {
        delete _playerState[steamid_64];
    }
    else {
        const faction = slotToFaction(slot);
        if (faction == null) {
            delete _playerState[steamid_64];
        }
        else {
            _playerState[steamid_64] = faction;
        }
    }
    logger.debug(`updatePlayerState ${steamid_64} ${slot} ${util.inspect(playerState)} -> ${util.inspect(_playerState)}`);
    return _playerState;
};

/**
* Checks if all entries in a player to faction mapping match the player to team state mapping.
* @function
* @param {Object} factionCache - The intended player to team state.
* @param {Object} playerState - The current state of players to teams.
* @returns {boolean} Whether the player state matches the faction cache.
*/
const isDotaLobbyReady = (factionCache, playerState) => {
    for (const [steamid_64, faction] of Object.entries(factionCache)) {
        if (playerState[steamid_64] != faction) return false;
    }
    return true;
};

const connectToSteam = async steamClient => new Promise((resolve, reject) => {
    steamClient.once('connected', () => resolve(steamClient));
    steamClient.connect();
});

const logOnToSteam = logOnDetails => async steamClient => new Promise((resolve, reject) => {
    const onError = (error) => {
        steamClient.removeListener('logOnResponse', onLoggedOn);
        steamClient.removeListener('loggedOff', onLoggedOff);
        reject(error);
    };
    const onLoggedOff = () => {
        steamClient.removeListener('logOnResponse', onLoggedOn);
        steamClient.removeListener('error', onError);
        reject();
    };
    const onLoggedOn = (logonResp) => {
        steamClient.removeListener('loggedOff', onLoggedOff);
        steamClient.removeListener('error', onError);
        if (logonResp.eresult === steam.EResult.OK) {
            resolve(steamClient);
        }
        else {
            reject(logonResp);
        }
    };
    steamClient.once('logOnResponse', onLoggedOn);
    steamClient.once('error', onError);
    steamClient.once('loggedOff', onLoggedOff);
    steamClient.logOn(logOnDetails);
});

const connectToDota = async dotaClient => new Promise((resolve, reject) => {
    dotaClient.once('ready', () => resolve(dotaClient));
    dotaClient.launch();
});

const updateServers = steam => (servers) => {
    logger.debug('DotaBot Received servers.');
    steam.servers = servers;
    fs.writeFileSync('servers', JSON.stringify(servers));
};

const updateMachineAuth = sentry_path => (sentry, callback) => {
    fs.writeFileSync(sentry_path, sentry.bytes);
    logger.debug('sentryfile saved');
    callback({ sha_file: crypto.createHash('sha1').update(sentry.bytes).digest() });
};

const defaultLobbyOptions = {
    game_name: Date.now().toString(),
    server_region: dota2.ServerRegion.USEAST,
    game_mode: dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_CM,
    series_type: 2,
    game_version: 1,
    allow_cheats: false,
    fill_with_bots: false,
    allow_spectating: true,
    pass_key: 'password',
    radiant_series_wins: 0,
    dire_series_wins: 0,
    allchat: true,
};

const createSteamClient = () => new steam.SteamClient();

const createSteamUser = steamClient => new steam.SteamUser(steamClient);

const createSteamFriends = steamClient => new steam.SteamFriends(steamClient);

const createDotaClient = (steamClient, debug, debugMore) => {
    const dotaClient = new dota2.Dota2Client(steamClient, debug, debugMore);
    // Properties are not properly exported on the instance, so need to re-add them
    dotaClient.schema = dota2.schema;
    dotaClient.ServerRegion = dota2.ServerRegion;
    dotaClient.EResult = dota2.EResult;
    dotaClient.Seriestype = dota2.SeriesType;
    return dotaClient;
};

const diffMembers = (membersA, membersB) => membersA.filter(memberA => !membersB.find(memberB => memberA.id.compare(memberB.id) === 0));

const intersectMembers = (membersA, membersB) => membersA.filter(memberA => membersB.find(memberB => memberA.id.compare(memberB.id) === 0));

const membersToPlayerState = (members) => {
    const playerState = {};
    for (const member of members) {
        playerState[member.id.toString()] = slotToFaction(member.team);
    }
    return playerState;
};

const processMembers = (oldMembers, newMembers) => {
    const members = {
        left: diffMembers(oldMembers, newMembers),
        joined: diffMembers(newMembers, oldMembers),
        changedSlot: [],
    };

    for (const oldMember of oldMembers) {
        const newMember = newMembers.find(member => oldMember.id.compare(member.id) === 0);
        if (newMember && (oldMember.team !== newMember.team || oldMember.slot !== newMember.slot)) {
            members.changedSlot.push({
                previous: oldMember,
                current: newMember,
            });
        }
    }

    return members;
};

const invitePlayer = dotaBot => async user => dotaBot.inviteToLobby(user.steamid_64);

const disconnectDotaBot = async (dotaBot) => {
    logger.debug(`disconnectDotaBot ${dotaBot.steamid_64}`);
    await dotaBot.disconnect();
    await updateBotStatusBySteamId(CONSTANTS.BOT_OFFLINE)(dotaBot.steamid_64);
    return dotaBot;
};

const connectDotaBot = async (dotaBot) => {
    logger.debug(`connectDotaBot ${dotaBot.steamid_64}`);
    await dotaBot.connect();
    await updateBotStatusBySteamId(CONSTANTS.BOT_ONLINE)(dotaBot.steamid_64);
    return dotaBot;
};

const createDotaBotLobby = ({ lobby_name, pass_key, leagueid }) => async (dotaBot) => {
    logger.debug(`createDotaBotLobby ${lobby_name} ${pass_key} ${dotaBot.steamid_64}`);
    let result = await dotaBot.createPracticeLobby({ game_name: lobby_name, pass_key, leagueid });
    if (result === dota2.EResult.k_EResultOK) {
        logger.debug('createDotaBotLobby practice lobby created');
        await updateBotStatusBySteamId(CONSTANTS.BOT_IN_LOBBY)(dotaBot.steamid_64);
        logger.debug('createDotaBotLobby bot status updated');
        await dotaBot.practiceLobbyKickFromTeam(dotaBot.accountId);
        await dotaBot.joinLobbyChat();
    }
    else if (result === dota2.EResult.k_EResultFail) {
        logger.debug('createDotaBotLobby practice lobby failed... retrying');
        await dotaBot.leavePracticeLobby();
        result = await dotaBot.createPracticeLobby({ game_name: lobby_name, pass_key, leagueid });
        if (result === dota2.EResult.k_EResultOK) {
            logger.debug('createDotaBotLobby practice lobby created');
            await updateBotStatusBySteamId(CONSTANTS.BOT_IN_LOBBY)(dotaBot.steamid_64);
            logger.debug('createDotaBotLobby bot status updated');
            await dotaBot.practiceLobbyKickFromTeam(dotaBot.accountId);
            await dotaBot.joinLobbyChat();
        }
        else {
            throw new Error('createDotaBotLobby failed');
        }
    }
    else {
        throw new Error('createDotaBotLobby failed');
    }
    return dotaBot;
};

const joinDotaBotLobby = ({ lobby_id, lobby_name, pass_key, leagueid }) => async (dotaBot) => {
    logger.debug(`joinDotaBotLobby ${lobby_name} ${pass_key}`);
    const options = { game_name: lobby_name, pass_key, leagueid };
    await dotaBot.joinPracticeLobby(lobby_id, options);
    await updateBotStatusBySteamId(CONSTANTS.BOT_IN_LOBBY)(dotaBot.steamid_64);
    await dota2.practiceLobbyKickFromTeam(dota2.accountId);
    await dota2.configPracticeLobby(options);
    await dotaBot.joinLobbyChat();
    return dotaBot;
};

const startDotaLobby = async (dotaBot) => {
    const lobbyData = await dotaBot.launchPracticeLobby();
    await dotaBot.leavePracticeLobby();
    await dotaBot.abandonCurrentGame();
    await dotaBot.leaveChat(dotaBot.lobbyChannelName, dota2.schema.lookupEnum('DOTAChatChannelType_t').values.DOTAChannelType_Lobby);
    return lobbyData.match_id;
};

class DotaBot extends events.EventEmitter {
    /**
     * Constructor of the DotaBot. This prepares an object for connecting to
     * Steam and the Dota2 Game Coordinator.
     * @classdesc Class representing a Dota bot.
     * Handles all in game functions required to host an inhouse lobby.
     * @extends external:EventEmitter
     * @param {module:dotaBot.LogOnDetails} logOnDetails - Steam login credentials.
     * */
    constructor(steamClient, steamUser, steamFriends, dotaClient, config) {
        super();

        this.lobbyOptions = {};
        this.factionCache = {};
        this._queue = new Queue(null, null, true);
        this.config = config;
        this.steamClient = steamClient;
        this.steamUser = steamUser;
        this.steamFriends = steamFriends;
        this.Dota2 = dotaClient;

        this.logOnDetails = {
            account_name: config.account_name,
            password: config.password,
        };
        if (config.steam_guard_code) this.logOnDetails.auth_code = config.steam_guard_code;
        if (config.two_factor_code) this.logOnDetails.two_factor_code = config.two_factor_code;

        try {
            const sentry = fs.readFileSync(`sentry/${config.steamid_64}`);
            if (sentry.length) this.logOnDetails.sha_sentryfile = sentry;
        }
        catch (beef) {
            logger.debug(`DotaBot Cannot load the sentry. ${beef}`);
        }

        // Block queue until GC is ready
        this.block();

        this.Dota2.on('ready', () => this.onDotaReady());
        this.Dota2.on('unready', () => this.onDotaUnready());
        this.Dota2.on('unhandled', kMsg => this.onDotaUnhandledMsg(kMsg));
        this.Dota2.on('practiceLobbyUpdate', (lobby) => {
            logger.debug(`DotaBot practiceLobbyUpdate ${util.inspect(lobby)}`);
            if (this.lobby) this.processLobbyUpdate(this.lobby, lobby);
        });
        this.Dota2.on('practiceLobbyResponse', (result, body) => {
            logger.debug(`DotaBot practiceLobbyResponse ${util.inspect(body)}`);
        });
        this.Dota2.on('chatMessage', (channel, sender_name, message, chatData) => {
            logger.debug(`DotaBot chatMessage ${channel} ${sender_name} {$message} ${util.inspect(chatData)}`);
            if (channel === `Lobby_${this.lobby.lobby_id}`) {
                this.emit(CONSTANTS.MSG_CHAT_MESSAGE, channel, sender_name, message, chatData);
            }
        });

        this.steamClient.on('loggedOff', async eresult => this.onSteamClientLoggedOff(eresult));
        this.steamClient.on('error', async error => this.onSteamClientError(error));
        this.steamClient.on('servers', updateServers(steam));
        this.steamUser.on('updateMachineAuth', updateMachineAuth(`sentry/${this.steamid_64}`));
    }

    get lobbyOptions() {
        return this._lobbyOptions;
    }

    set lobbyOptions(options) {
        this._lobbyOptions = { ...defaultLobbyOptions, ...options };
    }

    get factionCache() {
        return this._factionCache;
    }

    set factionCache(newCache) {
        this._factionCache = newCache;
    }

    /**
     * Get bot steamid_64
     * */
    get steamid_64() {
        return this.config.steamid_64;
    }

    /**
     * Get the current state of the queue
     * */
    get state() {
        return this._queue.state;
    }

    /**
     * Get the current rate limit factor
     * */
    get rate_limit() {
        return this._queue.rate_limit;
    }

    /**
     * Set the rate limiting factor
     * @param {number} rate_limit - Milliseconds to wait between requests.
     * */
    set rate_limit(rate_limit) {
        this._queue.rate_limit = rate_limit;
    }

    /**
     * Get the current backoff time of the queue
     * */
    get backoff() {
        return this._queue.backoff;
    }

    /**
    * Set the backoff time of the queue
    * @param {number} backoff - Exponential backoff time in milliseconds.
    * */
    set backoff(backoff) {
        this._queue.backoff = backoff;
    }

    block() {
        this._queue.block();
    }

    release() {
        this._queue.release();
    }

    clear() {
        this._queue.clear();
    }

    async onSteamClientLoggedOff(eresult) {
        logger.debug('Logged off from Steam. Trying reconnect');
        // Block queue while there's no access to Steam
        this.block();
        await this.logOnToSteam();
        await this.connectToDota();
    }

    async onSteamClientError(error) {
        logger.debug('Connection closed by server. Trying reconnect');
        // Block queue while there's no access to Steam
        this.block();
        await this.connect();
    }

    onDotaReady() {
        // Activate queue when GC is ready
        logger.debug('node-dota2 ready.');
        this.release();
    }

    onDotaUnready() {
        logger.debug('node-dota2 unready.');
        // Block queue when GC is not ready
        this.block();
    }

    onDotaUnhandledMsg(kMsg) {
        logger.debug(`UNHANDLED MESSAGE ${kMsg}`);
    }

    /**
     * Initiates the connection to Steam and the Dota2 Game Coordinator.
     * */
    async connect() {
        logger.debug('steamClient connecting...');
        await connectToSteam(this.steamClient);
        await this.logOnToSteam();
        await this.connectToDota();
    }

    async logOnToSteam() {
        logger.debug('logging on steamUser...');
        await logOnToSteam(this.logOnDetails)(this.steamClient);
        this.steamFriends.setPersonaState(steam.EPersonaState.Online);
        this.steamFriends.setPersonaName(this.config.persona_name);
        logger.debug('Set steam persona state and name.');
    }

    async connectToDota() {
        await connectToDota(this.Dota2);
        // Activate queue when GC is ready
        logger.debug('node-dota2 ready.');
        this.release();
    }

    /**
     * Disconnect from the Game Coordinator. This will also cancel all queued
     * operations!
     * */
    async disconnect() {
        return Promise.try(() => {
            this.clear();
            this.Dota2.exit();
            this.steamClient.disconnect();
            logger.debug('DotaBot Logged off.');
        });
    }

    /**
     * Schedule a function for execution. This function will be executed as soon
     * as the GC is available.
     * */
    schedule(fn) {
        this._queue.schedule(fn);
    }

    /**
     * Get the dota lobby object
     * */
    get lobby() {
        return this.Dota2.Lobby;
    }

    /**
     * Get the dota lobby channel name
     * */
    get lobbyChannelName() {
        return `Lobby_${this.Dota2.Lobby.lobby_id}`;
    }

    /**
     * Get the bot steam id
     * */
    get steamId() {
        return this.Dota2._client.steamID;
    }

    /**
     * Get the bot account id
     * */
    get accountId() {
        return this.Dota2.ToAccountID(this.Dota2._client.steamID);
    }

    processLobbyUpdate(oldLobby, newLobby) {
        const members = processMembers(oldLobby.members, newLobby.members);

        for (const member of members.left) {
            logger.debug(`processLobbyUpdate member left ${member.id}`);
            this.emit(CONSTANTS.MSG_LOBBY_PLAYER_LEFT, member);
        }

        for (const member of members.joined) {
            logger.debug(`processLobbyUpdate member joined ${member.id}`);
            this.emit(CONSTANTS.MSG_LOBBY_PLAYER_JOINED, member);
        }

        for (const memberState of members.changedSlot) {
            logger.debug(`processLobbyUpdate member slot changed ${util.inspect(memberState.previous)} => ${util.inspect(memberState.current)}`);
            this.emit(CONSTANTS.MSG_LOBBY_PLAYER_CHANGED_SLOT, memberState);

            const steamid_64 = memberState.current.id.toString();
            if (Object.prototype.hasOwnProperty.call(this.factionCache, steamid_64)) {
                if (this.factionCache[steamid_64] !== slotToFaction(memberState.current.team)) {
                    const account_id = convertor.to32(steamid_64).toNumber();
                    this.practiceLobbyKickFromTeam(account_id).catch(console.error);
                }
            }
        }

        if (isDotaLobbyReady(this.factionCache, membersToPlayerState(newLobby.members))) {
            logger.debug('processLobbyUpdate lobby ready');
            this.emit(CONSTANTS.EVENT_LOBBY_READY);
        }
    }

    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            if (this.lobby) {
                logger.debug(`DotaBot sendMessage ${message}`);
                this.schedule(() => {
                    this.Dota2.sendMessage(message, this.lobbyChannelName, dota2.schema.lookupEnum('DOTAChatChannelType_t').values.DOTAChannelType_Lobby);
                    resolve();
                });
            }
        });
    }

    async inviteToLobby(steamid_64) {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                this.Dota2.once('inviteCreated', resolve);
                logger.debug(`DotaBot inviteToLobby ${steamid_64}`);
                this.Dota2.inviteToLobby(steamid_64);
            });
        });
    }

    async configPracticeLobby(options) {
        return new Promise((resolve, reject) => {
            if (this.lobby) {
                this.schedule(() => {
                    this.lobbyOptions = options;
                    logger.debug(`DotaBot configPracticeLobby ${util.inspect(this.lobbyOptions)}`);
                    this.Dota2.configPracticeLobby(this.lobby.lobby_id, this.lobbyOptions, (err) => {
                        if (!err) {
                            resolve();
                        }
                        else {
                            reject(err);
                        }
                    });
                });
            }
            else {
                logger.error('DotaBot configPracticeLobby missing lobby_id');
                reject(new Error('no lobby_id'));
            }
        });
    }

    async flipLobbyTeams() {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug('DotaBot flipLobbyTeams');
                this.Dota2.flipLobbyTeams((err, body) => {
                    if (!err) {
                        resolve(body);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }

    async launchPracticeLobby() {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug('DotaBot launchPracticeLobby');
                this.Dota2.launchPracticeLobby((err) => {
                    if (!err) {
                        resolve();
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }

    async practiceLobbyKickFromTeam(account_id) {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug(`DotaBot practiceLobbyKickFromTeam ${account_id}`);
                this.Dota2.practiceLobbyKickFromTeam(account_id, (err, body) => {
                    if (!err) {
                        resolve(body);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }

    async practiceLobbyKick(account_id) {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug(`DotaBot practiceLobbyKick ${account_id}`);
                this.Dota2.practiceLobbyKick(account_id, (err, body) => {
                    if (!err) {
                        resolve(body);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }

    async leavePracticeLobby() {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug('DotaBot leavePracticeLobby');
                this.Dota2.leavePracticeLobby((err, body) => {
                    if (!err) {
                        resolve(body);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }

    async abandonCurrentGame() {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug('DotaBot abandonCurrentGame');
                // abandonCurrentGame does not callback
                this.Dota2.abandonCurrentGame();
                resolve();
            });
        });
    }

    async destroyLobby() {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug('DotaBot destroyLobby');
                this.Dota2.destroyLobby((err, body) => {
                    if (!err) {
                        this.lobbyOptions = null;
                        resolve(body);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }

    async joinChat(channelName, channelType) {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug(`DotaBot joinChat ${channelName}`);
                this.Dota2.joinChat(channelName, channelType);
                resolve();
            });
        });
    }
    
    async joinLobbyChat() {
        return this.joinChat(this.lobbyChannelName, dota2.schema.lookupEnum('DOTAChatChannelType_t').values.DOTAChannelType_Lobby);
    }

    async leaveChat(channelName, channelType) {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                logger.debug(`DotaBot leaveChat ${channelName}`);
                this.Dota2.leaveChat(channelName, channelType);
                resolve();
            });
        });
    }

    async joinPracticeLobby(lobby_id, options) {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                this.lobbyOptions = options;
                logger.debug(`DotaBot joinPracticeLobby ${lobby_id}`);
                this.Dota2.joinPracticeLobby(lobby_id, this.lobbyOptions.pass_key, (err, body) => {
                    if (!err) {
                        if (body.result === dota2.schema.lookupEnum('DOTAJoinLobbyResult').values.DOTA_JOIN_RESULT_SUCCESS) {
                            resolve();
                        }
                        else {
                            reject(body.result);
                        }
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }

    async createPracticeLobby(options) {
        return new Promise((resolve, reject) => {
            this.schedule(() => {
                this.lobbyOptions = options;
                logger.debug(`DotaBot createPracticeLobby ${util.inspect(this.lobbyOptions)}`);
                this.Dota2.createPracticeLobby(this.lobbyOptions, (err, body) => {
                    if (!err) {
                        if (body.eresult === dota2.EResult.k_EResultOK || body.eresult == dota2.EResult.k_EResultFail) {
                            resolve(body.eresult);
                        }
                        else {
                            reject(body.eresult);
                        }
                    }
                    else {
                        reject(err);
                    }
                });
            });
        });
    }
}

const createDotaBot = (config) => {
    const steamClient = createSteamClient();
    const steamUser = createSteamUser(steamClient);
    const steamFriends = createSteamFriends(steamClient);
    const dotaClient = createDotaClient(steamClient, true, true);
    return new DotaBot(steamClient, steamUser, steamFriends, dotaClient, config);
};

module.exports = {
    slotToFaction,
    updatePlayerState,
    isDotaLobbyReady,
    connectToSteam,
    logOnToSteam,
    connectToDota,
    updateServers,
    updateMachineAuth,
    defaultLobbyOptions,
    createSteamClient,
    createSteamUser,
    createSteamFriends,
    createDotaClient,
    diffMembers,
    intersectMembers,
    membersToPlayerState,
    processMembers,
    invitePlayer,
    disconnectDotaBot,
    connectDotaBot,
    createDotaBotLobby,
    joinDotaBotLobby,
    startDotaLobby,
    DotaBot,
    createDotaBot,
};
