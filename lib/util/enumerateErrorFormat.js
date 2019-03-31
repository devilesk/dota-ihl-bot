const { format } = require('logform');

const enumerateErrorFormat = format((info) => {
    if (info.message instanceof Error) {
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
