/**
 * @module lobby
 */

/**
 * @typedef module:lobby.LobbyState
 * @type {Object}
 * @property {module:ihl.InhouseState} inhouseState - The inhouse state the lobby belongs to.
 * @property {external:discordjs.GuildChannel} channel - The discord lobby channel.
 * @property {external:discordjs.Role} role - The discord lobby role.
 * @property {number} readyCheckTime - Start of lobby ready timer.
 * @property {string} state - The lobby state.
 * @property {number} botId - The record id of the bot hosting the lobby.
 * @property {string} queueType - The lobby queue type.
 * @property {string} lobbyName - The lobby name.
 * @property {string} dotaLobbyId - The dota lobby id.
 * @property {string} password - The lobby password.
 * @property {string} captain1UserId - The first captain user record id.
 * @property {string} captain2UserId - The second captain user record id.
 * @property {string} matchId - The match id for the lobby.
 */

const util = require('util');
const Promise = require('bluebird');
const Sequelize = require('sequelize');

const logger = require('./logger');
const shuffle = require('./util/shuffle');
const combinations = require('./util/combinations');
const templateString = require('./util/templateString');
const capitalize = require('./util/capitalize');
const CONSTANTS = require('./constants');
const Guild = require('./guild');
const Db = require('./db');
const cache = require('./cache');
const Fp = require('./util/fp');
const AsyncLock = require('async-lock');

const lock = new AsyncLock();

const getLobby = async (lobbyOrState) => {
    if (lobbyOrState instanceof Sequelize.Model) {
        const lobby = await lobbyOrState.reload();
        cache.Lobbies.set(lobby.id, lobby);
        return lobby;
    }
    return Db.findLobbyById(lobbyOrState.id);
};

const getPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getPlayers(options) : []));

const getPlayerByUserId = lobbyOrState => async id => getPlayers({ where: { id } })(lobbyOrState).then(players => (players ? players[0] : null));

const getPlayerBySteamId = lobbyOrState => async steamId64 => getPlayers({ where: { steamId64 } })(lobbyOrState).then(players => (players ? players[0] : null));

const getPlayerByDiscordId = lobbyOrState => async discordId => getPlayers({ where: { discordId } })(lobbyOrState).then(players => (players ? players[0] : null));

const getNoFactionPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getNoFactionPlayers(options) : []));

const getFaction1Players = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getFaction1Players(options) : []));

const getFaction2Players = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getFaction2Players(options) : []));

const getRadiantPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then((lobby) => {
    if (lobby) {
        if (lobby.radiantFaction === 1) {
            return lobby.getFaction1Players(options);
        }
        return lobby.getFaction2Players(options);
    }
    return [];
});

const getDirePlayers = options => async lobbyOrState => getLobby(lobbyOrState).then((lobby) => {
    if (lobby) {
        if (lobby.radiantFaction === 2) {
            return lobby.getFaction1Players(options);
        }
        return lobby.getFaction2Players(options);
    }
    return [];
});

const getNotReadyPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getNotReadyPlayers(options) : []));

const getReadyPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getReadyPlayers(options) : []));

const mapPlayers = fn => async lobbyOrState => Fp.pipeP(getPlayers(), Fp.mapPromise(fn))(lobbyOrState);

const addPlayer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.addPlayer(user) : null));

const removePlayer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.removePlayer(user) : null));

const addPlayers = lobbyOrState => async users => Fp.mapPromise(addPlayer(lobbyOrState))(users);

const addRoleToPlayers = async lobbyState => mapPlayers(Guild.addRoleToUser(lobbyState.inhouseState.guild)(lobbyState.role))(lobbyState);

const updateLobbyPlayer = data => lobbyOrState => async id => getPlayerByUserId(lobbyOrState)(id).then(player => (player ? player.LobbyPlayer.update(data) : null));

const updateLobbyPlayerBySteamId = data => lobbyOrState => async steamId64 => getPlayerBySteamId(lobbyOrState)(steamId64).then(player => (player ? player.LobbyPlayer.update(data) : null));

const setPlayerReady = ready => updateLobbyPlayer({ ready });

const setPlayerFaction = faction => updateLobbyPlayer({ faction });

