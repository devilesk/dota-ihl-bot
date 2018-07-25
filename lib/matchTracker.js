/**
 * @module matchTracker
 */
 
const Promise = require('bluebird');
const rp = require('request-promise');
const util = require('util');
// const convertor = require('steam-id-convertor');
const heroes = require('dotaconstants/build/heroes.json');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const dotenv = require('dotenv').config();
const {
    findAllInProgressLobbies, findMatch,
} = require('./db');
const {
    getPlayers, getLobby,
} = require('./lobby');

const getHeroNameFromId = id => (heroes[id] ? heroes[id].localized_name : 'Unknown');

const createMatchPlayerDetails = data => `**${data.personaname}**
*${getHeroNameFromId(data.hero_id)}* (${data.level})
KDA: ${data.kills}/${data.deaths}/${data.assists}
CS: ${data.last_hits}/${data.denies}
Gold: ${data.total_gold} (${data.gold_per_min}/min)`;

const getOpenDotaMatchDetails = async (match_id) => {
    logger.debug(`matchTracker getOpenDotaMatchDetails ${match_id}`);
    const options = {
        uri: `https://api.opendota.com/api/matches/${match_id}`,
        json: true,
    };
    const data = await rp(options);
    return data && !data.error ? data : null;
};

const getValveMatchDetails = async (match_id) => {
    logger.debug(`matchTracker getValveMatchDetails ${match_id}`);
    const options = {
        uri: `http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/?key=${process.env.STEAM_API_KEY}&match_id=${match_id}`,
        json: true,
    };
    const data = await rp(options);
    return data && data.result && !data.result.error ? data : null;
};

const setMatchDetails = async (lobbyState) => {
    logger.debug(`matchTracker setMatchDetails match_id ${lobbyState.match_id}`);
    const lobby = await getLobby(lobbyState);
    logger.debug(`matchTracker setMatchDetails lobby.id ${lobby.id}`);
    const data = {};
    if (!lobby.odata_data) {
        data.odota_data = await getOpenDotaMatchDetails(lobbyState.match_id);
    }
    if (!lobby.valve_data) {
        data.valve_data = await getValveMatchDetails(lobbyState.match_id);
    }
    if (data.odota_data || data.valve_data) {
        await lobby.update(data);
    }
    logger.debug(`matchTracker setMatchDetails ${util.inspect(lobby)}`);
    return lobby;
};

const createMatchEndMessageEmbed = async (match_id) => {
    const lobby = await findMatch(match_id);
    const valve_data = lobby.valve_data.result;
    const odota_data = lobby.odota_data;

    const players = await getPlayers()({ lobby_name: lobby.lobby_name });
    const radiant_captain_steamid_64 = lobby.captain_1;
    const radiant_captain_player = players.find(player => player.steamid_64 === radiant_captain_steamid_64);

    const dire_captain_steamid_64 = lobby.captain_2;
    const dire_captain_player = players.find(player => player.steamid_64 === dire_captain_steamid_64);

    // const radiant_drafter_steamid_64 = convertor.to64(valve_data.radiant_captain);
    // const radiant_drafter_player = players.find(player => player.steamid_64 === radiant_drafter_steamid_64);

    // const dire_drafter_steamid_64 = convertor.to64(valve_data.dire_captain);
    // const dire_drafter_player = players.find(player => player.steamid_64 === dire_drafter_steamid_64);
    logger.debug(`createMatchEndMessageEmbed radiant_name ${valve_data.radiant_name}`);
    logger.debug(`createMatchEndMessageEmbed dire_name ${valve_data.dire_name}`);
    const radiant_name = valve_data.radiant_name || radiant_captain_player.nickname;
    const dire_name = valve_data.dire_name || dire_captain_player.nickname;

    const radiant_details = odota_data.players.filter(player => player.isRadiant).map(player => createMatchPlayerDetails(player)).join('\t\n\n');
    const dire_details = odota_data.players.filter(player => !player.isRadiant).map(player => createMatchPlayerDetails(player)).join('\t\n\n');

    const title = `${radiant_name} vs ${dire_name}`;

    const winner = valve_data.radiant_win ? radiant_name : dire_name;

    const gold_lead = odota_data.radiant_gold_adv[odota_data.radiant_gold_adv.length - 1];
    const gold_lead_team = gold_lead > 0 ? 'Radiant' : 'Dire';

    const xp_lead = odota_data.radiant_xp_adv[odota_data.radiant_xp_adv.length - 1];
    const xp_lead_team = xp_lead > 0 ? 'Radiant' : 'Dire';

    const duration_hours = Math.floor(odota_data.duration / 3600);
    const duration_minutes = Math.floor((odota_data.duration % 3600) / 60);
    const duration_seconds = odota_data.duration % 3600 % 60;

    const duration = `${duration_hours > 0 ? `${duration_hours.toString()}:` : ''}${`${duration_minutes.toString().padStart(2, '0')}:`}${duration_seconds.toString().padStart(2, '0')}`;

    const description = `**${winner}** Victory!
Match ID: ${match_id} [DB](https://www.dotabuff.com/matches/${match_id})/[OD](https://www.opendota.com/matches/${match_id})`;

    const match_details = `**Duration:** ${duration}
**Score:** ${valve_data.radiant_score} - ${valve_data.dire_score}
**Gold:** +${Math.abs(gold_lead)} ${gold_lead_team}
**Exp:** +${Math.abs(xp_lead)} ${xp_lead_team}
`;
    return {
        embed: {
            color: 3447003,
            title,
            description,
            fields: [
                {
                    name: 'Match Details',
                    value: match_details,
                },
                {
                    name: radiant_name,
                    value: radiant_details,
                    inline: true,
                },
                {
                    name: dire_name,
                    value: dire_details,
                    inline: true,
                },
            ],
        },
    };
};

/**
 * Match tracker checks opendota and valve match apis to see if a match has finished
 * and saves the match data to the database. */
class MatchTracker {
    /**
     * Creates an inhouse league match tracker.
     * @param {external:EventEmitter} eventEmitter - The event listener object.
     */
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.started = false;
    }

    /**
     * The match polling loop
     * @async
     * @fires module:ihlManager~EVENT_MATCH_ENDED
     */
    async run() {
        logger.debug('matchTracker run');
        while (this.started) {
            const lobbyStates = await findAllInProgressLobbies();
            await Promise.mapSeries(
                lobbyStates,
                async (lobbyState) => {
                    const _lobbyState = await Promise.delay(1000, lobbyState);
                    const lobby = await setMatchDetails(_lobbyState);
                    if (lobby.odota_data && lobby.valve_data) {
                        this.eventEmitter.emit(CONSTANTS.EVENT_MATCH_ENDED, _lobbyState);
                    }
                },
            )
                .delay(3000);
        }
    }

    /**
     * Starts the match polling loop
     * @async
     */
    async start() {
        logger.debug('matchTracker start');
        this.started = true;
        await this.run();
    }

    /**
     * Stops the match polling loop
     * @async
     */
    stop() {
        this.started = false;
    }
}

module.exports = {
    getOpenDotaMatchDetails,
    getValveMatchDetails,
    setMatchDetails,
    createMatchEndMessageEmbed,
    MatchTracker,
};
