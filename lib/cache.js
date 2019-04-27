/**
 * @module cache
 * @description Cache functions
 */

const logger = require('../lib/logger');
const config = require('../config.js');
const createSubscriber = require('pg-listen');

const channelName = config.database;
const cache = {
    Leagues: new Map(),
    Lobbies: new Map(),
};

const clear = () => {
    cache.Leagues.clear();
    cache.Lobbies.clear();
};

const subscriber = createSubscriber({ ...config, user: config.username, native: false });

const connect = async () => {
    // await subscriber.connect();
    // await subscriber.listenTo(channelName);
};

const disconnect = async () => {
    // await subscriber.close();
};

// listen to channel named after database name
subscriber.notifications.on(channelName, (payload) => {
    // Payload as passed to subscriber.notify() (see below)
    logger.silly(`Received notification in ${channelName}: ${payload}`);
    const [model, id] = payload.split('-');
    cache[model].delete(id);
});

subscriber.events.on('error', (e) => {
    logger.error(e);
    process.exit(1);
});

process.on('exit', () => {
    logger.silly('exit event. Closing cache subscriber connection');
    // subscriber.close();
});

process.on('SIGTERM', () => {
    logger.silly('SIGTERM event. Closing cache subscriber connection');
    // subscriber.close();
});

module.exports = { connect, cache, disconnect, clear };
