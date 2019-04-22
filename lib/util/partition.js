/**
 * @memberof module:util
 */
const partition = (arr, length) => {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        if (i % length === 0) {
            result.push([]);
        }
        result[result.length - 1].push(arr[i]);
    }
    return result;
};

module.exports = partition;