const sortQueuersAsc = async queuers => Promise.resolve(queuers).then(q => (q ? q.sort((a, b) => a.LobbyQueuer.createdAt - b.LobbyQueuer.createdAt) : []));

const getQueuers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getQueuers(options) : []));

const getActiveQueuers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getActiveQueuers(options) : [])).then(sortQueuersAsc);

const getQueuerByUserId = lobbyOrState => async id => getQueuers({ where: { id } })(lobbyOrState).then(queuers => (queuers ? queuers[0] : null));

const getQueuerBySteamId = lobbyOrState => async steamId64 => getQueuers({ where: { steamId64 } })(lobbyOrState).then(queuers => (queuers ? queuers[0] : null));

const getQueuerByDiscordId = lobbyOrState => async discordId => getQueuers({ where: { discordId } })(lobbyOrState).then(queuers => (queuers ? queuers[0] : null));

const mapQueuers = fn => async lobbyOrState => Fp.pipeP(getQueuers(), Fp.mapPromise(fn))(lobbyOrState);

const mapActiveQueuers = fn => async lobbyOrState => Fp.pipeP(getActiveQueuers(), Fp.mapPromise(fn))(lobbyOrState);

const hasQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.hasQueuer(user) : false));

const addQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.addQueuer(user) : null));

const removeQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.removeQueuer(user) : null));

const addQueuers = lobbyOrState => async users => Fp.mapPromise(addQueuer(lobbyOrState))(users);

const addRoleToQueuers = async lobbyState => mapQueuers(Guild.addRoleToUser(lobbyState.inhouseState.guild)(lobbyState.role))(lobbyState);

const updateLobbyQueuer = data => lobbyOrState => async id => getQueuerByUserId(lobbyOrState)(id).then(queuer => (queuer ? queuer.LobbyQueuer.update(data) : null));

const updateLobbyQueuerBySteamId = data => lobbyOrState => async steamId64 => getQueuerBySteamId(lobbyOrState)(steamId64).then(queuer => (queuer ? queuer.LobbyQueuer.update(data) : null));

const setQueuerActive = active => updateLobbyQueuer({ active });

const removeUserFromQueues = async user => user.setQueues([]);

const removeQueuers = async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.setQueuers([]) : null));

const removePlayers = async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.setPlayers([]) : null));

const lobbyQueuerToPlayer = lobbyOrState => async user => Fp.pipeP(Db.updateQueuesForUser(false), addPlayer(lobbyOrState))(user);

const returnPlayerToQueue = lobbyOrState => async user => Fp.pipeP(Db.updateQueuesForUser(true), removePlayer(lobbyOrState))(user);

const returnPlayersToQueue = async lobbyOrState => mapPlayers(returnPlayerToQueue(lobbyOrState))(lobbyOrState);

const isUserInGuild = guild => async (user) => {
    try {
        await Guild.resolveUser(guild)(user);
        return true;
    }
    catch (e) {
        return false;
    }
};

const cleanMissingPlayers = async lobbyState => Fp.pipeP(
    getPlayers(),
    Fp.filterPromise(Fp.negateP(isUserInGuild(lobbyState.inhouseState.guild))),
    Fp.mapPromise(Db.unvouchUser),
    Fp.mapPromise(removePlayer(lobbyState)),
)(lobbyState);

const cleanMissingQueuers = async lobbyState => Fp.pipeP(
    getQueuers(),
    Fp.filterPromise(Fp.negateP(isUserInGuild(lobbyState.inhouseState.guild))),
    Fp.mapPromise(Db.unvouchUser),
    Fp.mapPromise(removeQueuer(lobbyState)),
)(lobbyState);

const checkPlayers = async (lobbyState) => {
    try {
        const players = await getPlayers()(lobbyState);
        if (players.length !== 10) {
            return { ...lobbyState, state: CONSTANTS.STATE_FAILED, failReason: 'checkPlayers: invalid player count {e.toString()}' };
        }
        try {
            await Fp.mapPromise(Guild.resolveUser(lobbyState.inhouseState.guild))(players);
        }
        catch (e) {
            return { ...lobbyState, state: CONSTANTS.STATE_FAILED, failReason: 'checkPlayers: missing player {e.toString()}' };
        }
    }
    catch (e) {
        return { ...lobbyState, state: CONSTANTS.STATE_FAILED, failReason: 'checkPlayers: {e.toString()}' };
    }
    return { ...lobbyState };
};

