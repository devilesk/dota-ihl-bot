/**
 * @module cache
 * @description Cache functions
 */

const logger = require('../lib/logger');
const config = require('../config.js');
const createSubscriber = require('pg-listen');

const channelName = 'db_notifications';
const cache = {
    Leagues: new Map(),
    Lobbies: new Map(),
};

const clear = () => {
    cache.Leagues.clear();
    cache.Lobbies.clear();
};

const subscriber = createSubscriber({ ...config, user: config.username, native: false });

let connected = false;

const connect = async () => {
    if (!connected) {
        await subscriber.connect();
        await subscriber.listenTo(channelName);
        connected = true;
    }
};

const disconnect = async () => {
    if (connected) {
        await subscriber.close();
        connected = false;
    }
};

subscriber.notifications.on(channelName, (payload) => {
    if (payload.operation !== 'INSERT') {
        logger.silly(`Received notification in ${channelName}: ${payload.operation} ${payload.table} ${payload.data.id} ${payload.data.updatedAt}`);
        const id = parseInt(payload.data.id);
        if (cache[payload.table].has(id)) {
            if (Date.parse(cache[payload.table].get(id).updatedAt) !== Date.parse(payload.data.updatedAt)) {
                cache[payload.table].delete(id);
            }
        }
    }
});

subscriber.events.on('error', (e) => {
    logger.error(e);
    process.exit(1);
});

process.on('exit', () => {
    logger.silly('exit event. Closing cache subscriber connection');
    subscriber.close();
});

connect();

module.exports = { connect, cache, disconnect, clear, connected };
