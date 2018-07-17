module.exports = function toHHMMSS(sec_num) {
    const hours = Math.floor(sec_num / 3600);
    const minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    const seconds = sec_num - (hours * 3600) - (minutes * 60);

    return `${hours.toString().padStart(2)}:${minutes.toString().padStart(2)}:${seconds.toString().padStart(2)}`;
};