const validateLobbyPlayers = async (_lobbyState) => {
    let lobbyState;
    switch (_lobbyState.state) {
    case CONSTANTS.STATE_WAITING_FOR_PLAYERS:
        // falls through
    case CONSTANTS.STATE_BOT_STARTED:
        // falls through
    case CONSTANTS.STATE_BOT_FAILED:
        // falls through
    case CONSTANTS.STATE_BOT_ASSIGNED:
        // falls through
    case CONSTANTS.STATE_WAITING_FOR_BOT:
        // falls through
    case CONSTANTS.STATE_TEAMS_SELECTED:
        // falls through
    case CONSTANTS.STATE_AUTOBALANCING:
        // falls through
    case CONSTANTS.STATE_DRAFTING_PLAYERS:
        // falls through
    case CONSTANTS.STATE_SELECTION_PRIORITY:
        // falls through
    case CONSTANTS.STATE_ASSIGNING_CAPTAINS:
        // remove lobby players and add them back as active queuers
        lobbyState = await checkPlayers(_lobbyState);
        if (lobbyState.state === CONSTANTS.STATE_FAILED) {
            logger.silly(`validateLobbyPlayers ${lobbyState.id} failed, returning players to queue`);
            await Fp.pipeP(
                getPlayers(),
                addQueuers(lobbyState),
            )(lobbyState);
            await returnPlayersToQueue(lobbyState);
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_QUEUE;
            await Db.updateLobby(lobbyState);
        }
        break;
    case CONSTANTS.STATE_CHECKING_READY:
        // falls through
    case CONSTANTS.STATE_BEGIN_READY:
        // remove lobby players and set queuers active
        lobbyState = await checkPlayers(_lobbyState);
        if (lobbyState.state === CONSTANTS.STATE_FAILED) {
            logger.silly(`validateLobbyPlayers ${lobbyState.id} failed, returning players to queue`);
            await returnPlayersToQueue(lobbyState);
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_QUEUE;
            await Db.updateLobby(lobbyState);
        }
        break;
    case CONSTANTS.STATE_WAITING_FOR_QUEUE:
        // falls through
    case CONSTANTS.STATE_NEW:
        // falls through
    default:
        logger.silly(`validateLobbyPlayers ${_lobbyState.id} default ${_lobbyState.state}`);
        return { ..._lobbyState };
    }
    logger.silly(`validateLobbyPlayers ${lobbyState.id} end ${_lobbyState.state} to ${lobbyState.state}`);
    return lobbyState;
};

const calcBalanceTeams = getPlayerRating => (players) => {
    logger.silly('calcBalanceTeams');
    const combs = combinations(players, 5);
    let bestWeightDiff = 999999;
    let bestPairs = [];
    combs.forEach((comb) => {
        const team1 = comb;
        const team2 = players.filter(i => comb.indexOf(i) < 0);
        const weight1 = team1.reduce((total, player) => total + getPlayerRating(player), 0);
        const weight2 = team2.reduce((total, player) => total + getPlayerRating(player), 0);
        const weightDiff = Math.abs(weight1 - weight2);
        if (weightDiff < bestWeightDiff) {
            bestPairs = [[team1, team2]];
            bestWeightDiff = weightDiff;
        }
        else if (weightDiff === bestWeightDiff) {
            bestPairs.push([team1, team2]);
        }
    });
    shuffle(bestPairs);
    const bestPair = bestPairs.pop();
    logger.silly(`calcBalanceTeams done. ${bestPair.length}`);
    return bestPair;
};

const setTeams = lobbyOrState => async ([team1, team2]) => {
    const lobby = await getLobby(lobbyOrState);
    team1.forEach((player) => {
        // eslint-disable-next-line no-param-reassign
        player.LobbyPlayer = { faction: 1 };
    });
    team2.forEach((player) => {
        // eslint-disable-next-line no-param-reassign
        player.LobbyPlayer = { faction: 2 };
    });
    return lobby.setPlayers(team1.concat(team2), { through: { faction: 0 } });
};

