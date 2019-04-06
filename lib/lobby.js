/**
 * @module lobby
 */

/**
 * @typedef module:lobby.LobbyState
 * @type {Object}
 * @property {external:Guild} guild - The discord guild the lobby belongs to.
 * @property {external:CategoryChannel} category - The discord inhouse category.
 * @property {external:GuildChannel} channel - The discord lobby channel.
 * @property {external:Role} role - The discord lobby role.
 * @property {number} ready_check_timeout - Duration in milliseconds before lobby ready timeout.
 * @property {number} captain_rank_threshold - Maximum rank difference between captains.
 * @property {string} captain_role_regexp - Regular expression string for captain roles.
 * @property {number} ready_check_time - Start of lobby ready timer.
 * @property {string} state - The lobby state.
 * @property {number} bot_id - The record id of the bot hosting the lobby.
 * @property {string} queue_type - The lobby queue type.
 * @property {string} lobby_name - The lobby name.
 * @property {string} lobby_id - The in-game lobby id.
 * @property {string} password - The lobby password.
 * @property {string} captain_1_user_id - The first captain user record id.
 * @property {string} captain_2_user_id - The second captain user record id.
 * @property {string} match_id - The match id for the lobby.
 */

const util = require('util');
const Promise = require('bluebird');
const { hri } = require('human-readable-ids');
const Sequelize = require('sequelize');

const logger = require('./logger');
const shuffle = require('./util/shuffle');
const combinations = require('./util/combinations');
const capitalize = require('./util/capitalize');
const CONSTANTS = require('./constants');
const {
    makeRole,
    findOrCreateChannelInCategory,
    findChannel,
    findRole,
    addRoleToUser,
    resolveUser,
    getUserRoles,
    setChannelName,
    setChannelViewable,
    setChannelPosition,
    setChannelTopic,
    setRolePermissions,
    setRoleMentionable,
    setRoleName,
} = require('./guild');
const {
    findLobbyByName,
    findLobbyById,
    findUserById,
    findOrCreateLobbyForGuild,
    updateLobbyName,
    updateLobbyChannel,
    updateLobbyRole,
    updateLobby,
    updateLobbyFailed,
    findUnassignedBot,
    setChallengeAccepted,
    destroyChallengeBetweenUsers,
    destroyAllAcceptedChallengeForUser,
    updateQueuesForUser,
    unvouchUser,
} = require('./db');
const {
    pipeP,
    mapPromise,
    filterPromise,
    allPromise,
    negateP,
} = require('./util/fp');
const AsyncLock = require('async-lock');

const lock = new AsyncLock();

const getLobby = async lobbyOrState => (lobbyOrState instanceof Sequelize.Model ? lobbyOrState : findLobbyById(lobbyOrState.id));

const getPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getPlayers(options) : []));

const getPlayerByUserId = lobbyOrState => async id => getPlayers({ where: { id } })(lobbyOrState).then(players => (players ? players[0] : null));

const getPlayerBySteamId = lobbyOrState => async steamid_64 => getPlayers({ where: { steamid_64 } })(lobbyOrState).then(players => (players ? players[0] : null));

const getPlayerByDiscordId = lobbyOrState => async discord_id => getPlayers({ where: { discord_id } })(lobbyOrState).then(players => (players ? players[0] : null));

const getNoTeamPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getNoTeamPlayers(options) : []));

const getTeam1Players = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getTeam1Players(options) : []));

const getTeam2Players = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getTeam2Players(options) : []));

const getNotReadyPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getNotReadyPlayers(options) : []));

const getReadyPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getReadyPlayers(options) : []));

const mapPlayers = fn => async lobbyOrState => pipeP(getPlayers(), mapPromise(fn))(lobbyOrState);

const addPlayer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.addPlayer(user) : null));

const removePlayer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.removePlayer(user) : null));

const addPlayers = lobbyOrState => async users => mapPromise(addPlayer(lobbyOrState))(users);

const addRoleToPlayers = async lobbyState => mapPlayers(addRoleToUser(lobbyState.inhouseState.guild)(lobbyState.role))(lobbyState);

const updateLobbyPlayer = data => lobbyOrState => async id => getPlayerByUserId(lobbyOrState)(id).then(player => (player ? player.LobbyPlayer.update(data) : null));

