const winston = require('winston');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');
const { format } = require('logform');
const enumerateErrorFormat = require('./util/enumerateErrorFormat');

const alignedWithColorsAndTime = format.combine(
    format.colorize(),
    format.timestamp(),
    format.align(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
);

const rotateOpts = {
    format: format.combine(
        format.timestamp(),
        enumerateErrorFormat(),
        format.json(),
    ),
    dirname: process.env.LOGGER_DIRNAME || 'logs',
    filename: process.env.LOGGER_DAILY_FILENAME || 'application-%DATE%.log',
    datePattern: process.env.LOGGER_DATEPATTERN || 'YYYY-MM-DD-HH',
    zippedArchive: process.env.LOGGER_ZIPPEDARCHIVE === 'true',
    maxSize: process.env.LOGGER_MAXSIZE || '20m',
    maxFiles: process.env.LOGGER_MAXFILES || '14d',
};

const logger = winston.createLogger({
    level: process.env.LOGGER_LEVEL || 'debug',
    exitOnError: false,
    transports: [
        new winston.transports.Console({
            format: alignedWithColorsAndTime,
            handleExceptions: true,
        }),
        new winston.transports.File({
            format: alignedWithColorsAndTime,
            filename: path.join(process.env.LOGGER_DIRNAME || 'logs', process.env.LOGGER_FILENAME || 'application.log'),
        }),
        new DailyRotateFile(rotateOpts),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(process.env.LOGGER_DIRNAME || 'logs', process.env.LOGGER_EXCEPTIONLOGFILE || 'exceptions.log') }),
    ],
});

logger.transports.forEach((t) => {
    // eslint-disable-next-line no-param-reassign
    t.silent = (process.env.LOGGER_SILENT === 'true');
});

logger.error = (item) => {
    const message = item instanceof Error
        ? item.stack.replace('\n', '').replace('    ', ' - trace: ')
        : item;
    logger.log({ level: 'error', message });
};

process.on('unhandledRejection', logger.error);

module.exports = logger;