const getPlayerRatingFunction = (matchmakingSystem) => {
    logger.silly(`getPlayerRatingFunction ${matchmakingSystem}`);
    switch (matchmakingSystem) {
    case 'elo':
        return player => player.rating;
    default:
        return player => player.rankTier;
    }
};

const selectCaptainPairFromTiers = captainRankThreshold => getPlayerRating => (tiers) => {
    const keys = Object.keys(tiers).sort();
    logger.silly(`selectCaptainPairFromTiers captainRankThreshold: ${captainRankThreshold} keys: ${keys}`);
    // loop through tiers. lower tier = higher priority
    for (const key of keys) {
        logger.silly(`selectCaptainPairFromTiers checking tier ${key}`);
        const tier = tiers[key];
        // only look at tiers with at least 2 players in them
        if (tier.length >= 2) {
            logger.silly(`selectCaptainPairFromTiers tier ${key} length >= 2`);
            // get all possible pairs within the tier
            let combs = combinations(tier, 2);

            logger.silly(`selectCaptainPairFromTiers combs ${combs.length}`);
            // filter out pairs that exceed skill difference threshold
            combs = combs.filter(([player1, player2]) => Math.abs(getPlayerRating(player1) - getPlayerRating(player2)) <= captainRankThreshold);
            logger.silly(`selectCaptainPairFromTiers filtered combs ${combs.length}`);

            if (combs.length) {
                // select random pair
                shuffle(combs);
                logger.silly(`selectCaptainPairFromTiers shuffled combs ${combs.length}`);

                return combs.pop();
            }
        }
    }
    return [];
};

const sortPlayersByCaptainPriority = (playersWithCaptainPriority) => {
    const tiers = {};
    for (const [player, captainPriority] of playersWithCaptainPriority) {
        if (captainPriority < Infinity) {
            tiers[captainPriority] = tiers[captainPriority] || [];
            tiers[captainPriority].push(player);
        }
    }
    logger.silly(`sortPlayersByCaptainPriority ${Object.keys(tiers)}`);
    return tiers;
};

const roleToCaptainPriority = regexp => (role) => {
    const match = role.name.match(regexp);
    return match ? parseInt(match[1]) : null;
};

const getCaptainPriorityFromRoles = (captainRoleRegexp, roles) => {
    const regexp = new RegExp(captainRoleRegexp);
    const priorities = roles.map(roleToCaptainPriority(regexp)).filter(Number.isFinite);
    logger.silly(`getCaptainPriorityFromRoles ${captainRoleRegexp} ${roles} ${priorities}`);
    return Math.min.apply(null, priorities);
};

const playerToCaptainPriority = guild => captainRoleRegexp => async player => [player, getCaptainPriorityFromRoles(captainRoleRegexp, await Guild.getUserRoles(guild)(player))];

const getPlayersWithCaptainPriority = guild => captainRoleRegexp => async lobbyOrState => mapPlayers(playerToCaptainPriority(guild)(captainRoleRegexp))(lobbyOrState);

const getActiveQueuersWithCaptainPriority = guild => captainRoleRegexp => async lobbyOrState => mapActiveQueuers(playerToCaptainPriority(guild)(captainRoleRegexp))(lobbyOrState);

const checkQueueForCaptains = async lobbyState => Fp.pipeP(
    getActiveQueuersWithCaptainPriority(lobbyState.inhouseState.guild)(lobbyState.inhouseState.captainRoleRegexp),
    sortPlayersByCaptainPriority,
    selectCaptainPairFromTiers(lobbyState.inhouseState.captainRankThreshold)(getPlayerRatingFunction(lobbyState.inhouseState.matchmakingSystem)),
)(lobbyState);

const assignCaptains = async lobbyState => Fp.pipeP(
    getPlayersWithCaptainPriority(lobbyState.inhouseState.guild)(lobbyState.inhouseState.captainRoleRegexp),
    sortPlayersByCaptainPriority,
    selectCaptainPairFromTiers(lobbyState.inhouseState.captainRankThreshold)(getPlayerRatingFunction(lobbyState.inhouseState.matchmakingSystem)),
)(lobbyState);