const updateLobbyPlayerBySteamId = data => lobbyOrState => async steamid_64 => getPlayerBySteamId(lobbyOrState)(steamid_64).then(player => (player ? player.LobbyPlayer.update(data) : null));

const setPlayerReady = ready => updateLobbyPlayer({ ready });

const setPlayerTeam = faction => updateLobbyPlayer({ faction });

const sortQueuersAsc = async queuers => Promise.resolve(queuers).then(q => (q ? q.sort((a, b) => a.LobbyQueuer.created_at - b.LobbyQueuer.created_at) : []));

const getQueuers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getQueuers(options) : []));

const getActiveQueuers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.getActiveQueuers(options) : [])).then(sortQueuersAsc);

const getQueuerByUserId = lobbyOrState => async id => getQueuers({ where: { id } })(lobbyOrState).then(queuers => (queuers ? queuers[0] : null));

const getQueuerBySteamId = lobbyOrState => async steamid_64 => getQueuers({ where: { steamid_64 } })(lobbyOrState).then(queuers => (queuers ? queuers[0] : null));

const getQueuerByDiscordId = lobbyOrState => async discord_id => getQueuers({ where: { discord_id } })(lobbyOrState).then(queuers => (queuers ? queuers[0] : null));

const mapQueuers = fn => async lobbyOrState => pipeP(getQueuers(), mapPromise(fn))(lobbyOrState);

const mapActiveQueuers = fn => async lobbyOrState => pipeP(getActiveQueuers(), mapPromise(fn))(lobbyOrState);

const hasQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.hasQueuer(user) : false));

const addQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.addQueuer(user) : null));

const removeQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.removeQueuer(user) : null));

const addQueuers = lobbyOrState => async users => mapPromise(addQueuer(lobbyOrState))(users);

const addRoleToQueuers = async lobbyState => mapQueuers(addRoleToUser(lobbyState.inhouseState.guild)(lobbyState.role))(lobbyState);

const updateLobbyQueuer = data => lobbyOrState => async id => getQueuerByUserId(lobbyOrState)(id).then(queuer => (queuer ? queuer.LobbyQueuer.update(data) : null));

const updateLobbyQueuerBySteamId = data => lobbyOrState => async steamid_64 => getQueuerBySteamId(lobbyOrState)(steamid_64).then(queuer => (queuer ? queuer.LobbyQueuer.update(data) : null));

const setQueuerActive = active => updateLobbyQueuer({ active });

const removeUserFromQueues = async user => user.setQueues([]);

const removeQueuers = async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.setQueuers([]) : null));

const removePlayers = async lobbyOrState => getLobby(lobbyOrState).then(lobby => (lobby ? lobby.setPlayers([]) : null));

const lobbyQueuerToPlayer = lobbyOrState => async user => pipeP(updateQueuesForUser(false), addPlayer(lobbyOrState))(user);

const returnPlayerToQueue = lobbyOrState => async user => pipeP(updateQueuesForUser(true), removePlayer(lobbyOrState))(user);

const returnPlayersToQueue = async lobbyOrState => mapPlayers(returnPlayerToQueue(lobbyOrState))(lobbyOrState);

const isUserInGuild = guild => async (user) => {
    try {
        await resolveUser(guild)(user);
        return true;
    }
    catch (e) {
        return false;
    }
};

const cleanMissingPlayers = async lobbyState => pipeP(
    getPlayers(),
    filterPromise(negateP(isUserInGuild(lobbyState.inhouseState.guild))),
    mapPromise(unvouchUser),
    mapPromise(removePlayer(lobbyState)),
)(lobbyState);

const cleanMissingQueuers = async lobbyState => pipeP(
    getQueuers(),
    filterPromise(negateP(isUserInGuild(lobbyState.inhouseState.guild))),
    mapPromise(unvouchUser),
    mapPromise(removeQueuer(lobbyState)),
)(lobbyState);

