const got = require('got');
const logger = require('../logger');

/**
 * @memberof module:util
 */
const convertVanity = async (base) => {
    try {
        const response = await got(`http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_API_KEY}&vanityurl=${encodeURIComponent(base)}`, { json: true });
        const result = response.body.response;
        if (!result || result.success !== 1) {
            logger.error(`Unsuccessful call to ResolveVanityURL api: ${base}`);
            return null;
        }
        return result.steamid;
    }
    catch (e) {
        logger.error(e);
        return null;
    }
};

module.exports = convertVanity;
