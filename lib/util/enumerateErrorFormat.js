const { format } = require('logform');

/**
 * @memberof module:util
 */
const enumerateErrorFormat = format((info) => {
    if (info.message instanceof Error) {
        // eslint-disable-next-line no-param-reassign
        info.message = Object.assign({
            message: info.message.message,
            stack: info.message.stack,
        }, info.message);
    }

    if (info instanceof Error) {
        return Object.assign({
            message: info.message,
            stack: info.stack,
        }, info);
    }

    return info;
});

module.exports = enumerateErrorFormat;