const checkPlayers = async (lobbyState) => {
    try {
        const players = await getPlayers()(lobbyState);
        if (players.length !== 10) {
            return { ...lobbyState, state: CONSTANTS.STATE_FAILED, fail_reason: 'checkPlayers: invalid player count {e.toString()}' };
        }
        try {
            await allPromise(resolveUser(lobbyState.inhouseState.guild));
        }
        catch (e) {
            return { ...lobbyState, state: CONSTANTS.STATE_FAILED, fail_reason: 'checkPlayers: missing player {e.toString()}' };
        }
    }
    catch (e) {
        return { ...lobbyState, state: CONSTANTS.STATE_FAILED, fail_reason: 'checkPlayers: {e.toString()}' };
    }
    return { ...lobbyState };
};

const validateLobbyPlayers = async (_lobbyState) => {
    logger.debug(`validateLobbyPlayers ${_lobbyState.id} ${_lobbyState.state}`);
    let lobbyState;
    switch (_lobbyState.state) {
    case CONSTANTS.STATE_WAITING_FOR_PLAYERS:
    case CONSTANTS.STATE_BOT_STARTED:
    case CONSTANTS.STATE_BOT_FAILED:
    case CONSTANTS.STATE_BOT_ASSIGNED:
    case CONSTANTS.STATE_WAITING_FOR_BOT:
    case CONSTANTS.STATE_TEAMS_SELECTED:
    case CONSTANTS.STATE_AUTOBALANCING:
    case CONSTANTS.STATE_DRAFTING_PLAYERS:
    case CONSTANTS.STATE_CHOOSING_SIDE:
    case CONSTANTS.STATE_ASSIGNING_CAPTAINS:
        // remove lobby players and add them back as active queuers
        lobbyState = await checkPlayers(_lobbyState);
        if (lobbyState.state === CONSTANTS.STATE_FAILED) {
            logger.debug(`validateLobbyPlayers ${lobbyState.id} failed, returning players to queue`);
            await pipeP(
                getPlayers(),
                addQueuers(lobbyState),
            )(lobbyState);
            await returnPlayersToQueue(lobbyState);
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_QUEUE;
            await updateLobby(lobbyState);
        }
        break;
    case CONSTANTS.STATE_CHECKING_READY:
    case CONSTANTS.STATE_BEGIN_READY:
        // remove lobby players and set queuers active
        lobbyState = await checkPlayers(_lobbyState);
        if (lobbyState.state === CONSTANTS.STATE_FAILED) {
            logger.debug(`validateLobbyPlayers ${lobbyState.id} failed, returning players to queue`);
            await returnPlayersToQueue(lobbyState);
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_QUEUE;
            await updateLobby(lobbyState);
        }
        break;
    case CONSTANTS.STATE_WAITING_FOR_QUEUE:
    case CONSTANTS.STATE_NEW:
    default:
        logger.debug(`validateLobbyPlayers ${_lobbyState.id} default ${_lobbyState.state}`);
        return { ..._lobbyState };
    }
    logger.debug(`validateLobbyPlayers ${lobbyState.id} end ${_lobbyState.state} to ${lobbyState.state}`);
    return lobbyState;
};

const calcBalanceTeams = getPlayerRating => (players) => {
    logger.debug('calcBalanceTeams');
    const combs = combinations(players, 5);
    let best_weight_diff = 999999;
    let best_pairs = [];
    combs.forEach((comb) => {
        const team_1 = comb;
        const team_2 = players.filter(i => comb.indexOf(i) < 0);
        const weight_1 = team_1.reduce((total, player) => total + getPlayerRating(player), 0);
        const weight_2 = team_2.reduce((total, player) => total + getPlayerRating(player), 0);
        const weight_diff = Math.abs(weight_1 - weight_2);
        if (weight_diff < best_weight_diff) {
            best_pairs = [[team_1, team_2]];
            best_weight_diff = weight_diff;
        }
        else if (weight_diff === best_weight_diff) {
            best_pairs.push([team_1, team_2]);
        }
    });
    shuffle(best_pairs);
    const best_pair = best_pairs.pop();
    logger.debug(`calcBalanceTeams done. ${best_pair.length}`);
    return best_pair;
};

const setTeams = lobbyOrState => async ([team_1, team_2]) => {
    const lobby = await getLobby(lobbyOrState);
    team_1.forEach(player => player.LobbyPlayer = { faction: 1 });
    team_2.forEach(player => player.LobbyPlayer = { faction: 2 });
    return lobby.setPlayers(team_1.concat(team_2), { through: { faction: 0 } });
};

