const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { format } = require('logform');
const enumerateErrorFormat = require('./util/enumerateErrorFormat');
const dotenv = require('dotenv').config();

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
    dirname: process.env.LOGGER_DIRNAME,
    filename: process.env.LOGGER_FILENAME,
    datePattern: process.env.LOGGER_DATEPATTERN,
    zippedArchive: process.env.LOGGER_ZIPPEDARCHIVE,
    maxSize: process.env.LOGGER_MAXSIZE,
    maxFiles: process.env.LOGGER_MAXFILES,
};

const logger = winston.createLogger({
    level: process.env.LOGGER_LEVEL,
    exitOnError: false,
    transports: [
        new winston.transports.Console({
            format: alignedWithColorsAndTime,
            handleExceptions: true,
        }),
        new DailyRotateFile(rotateOpts),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: process.env.LOGGER_EXCEPTIONLOGFILE }),
    ],
});

logger.transports.forEach(t => (t.silent = process.env.LOGGER_SILENT === 'true'));

module.exports = logger;
