/**
 * @module rankTier
 * @description Rank tier badge utility functions.
 */

const logger = require('../logger');

/**
 * @memberof module:rankTier
 */
const RANK_TO_MEDAL = {
    80: 'Immortal',
    70: 'Divine',
    60: 'Ancient',
    50: 'Legend',
    40: 'Archon',
    30: 'Crusader',
    20: 'Guardian',
    10: 'Herald',
    0: 'Uncalibrated',
};

/**
 * @memberof module:rankTier
 */
const rankTierToMedalName = (_rankTier) => {
    logger.silly(`rankTierToMedalName ${_rankTier}`);
    const rankTier = _rankTier || 0;
    const rank = Math.floor(rankTier / 10) * 10;
    const tier = rankTier % 10;
    logger.silly(`rankTierToMedalName ${rank} ${tier}`);
    let medal = 'Unknown';
    if (rank >= 0 && rank < 90) {
        medal = `${RANK_TO_MEDAL[rank]}`;
        if (rank !== 80 && rank > 0 && tier > 0) {
            medal += ` ${tier}`;
        }
    }
    return medal;
};

/**
 * @memberof module:rankTier
 */
const TEXT_TO_RANK = {
    i: 80,
    d: 70,
    an: 60,
    l: 50,
    ar: 40,
    c: 30,
    g: 20,
    h: 10,
    u: 0,
};

/**
 * @memberof module:rankTier
 */
const textToRank = text => TEXT_TO_RANK[Object.keys(TEXT_TO_RANK).filter(key => text.toLowerCase().startsWith(key))[0]];

/**
 * @memberof module:rankTier
 */
const parseRankTier = (text) => {
    let rankTier;
    let rank;
    let tier;
    let match;

    // Format: <rank string> <tier number>
    match = text.match(/^\s*([a-zA-Z]+)\s*(\d+)\s*$/);
    if (match) {
        rank = textToRank(match[1]);
        if (rank == null) {
            return null;
        }
        tier = parseInt(match[2]);
    }
    else {
        // Format: <tier number> <rank string>
        match = text.match(/^\s*(\d+)\s*([a-zA-Z]+)\s*$/);
        if (match) {
            rank = textToRank(match[2]);
            if (rank == null) {
                return null;
            }
            tier = parseInt(match[1]);
        }
        else {
            // Format: <rank string>
            match = text.match(/^\s*([a-zA-Z]+)\s*$/);
            if (match) {
                rank = textToRank(match[1]);
                if (rank == null) {
                    return null;
                }
                tier = 0;
            }
            else {
                // Format: <rankTier number>
                match = text.match(/^\s*(\d+)\s*$/);
                if (match) {
                    rankTier = parseInt(match[1]);
                    if (rankTier >= 0 && rankTier < 90) {
                        return Math.min(rankTier, 80);
                    }
                    return null;
                }
            }
        }
    }
    // Immortal rank, no tier
    if (rank === 80) {
        return rank;
    }
    // Non-immortal
    if (tier >= 0 && tier < 10) {
        if (rank > 0) {
            return rank + tier;
        }
        return 0;
    }
    return null;
};

module.exports = {
    RANK_TO_MEDAL,
    rankTierToMedalName,
    TEXT_TO_RANK,
    textToRank,
    parseRankTier,
};