const selectCaptainPairFromTiers = captain_rank_threshold => getPlayerRating => (tiers) => {
    logger.debug(`selectCaptainPairFromTiers ${captain_rank_threshold}`);
    const keys = Object.keys(tiers).sort();

    // loop through tiers. lower tier = higher priority
    for (const key of keys) {
        logger.debug(`selectCaptainPairFromTiers checking tier ${key}`);
        const tier = tiers[key];
        // only look at tiers with at least 2 players in them
        if (tier.length >= 2) {
            logger.debug(`selectCaptainPairFromTiers tier ${key} length >= 2`);
            // get all possible pairs within the tier
            let combs = combinations(tier, 2);
            
            logger.debug(`selectCaptainPairFromTiers combs ${combs.length}`);
            // filter out pairs that exceed skill difference threshold
            combs = combs.filter(([player_1, player_2]) => Math.abs(getPlayerRating(player_1) - getPlayerRating(player_2)) <= captain_rank_threshold);
            logger.debug(`selectCaptainPairFromTiers filtered combs ${combs.length}`);
            
            if (combs.length) {
                // select random pair
                shuffle(combs);
                logger.debug(`selectCaptainPairFromTiers shuffled combs ${combs.length}`);
                
                return combs.pop();
            }
        }
    }
    return [];
};

const sortPlayersByCaptainPriority = (playersWithCaptainPriority) => {
    const tiers = {};
    for (const [player, captain_priority] of playersWithCaptainPriority) {
        if (captain_priority < Infinity) {
            tiers[captain_priority] = tiers[captain_priority] || [];
            tiers[captain_priority].push(player);
        }
    }
    logger.debug(`sortPlayersByCaptainPriority ${Object.keys(tiers)}`);
    return tiers;
};

const roleToCaptainPriority = regexp => (role) => {
    const match = role.name.match(regexp);
    if (match) {
        return parseInt(match[1]);
    }
};

const getCaptainPriorityFromRoles = (captain_role_regexp, roles) => {
    const regexp = new RegExp(captain_role_regexp);
    const priorities = roles.map(roleToCaptainPriority(regexp)).filter(Number.isFinite);
    logger.debug(`getCaptainPriorityFromRoles ${captain_role_regexp} ${roles} ${priorities}`);
    return Math.min.apply(null, priorities);
};

const playerToCaptainPriority = getUserRoles => guild => captain_role_regexp => async player => [player, getCaptainPriorityFromRoles(captain_role_regexp, await getUserRoles(guild)(player))];

const getPlayersWithCaptainPriority = getUserRoles => guild => captain_role_regexp => async lobbyOrState => mapPlayers(playerToCaptainPriority(getUserRoles)(guild)(captain_role_regexp))(lobbyOrState);

const getActiveQueuersWithCaptainPriority = getUserRoles => guild => captain_role_regexp => async lobbyOrState => mapActiveQueuers(playerToCaptainPriority(getUserRoles)(guild)(captain_role_regexp))(lobbyOrState);

const checkQueueForCaptains = getUserRoles => async lobbyState => pipeP(
    getActiveQueuersWithCaptainPriority(getUserRoles)(lobbyState.inhouseState.guild)(lobbyState.inhouseState.captain_role_regexp),
    sortPlayersByCaptainPriority,
    selectCaptainPairFromTiers(lobbyState.inhouseState.captain_rank_threshold)(getPlayerRatingFunction(lobbyState.inhouseState.matchmaking_system)),
)(lobbyState);

const assignCaptains = getUserRoles => async lobbyState => pipeP(
    getPlayersWithCaptainPriority(getUserRoles)(lobbyState.inhouseState.guild)(lobbyState.inhouseState.captain_role_regexp),
    sortPlayersByCaptainPriority,
    selectCaptainPairFromTiers(lobbyState.inhouseState.captain_rank_threshold)(getPlayerRatingFunction(lobbyState.inhouseState.matchmaking_system)),
)(lobbyState);

