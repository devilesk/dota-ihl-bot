module.exports = function keyMirror(keys) {
    keys = Array.isArray(keys) ? keys : Object.keys(keys);
    const mirror = {};
    keys.forEach(v => mirror[v] = v);
    return mirror;
};