const calcDefaultGameMode = defaultGameMode => (gameModePreferences) => {
    const gameModeTotals = gameModePreferences.reduce((tally, gameModePreference) => ({
        ...tally,
        [gameModePreference]: (tally[gameModePreference] || 0) + 1,
    }), {});

    let bestGameMode = defaultGameMode;
    let bestCount = gameModeTotals[defaultGameMode] || 0;
    for (const [gameMode, count] of Object.entries(gameModeTotals)) {
        if (count > bestCount) {
            bestCount = count;
            bestGameMode = gameMode;
        }
    }

    logger.silly(`calcDefaultGameMode ${util.inspect(gameModeTotals)} ${bestCount} ${bestGameMode}`);
    return bestGameMode;
};

const autoBalanceTeams = getPlayerRating => async lobbyOrState => Fp.pipeP(
    getPlayers(),
    calcBalanceTeams(getPlayerRating),
    setTeams(lobbyOrState),
)(lobbyOrState);

const getDefaultGameMode = async lobbyState => Fp.pipeP(
    mapPlayers(player => player.gameModePreference),
    calcDefaultGameMode(lobbyState.inhouseState.defaultGameMode),
)(lobbyState);

const assignGameMode = async lobbyState => ({ ...lobbyState, gameMode: await getDefaultGameMode(lobbyState) });

const getDraftingFaction = draftOrder => async (lobbyOrState) => {
    const playersNoTeam = await getNoFactionPlayers()(lobbyOrState);
    const unassignedCount = playersNoTeam.length;
    if (unassignedCount === 0) {
        return 0;
    }
    logger.silly(`getDraftingFaction ${draftOrder}`);
    return draftOrder[draftOrder.length - unassignedCount] === 'A' ? lobbyOrState.playerFirstPick : 3 - lobbyOrState.playerFirstPick;
};

const getFactionCaptain = lobbyOrState => async faction => (faction > 0 && faction <= 2 ? getPlayerByUserId(lobbyOrState)([lobbyOrState.captain1UserId, lobbyOrState.captain2UserId][faction - 1]) : null);

const isPlayerDraftable = lobbyOrState => async (player) => {
    if (player.id === lobbyOrState.captain1UserId || player.id === lobbyOrState.captain2UserId) {
        return CONSTANTS.INVALID_DRAFT_CAPTAIN;
    }
    if (player.LobbyPlayer.faction !== 0) {
        return CONSTANTS.INVALID_DRAFT_PLAYER;
    }
    return CONSTANTS.PLAYER_DRAFTED;
};

const isCaptain = lobbyState => user => user.id === lobbyState.captain1UserId || user.id === lobbyState.captain2UserId;

const isFactionCaptain = lobbyState => faction => user => user.id === lobbyState[`captain${faction}UserId`];

const formatNameForLobby = input => input.replace(/[^0-9a-z]/gi, '').substring(0, 15);

const getLobbyNameFromCaptains = async (captainName1, captainName2, counter) => {
    const name1 = formatNameForLobby(captainName1);
    const name2 = formatNameForLobby(captainName2);
    const lobbyName = `${name1}-${name2}-${counter}`;
    const lobby = await Db.findLobbyByName(lobbyName);
    if (!lobby) {
        return lobbyName;
    }

    return getLobbyNameFromCaptains(captainName1, captainName2, counter + 1);
};

const resetLobbyState = async (_lobbyState) => {
    const lobbyState = { ..._lobbyState };
    switch (lobbyState.state) {
    case CONSTANTS.STATE_MATCH_IN_PROGRESS:
        if (!lobbyState.leagueid) {
            lobbyState.state = CONSTANTS.STATE_MATCH_NO_STATS;
            logger.silly(`resetLobbyState ${_lobbyState.id} ${_lobbyState.state} to ${lobbyState.state}`);
            break;
        }
        // falls through
    case CONSTANTS.STATE_WAITING_FOR_PLAYERS:
        // falls through
    case CONSTANTS.STATE_BOT_STARTED:
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
        logger.silly(`resetLobbyState ${_lobbyState.id} ${_lobbyState.state} to ${lobbyState.state}`);
        break;
    case CONSTANTS.STATE_CHECKING_READY:
        lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
        logger.silly(`resetLobbyState ${_lobbyState.id} ${_lobbyState.state} to ${lobbyState.state}`);
        break;
    default:
        lobbyState.state = lobbyState.state || CONSTANTS.STATE_NEW;
        break;
    }
    await Db.updateLobby(lobbyState);
    return lobbyState;
};

