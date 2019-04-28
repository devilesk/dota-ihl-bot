/**
 * @module cache
 * @description Cache functions
 */

const logger = require('../lib/logger');
const config = require('../config.js');
const createSubscriber = require('pg-listen');

class Cache {
    constructor() {
        this.hits = 0;
        this._enabled = true;
        this._map = new Map();
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        this._enabled = value;
    }

    clear() {
        this._map.clear();
    }

    has(id) {
        return this._map.has(id);
    }

    get(id) {
        const item = this._map.get(id);
        if (item) this.hits += 1;
        return item;
    }

    set(id, item) {
        if (this._enabled) this._map.set(id, item);
    }

    delete(id) {
        if (this._enabled) this._map.delete(id);
    }

    values() {
        return this._map.values();
    }
}

class DatabaseCache {
    constructor(config) {
        this.config = config;
        this.channelName = 'db_notifications';
        this._enabled = true;
        this._connected = false;
        this._subscriber = null;
        this._caches = {
            Leagues: new Cache(),
            Lobbies: new Cache(),
            Users: new Cache(),
        };
        this.onProcessExit = () => {
            logger.silly('exit event. Closing cache subscriber connection');
            this.disconnect();
        };
        process.on('exit', this.onProcessExit);
    }

    get hits() {
        return Object.values(this._caches).reduce((total, cache) => total + cache.hits, 0);
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        this._enabled = value;
        for (const cache of Object.values(this._caches)) {
            cache.enabled = value;
        }
    }

    clear() {
        for (const cache of Object.values(this._caches)) {
            cache.clear();
        }
    }

    get Leagues() {
        return this._caches.Leagues;
    }

    get Lobbies() {
        return this._caches.Lobbies;
    }

    get Users() {
        return this._caches.Users;
    }

    get connected() {
        return this._connected;
    }

    async connect() {
        logger.silly(`cache connect, already connected: ${this.connected}`);
        if (this.connected) return;
        this._subscriber = createSubscriber({ ...this.config, user: this.config.username, native: false });
        await this._subscriber.connect();
        await this._subscriber.listenTo(this.channelName);
        this._connected = true;
        this._subscriber.notifications.on(this.channelName, (payload) => {
            if (payload.operation !== 'INSERT') {
                logger.silly(`Received notification in ${this.channelName}: ${payload.operation} ${payload.table} ${payload.data.id} ${payload.data.updatedAt}`);
                const id = parseInt(payload.data.id);
                if (this[payload.table].has(id)) {
                    if (Date.parse(this[payload.table].get(id).updatedAt) !== Date.parse(payload.data.updatedAt)) {
                        this[payload.table].delete(id);
                    }
                }
            }
        });
        this._subscriber.events.on('error', (e) => {
            logger.error(e);
            process.exit(1);
        });
    }

    async disconnect() {
        logger.silly(`cache disconnect, already connected: ${this.connected}`);
        if (this.connected) {
            this._connected = false;
            await this._subscriber.close();
            this._subscriber = null;
        }
    }

    async destroy() {
        logger.silly('cache destroy');
        await this.disconnect();
        process.off('exit', this.onProcessExit);
    }
}

module.exports = new DatabaseCache(config);
