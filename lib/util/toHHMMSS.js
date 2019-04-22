/**
 * @memberof module:util
 */
const toHHMMSS = (numSec) => {
    const hours = Math.floor(numSec / 3600);
    const minutes = Math.floor((numSec - (hours * 3600)) / 60);
    const seconds = Math.round(numSec - (hours * 3600) - (minutes * 60));

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

module.exports = toHHMMSS;