const isReadyCheckTimedOut = lobbyState => Date.now() - lobbyState.readyCheckTime >= lobbyState.inhouseState.readyCheckTimeout;

const createLobbyState = inhouseState => ({ channel, role }) => lobby => ({
    inhouseState: { ...inhouseState },
    ...(lobby instanceof Sequelize.Model ? lobby.get({ plain: true }) : lobby),
    channel,
    role,
    channelId: channel.id,
    roleId: role.id,
});

const lobbyToLobbyState = inhouseState => async (lobby) => {
    let channel;
    let role;
    try {
        await lock.acquire(`lobby-${lobby.id}`, async () => {
            if (lobby.channelId) {
                channel = Guild.findChannel(inhouseState.guild)(lobby.channelId);
            }
            if (channel) {
                if (channel.name !== lobby.lobbyName) {
                    channel = await Guild.setChannelName(lobby.lobbyName)(channel);
                }
            }
            else {
                channel = await Guild.findOrCreateChannelInCategory(inhouseState.guild, inhouseState.category, lobby.lobbyName);
                await Db.updateLobbyChannel(lobby)(channel);
            }
        });
        await lock.acquire(`lobby-${lobby.id}`, async () => {
            if (lobby.roleId) {
                role = Guild.findRole(inhouseState.guild)(lobby.roleId);
            }
            if (role) {
                if (role.name !== lobby.lobbyName) {
                    role = await Fp.pipeP(
                        Guild.setRoleName(lobby.lobbyName),
                        Guild.setRolePermissions([]),
                        Guild.setRoleMentionable(true),
                    )(role);
                }
            }
            else {
                role = await Guild.makeRole(inhouseState.guild)([])(true)(lobby.lobbyName);
                await Db.updateLobbyRole(lobby)(role);
            }
        });
        const lobbyState = await createLobbyState(inhouseState)({ channel, role })(lobby);
        const badQueuers = await cleanMissingQueuers(lobbyState);
        const queuers = await getQueuers()(lobbyState);
        const badPlayers = await cleanMissingPlayers(lobbyState);
        const players = await getPlayers()(lobbyState);
        logger.silly(`lobbyToLobbyState ${lobby.id}, ${lobbyState.lobbyName}, ${queuers.length}, ${badQueuers.length}, ${players.length}, ${badPlayers.length}, ${lobbyState.captain1UserId}, ${lobbyState.captain2UserId}`);

        if ([CONSTANTS.STATE_NEW, CONSTANTS.STATE_WAITING_FOR_QUEUE].indexOf(lobbyState.state) !== -1) {
            await Guild.setChannelViewable(inhouseState.guild)(true)(channel);
        }
        else {
            await Guild.setChannelViewable(inhouseState.guild)(false)(channel);
            await Guild.setChannelViewableForRole(inhouseState.adminRole)(true)(channel);
            await Guild.setChannelViewableForRole(role)(true)(channel);
        }
        await addRoleToPlayers(lobbyState);
        return lobbyState;
    }
    catch (e) {
        logger.error(e);
        await Db.updateLobbyFailed(lobby)('lobbyToLobbyState: {e.toString()}');
        if (channel) {
            await channel.send('Lobby failed to load.');
            await Guild.setChannelViewable(inhouseState.guild)(false)(channel);
        }
        throw e;
    }
};

