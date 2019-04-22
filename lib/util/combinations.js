/**
 * @memberof module:util
 */
const combinations = (arr, size) => {
    const len = arr.length;

    if (size > len) return [];
    if (!size) return [[]];
    if (size === len) return [arr];

    return arr.reduce((acc, val, i) => {
        const res = combinations(arr.slice(i + 1), size - 1)
            .map(comb => [val].concat(comb));
        return acc.concat(res);
    }, []);
};

module.exports = combinations;