const calcDefaultGameMode = default_game_mode => (game_mode_preferences) => {
    const game_mode_totals = game_mode_preferences.reduce((tally, game_mode_preference) => {
        tally[game_mode_preference] = (tally[game_mode_preference] || 0) + 1;
        return tally;
    }, {});

    let best_game_mode = default_game_mode;
    let best_count = game_mode_totals[default_game_mode] || 0;
    for (const [game_mode, count] of Object.entries(game_mode_totals)) {
        if (count > best_count) {
            best_count = count;
            best_game_mode = game_mode;
        }
    }

    logger.debug(`calcDefaultGameMode ${util.inspect(game_mode_totals)} ${best_count} ${best_game_mode}`);
    return best_game_mode;
};

const autoBalanceTeams = getPlayerRating => async lobbyOrState => pipeP(
    getPlayers(),
    calcBalanceTeams(getPlayerRating),
    setTeams(lobbyOrState),
)(lobbyOrState);

const getDefaultGameMode = async lobbyState => pipeP(
    mapPlayers(player => player.game_mode_preference),
    calcDefaultGameMode(lobbyState.inhouseState.default_game_mode),
)(lobbyState);

const assignGameMode = async lobbyState => ({ ...lobbyState, game_mode: await getDefaultGameMode(lobbyState) });

const getDraftingFaction = draftOrder => async (lobbyOrState) => {
    const playersNoTeam = await getNoTeamPlayers()(lobbyOrState);
    const unassignedCount = playersNoTeam.length;
    if (unassignedCount === 0) {
        return 0;
    }
    logger.debug(`getDraftingFaction ${draftOrder}`);
    return draftOrder[draftOrder.length - unassignedCount] === 'A' ? 1 : 2;
};

const getFactionCaptain = lobbyOrState => async faction => (faction > 0 && faction <= 2 ? getPlayerByUserId(lobbyOrState)([lobbyOrState.captain_1_user_id, lobbyOrState.captain_2_user_id][faction - 1]) : null);

const isPlayerDraftable = lobbyOrState => async (player) => {
    if (player.id === lobbyOrState.captain_1_user_id || player.id === lobbyOrState.captain_2_user_id) {
        return CONSTANTS.INVALID_DRAFT_CAPTAIN;
    }
    if (player.LobbyPlayer.faction !== 0) {
        return CONSTANTS.INVALID_DRAFT_PLAYER;
    }
    return CONSTANTS.PLAYER_DRAFTED;
};

const isCaptain = lobbyState => user => user.id === lobbyState.captain_1_user_id || user.id === lobbyState.captain_2_user_id;

const isFactionCaptain = lobbyState => faction => user => user.id === lobbyState[`captain_${faction}_user_id`];

const formatNameForLobby = input => input.replace(/[^0-9a-z]/gi, '').substring(0, 15);

const getLobbyNameFromCaptains = async (captain_name_1, captain_name_2, counter) => {
    const name1 = formatNameForLobby(captain_name_1);
    const name2 = formatNameForLobby(captain_name_2);
    const lobby_name = `${name1}-${name2}-${counter}`;
    const lobby = await findLobbyByName(lobby_name);
    if (!lobby) {
        return lobby_name;
    }

    return getLobbyNameFromCaptains(captain_name_1, captain_name_2, counter + 1);
};

const resetLobbyState = async (_lobbyState) => {
    const lobbyState = { ..._lobbyState };
    switch (lobbyState.state) {
    case CONSTANTS.STATE_WAITING_FOR_PLAYERS:
    case CONSTANTS.STATE_BOT_STARTED:
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
        logger.debug(`resetLobbyState ${_lobbyState.id} ${_lobbyState.state} to ${lobbyState.state}`);
        break;
    case CONSTANTS.STATE_CHECKING_READY:
        lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
        logger.debug(`resetLobbyState ${_lobbyState.id} ${_lobbyState.state} to ${lobbyState.state}`);
        break;
    default:
        lobbyState.state = lobbyState.state || CONSTANTS.STATE_NEW;
        break;
    }
    await updateLobby(lobbyState);
    return lobbyState;
};

const isReadyCheckTimedOut = lobbyState => Date.now() - lobbyState.ready_check_time >= lobbyState.inhouseState.ready_check_timeout;

const createLobbyState = inhouseState => ({ channel, role }) => lobby => ({
    inhouseState: { ...inhouseState },
    ...(lobby instanceof Sequelize.Model ? lobby.get({ plain: true }) : lobby),
    channel,
    role,
});