const forceLobbyDraft = async (_lobbyState, captain1, captain2) => {
    const lobbyState = { ..._lobbyState };
    const states = [
        CONSTANTS.STATE_ASSIGNING_CAPTAINS,
        CONSTANTS.STATE_SELECTION_PRIORITY,
        CONSTANTS.STATE_DRAFTING_PLAYERS,
        CONSTANTS.STATE_AUTOBALANCING,
        CONSTANTS.STATE_TEAMS_SELECTED,
        CONSTANTS.STATE_WAITING_FOR_BOT,
        CONSTANTS.STATE_BOT_ASSIGNED,
        CONSTANTS.STATE_BOT_STARTED,
        CONSTANTS.STATE_BOT_FAILED,
        CONSTANTS.STATE_WAITING_FOR_PLAYERS,
    ];
    if (states.indexOf(lobbyState.state) !== -1) {
        lobbyState.state = CONSTANTS.STATE_SELECTION_PRIORITY;
        lobbyState.selectionPriority = 0;
        lobbyState.playerFirstPick = 0;
        lobbyState.firstPick = 0;
        lobbyState.radiantFaction = 0;
        lobbyState.captain1UserId = captain1.id;
        lobbyState.captain2UserId = captain2.id;
    }
    return lobbyState;
};

const createChallengeLobby = async ({ inhouseState, captain1, captain2, challenge }) => {
    const captainMember1 = await Guild.resolveUser(inhouseState.guild)(captain1.discordId);
    const captainMember2 = await Guild.resolveUser(inhouseState.guild)(captain2.discordId);
    const lobbyName = await getLobbyNameFromCaptains(captainMember1.displayName, captainMember2.displayName, 1);
    const lobby = await Db.findOrCreateLobbyForGuild(inhouseState.guild.id, CONSTANTS.QUEUE_TYPE_CHALLENGE, lobbyName);
    await Db.setChallengeAccepted(challenge);
    await addQueuers(lobby)([captain1, captain2]);
    const lobbyState = await lobbyToLobbyState(inhouseState)(lobby);
    await Guild.setChannelPosition(1)(lobbyState.channel);
    lobbyState.captain1UserId = captain1.id;
    lobbyState.captain2UserId = captain2.id;
    await Db.updateLobby(lobbyState);
    return lobbyState;
};

const removeLobbyPlayersFromQueues = async lobbyOrState => mapPlayers(removeUserFromQueues)(lobbyOrState);

const assignLobbyName = async (lobbyState) => {
    let lobbyName = templateString(lobbyState.inhouseState.lobbyNameTemplate)({ lobbyId: lobbyState.id });
    lobbyName = lobbyName.toLowerCase().replace(/ /g, '-').replace(/[^0-9a-z-]/gi, '');
    return { ...lobbyState, lobbyName };
};

const reducePlayerToTeamCache = radiantFaction => (_teamCache, player) => {
    const teamCache = { ..._teamCache };
    teamCache[player.steamId64] = player.LobbyPlayer.faction === radiantFaction ? 1 : 2;
    return teamCache;
};

