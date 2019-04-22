/**
 * @memberof module:util
 */
const keyMirror = (keys) => {
    const _keys = Array.isArray(keys) ? keys : Object.keys(keys);
    const mirror = {};
    _keys.forEach((v) => {
        mirror[v] = v;
    });
    return mirror;
};

module.exports = keyMirror;