const lobbyToLobbyState = inhouseState => async (lobby) => {
    let channel;
    let role;
    try {
        logger.debug(`lobbyToLobbyState ${lobby.id}`);
        await lock.acquire(`lobby-${lobby.id}`, async () => {
            if (lobby.channel_id) {
                channel = findChannel(inhouseState.guild)(lobby.channel_id);
            }
            if (channel) {
                if (channel.name !== lobby.lobby_name) {
                    channel = await setChannelName(lobby.lobby_name)(channel);
                }
            }
            else {
                channel = await findOrCreateChannelInCategory(inhouseState.guild, inhouseState.category, lobby.lobby_name);
                lobby.channel_id = channel.id;
                await updateLobbyChannel(lobby)(channel);
            }
        });
        console.log('channel', channel.id, channel.name);
        await setChannelViewable(inhouseState.guild)(true)(channel);
        await lock.acquire(`lobby-${lobby.id}`, async () => {
            if (lobby.role_id) {
                role = findRole(inhouseState.guild)(lobby.role_id);
            }
            if (role) {
                if (role.name !== lobby.lobby_name) {
                    role = await pipeP(
                        setRoleName(lobby.lobby_name),
                        setRolePermissions([]),
                        setRoleMentionable(true),
                    )(role);
                }
            }
            else {
                role = await makeRole(inhouseState.guild)([])(true)(lobby.lobby_name);
                lobby.role_id = role.id;
                await updateLobbyRole(lobby)(role);
            }
        });

        const lobbyState = await createLobbyState(inhouseState)({ channel, role })(lobby);

        const badQueuers = await cleanMissingQueuers(lobbyState);
        const queuers = await getQueuers()(lobbyState);
        logger.debug(`lobbyToLobbyState ${lobby.id} queuers ${queuers.length}, badQueuers ${badQueuers.length}, ${lobbyState.lobby_name}`);

        const badPlayers = await cleanMissingPlayers(lobbyState);
        const players = await getPlayers()(lobbyState);
        logger.debug(`lobbyToLobbyState ${lobby.id} players ${players.length}, badPlayers ${badPlayers.length}, ${lobbyState.lobby_name}`);

        logger.debug(`lobbyToLobbyState ${lobby.id} ${lobby.captain_1_user_id} ${lobby.captain_2_user_id} ${lobbyState.captain_1_user_id} ${lobbyState.captain_2_user_id}`);

        await addRoleToPlayers(lobbyState);
        logger.debug(`lobbyToLobbyState ${lobby.id} loaded`);
        return lobbyState;
    }
    catch (e) {
        logger.log({ level: 'error', message: e });
        await updateLobbyFailed(lobby)('lobbyToLobbyState: {e.toString()}');
        if (channel) {
            await channel.send('Lobby failed to load.');
            const everyoneRole = inhouseState.guild.roles.get(inhouseState.guild.id);
            await setChannelViewable(inhouseState.guild)(false)(channel);
        }
        throw e;
    }
};

const forceLobbyDraft = async (_lobbyState, captain_1, captain_2) => {
    const lobbyState = { ..._lobbyState };
    const states = [
        CONSTANTS.STATE_ASSIGNING_CAPTAINS,
        CONSTANTS.STATE_CHOOSING_SIDE,
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
        lobbyState.state = CONSTANTS.STATE_CHOOSING_SIDE;
        lobbyState.captain_1_user_id = captain_1.id;
        lobbyState.captain_2_user_id = captain_2.id;
        lobbyState.bot_id = null;
    }
    return lobbyState;
};

const createChallengeLobby = async ({
    inhouseState, captain_1, captain_2, challenge,
}) => {
    const captain_member_1 = await resolveUser(inhouseState.guild)(captain_1.discord_id);
    const captain_member_2 = await resolveUser(inhouseState.guild)(captain_2.discord_id);
    const lobby_name = await getLobbyNameFromCaptains(captain_member_1.displayName, captain_member_2.displayName, 1);
    const lobby = await findOrCreateLobbyForGuild(inhouseState.guild.id, CONSTANTS.QUEUE_TYPE_CHALLENGE, lobby_name);
    lobby.captain_1_user_id = captain_1.id;
    lobby.captain_2_user_id = captain_2.id;
    logger.debug(`createChallengeLobby ${lobby.captain_1_user_id} ${lobby.captain_2_user_id}`);
    await setChallengeAccepted(challenge);
    await addQueuers(lobby)([captain_1, captain_2]);
    const lobbyState = await lobbyToLobbyState(inhouseState)(lobby);
    await setChannelPosition(1)(lobbyState.channel);
    await updateLobby(lobbyState);
};