const createLobbyStateMessage = async (lobbyState) => {
    let topic = `Status: ${lobbyState.state.replace('STATE_', '').split('_').map(capitalize).join(' ')}.`;
    const queuers = await getActiveQueuers()(lobbyState);
    if (queuers.length) {
        topic += `\n${queuers.length} in queue: ${queuers.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
    }
    const captains = [];
    if (lobbyState.captain1UserId) {
        captains.push(await Db.findUserById(lobbyState.captain1UserId));
    }
    if (lobbyState.captain2UserId) {
        captains.push(await Db.findUserById(lobbyState.captain2UserId));
    }
    if (captains.length) {
        topic += `\nCaptains: ${captains.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
    }
    if (lobbyState.state === CONSTANTS.STATE_BEGIN_READY || lobbyState.state === CONSTANTS.STATE_CHECKING_READY) {
        const readyPlayers = await getReadyPlayers()(lobbyState);
        if (readyPlayers.length) {
            topic += `\n${readyPlayers.length} ready players: ${readyPlayers.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
        }
        const notReadyPlayers = await getNotReadyPlayers()(lobbyState);
        if (notReadyPlayers.length) {
            topic += `\n${notReadyPlayers.length} players not ready: ${notReadyPlayers.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
        }
    }
    if (lobbyState.state === CONSTANTS.STATE_DRAFTING_PLAYERS) {
        const playersNoTeam = await getNoFactionPlayers()(lobbyState);
        if (playersNoTeam.length) {
            topic += `\n${playersNoTeam.length} unpicked players: ${playersNoTeam.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
        }
    }
    const radiant = await getRadiantPlayers()(lobbyState);
    if (radiant.length) {
        topic += `\nRadiant: ${radiant.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
    }
    const dire = await getDirePlayers()(lobbyState);
    if (dire.length) {
        topic += `\nDire: ${dire.map(user => Guild.userToDisplayName(lobbyState.inhouseState.guild)(user)).join(', ')}.`;
    }
    if ([CONSTANTS.STATE_BOT_ASSIGNED,
        CONSTANTS.STATE_WAITING_FOR_BOT,
        CONSTANTS.STATE_BOT_STARTED,
        CONSTANTS.STATE_WAITING_FOR_PLAYERS].indexOf(lobbyState.state) !== -1) {
        topic += `\nLobby Name: ${lobbyState.lobbyName} Password: ${lobbyState.password}`;
    }
    return topic;
};

const setLobbyTopic = async (lobbyState) => {
    if (lobbyState.state === CONSTANTS.STATE_KILLED) return;
    if (!lobbyState.channel) return;
    const topic = await createLobbyStateMessage(lobbyState);
    await Guild.setChannelTopic(topic)(lobbyState.channel);
};

const assignBotToLobby = lobbyState => async (botId) => {
    await Db.assignBotToLobby(lobbyState)(botId);
    return { ...lobbyState, botId };
};

const unassignBotFromLobby = async (lobbyState) => {
    if (lobbyState.botId) {
        await Db.unassignBotFromLobby(lobbyState)(lobbyState.botId);
    }
    return { ...lobbyState, botId: null, dotaLobbyId: null };
};

module.exports = {
    getLobby,
    getPlayers,
    getPlayerByUserId,
    getPlayerBySteamId,
    getPlayerByDiscordId,
    getNoFactionPlayers,
    getFaction1Players,
    getFaction2Players,
    getRadiantPlayers,
    getDirePlayers,
    getNotReadyPlayers,
    getReadyPlayers,
    mapPlayers,
    addPlayer,
    removePlayer,
    addPlayers,
    addRoleToPlayers,
    updateLobbyPlayer,
    updateLobbyPlayerBySteamId,
    setPlayerReady,
    setPlayerFaction,
    sortQueuersAsc,
    getQueuers,
    getActiveQueuers,
    getQueuerByUserId,
    getQueuerBySteamId,
    getQueuerByDiscordId,
    mapQueuers,
    mapActiveQueuers,
    hasQueuer,
    addQueuer,
    removeQueuer,
    addQueuers,
    addRoleToQueuers,
    updateLobbyQueuer,
    updateLobbyQueuerBySteamId,
    setQueuerActive,
    removeUserFromQueues,
    removeQueuers,
    removePlayers,
    lobbyQueuerToPlayer,
    returnPlayerToQueue,
    returnPlayersToQueue,
    isUserInGuild,
    cleanMissingPlayers,
    cleanMissingQueuers,
    checkPlayers,
    validateLobbyPlayers,
    calcBalanceTeams,
    setTeams,
    getPlayerRatingFunction,
    selectCaptainPairFromTiers,
    sortPlayersByCaptainPriority,
    roleToCaptainPriority,
    getCaptainPriorityFromRoles,
    playerToCaptainPriority,
    getPlayersWithCaptainPriority,
    getActiveQueuersWithCaptainPriority,
    checkQueueForCaptains,
    assignCaptains,
    calcDefaultGameMode,
    autoBalanceTeams,
    getDefaultGameMode,
    assignGameMode,
    getDraftingFaction,
    getFactionCaptain,
    isPlayerDraftable,
    isCaptain,
    isFactionCaptain,
    formatNameForLobby,
    getLobbyNameFromCaptains,
    resetLobbyState,
    isReadyCheckTimedOut,
    createLobbyState,
    lobbyToLobbyState,
    createChallengeLobby,
    forceLobbyDraft,
    removeLobbyPlayersFromQueues,
    assignLobbyName,
    reducePlayerToTeamCache,
    createLobbyStateMessage,
    setLobbyTopic,
    assignBotToLobby,
    unassignBotFromLobby,
};