const removeLobbyPlayersFromQueues = async lobbyOrState => mapPlayers(removeUserFromQueues)(lobbyOrState);

const assignLobbyName = async (lobbyOrState) => {
    if (lobbyOrState.queue_type === CONSTANTS.QUEUE_TYPE_CHALLENGE) {
        return { ...lobbyOrState };
    }
    const lobby_name = hri.random();
    const lobby = await findLobbyByName(lobby_name);
    if (!lobby) {
        await updateLobbyName(lobbyOrState)(lobby_name);
        return { ...lobbyOrState, lobby_name };
    }
    return assignLobbyName(lobbyOrState);
};

const getPlayerRatingFunction = (matchmaking_system) => {
    logger.debug(`getPlayerRatingFunction ${matchmaking_system}`);
    switch (matchmaking_system) {
    case 'elo':
        return player => player.rating;
    default:
        return player => player.rank_tier;
    }
};

const reducePlayerToFactionCache = (_factionCache, player) => {
    logger.debug('reducePlayerToFactionCache');
    const factionCache = { ..._factionCache };
    factionCache[player.steamid_64] = player.LobbyPlayer.faction;
    return factionCache;
};

const setLobbyTopic = async (lobbyState) => {
    let topic = `Status: ${lobbyState.state.replace('STATE_', '').split('_').map(capitalize).join(' ')}.`;
    const queuers = await getActiveQueuers()(lobbyState);
    if (queuers.length) {
        topic += `\n${queuers.length} in queue: ${queuers.map(user => lobbyState.inhouseState.guild.members.get(user.discord_id).displayName).join(', ')}.`;
    }
    const captains = [];
    if (lobbyState.captain_1_user_id) {
        captains.push(await findUserById(lobbyState.captain_1_user_id));
    }
    if (lobbyState.captain_2_user_id) {
        captains.push(await findUserById(lobbyState.captain_2_user_id));
    }
    if (captains.length) {
        topic += `\nCaptains: ${captains.map(user => lobbyState.inhouseState.guild.members.get(user.discord_id).displayName).join(', ')}.`;
    }
    const readyPlayers = await getReadyPlayers()(lobbyState);
    if (readyPlayers.length) {
        topic += `\n${readyPlayers.length} ready players: ${readyPlayers.map(user => lobbyState.inhouseState.guild.members.get(user.discord_id).displayName).join(', ')}.`;
    }
    const notReadyPlayers = await getNotReadyPlayers()(lobbyState);
    if (notReadyPlayers.length) {
        topic += `\n${notReadyPlayers.length} players not ready: ${notReadyPlayers.map(user => lobbyState.inhouseState.guild.members.get(user.discord_id).displayName).join(', ')}.`;
    }
    const team1 = await getTeam1Players()(lobbyState);
    if (team1.length) {
        topic += `\nTeam 1: ${team1.map(user => lobbyState.inhouseState.guild.members.get(user.discord_id).displayName).join(', ')}.`;
    }
    const team2 = await getTeam2Players()(lobbyState);
    if (team2.length) {
        topic += `\nTeam 1: ${team2.map(user => lobbyState.inhouseState.guild.members.get(user.discord_id).displayName).join(', ')}.`;
    }
    logger.debug(`setLobbyTopic ${topic}`);
    await setChannelTopic(topic)(lobbyState.channel);
};

module.exports = {
    getLobby,
    getPlayers,
    getPlayerByUserId,
    getPlayerBySteamId,
    getPlayerByDiscordId,
    getNoTeamPlayers,
    getTeam1Players,
    getTeam2Players,
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
    setPlayerTeam,
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
    getPlayerRatingFunction,
    reducePlayerToFactionCache,
    setLobbyTopic,
};
