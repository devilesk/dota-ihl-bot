const logger = require('../logger');

// Default backoff is 10s
const DEFAULT_BACKOFF = 10000;
const DEFAULT_RATELIMIT = 1;
const STATE = {
    IDLE: 'idle',
    RUNNING: 'running',
    BLOCKED: 'blocked',
};

/**
 * @memberof module:util
 */
class Queue {
    /**
     * Creates a queue with the given backoff parameter
     * @classdesc Class representing a job queue with exponential backoff
     * @param {number} backoff - Base backoff time in milliseconds.
     * @param {number} rateLimit - Milliseconds to wait between requests.
     * @param {boolean} debug - Whether or not debug info should be logged.
     * */
    constructor(backoff, rateLimit, debug) {
        this._backoff = backoff || DEFAULT_BACKOFF;
        this._rateLimit = rateLimit || DEFAULT_RATELIMIT;
        this._debug = debug;
        this._retries = 0;
        this._state = STATE.IDLE;
        this._queue = [];
    }

    /**
     * Get the current state of the queue
     * */
    get state() {
        return this._state;
    }

    /**
     * Get enum of queue states
     * */
    static get State() {
        return STATE;
    }

    /**
     * Get the rateLimit
     * */
    get rateLimit() {
        return this._rateLimit;
    }

    /**
     * Set the rate-limit
     * @param {number} rateLimit - Milliseconds to wait between requests.
     * */
    set rateLimit(rateLimit) {
        this._rateLimit = rateLimit;
    }

    /**
     * Get the backoff rate
     * */
    get backoff() {
        return this._backoff;
    }

    /**
     * Set the backoff rate
     * @param {number} backoff - Exponential backoff time in milliseconds.
     * */
    set backoff(backoff) {
        this._backoff = backoff;
    }

    /**
     * Schedule a job for execution
     * @param {function} job - Function that needs to be executed
     * */
    schedule(job) {
        logger.debug('Scheduling job');
        this._queue.push(job);
        if (this._state === STATE.IDLE) {
            this._state = STATE.RUNNING;
            if (this._retries === 0) this._execute();
        }
    }

    /**
     * Block job execution
     * */
    block() {
        logger.debug('Blocking queue');
        this._state = STATE.BLOCKED;
    }

    /**
     * Start job execution
     * */
    release() {
        if (this._state === STATE.BLOCKED) {
            logger.debug('Activating queue');
            this._state = STATE.IDLE;

            if (this._retries === 0) this._execute();
        }
    }

    /**
     * Deletes all the jobs from the queue
     * */
    clear() {
        this._queue = [];
        this._retries = 0;
        this._state = STATE.IDLE;
    }

    _execute() {
        const job = this._queue[0];
        if (job) {
            switch (this._state) {
            case STATE.BLOCKED: {
                this._retries += 1;
                const r = Math.floor(Math.random() * (this._retries + 1));
                const self = this;
                logger.debug(`Queue blocked, sleeping for ${r * this.backoff}`);
                setTimeout(() => {
                    self._execute();
                }, r * this.backoff);
                break;
            }
            default: {
                logger.debug('Executing job');
                this._retries = 0;
                this._state = STATE.RUNNING;
                (this._queue.shift())();
                // Apply rate limiting
                setTimeout(() => {
                    this._execute();
                }, this.rateLimit);
            }
            }
        }
        else {
            logger.debug('Queue is empty, going idle');
            this._state = STATE.IDLE;
        }
    }
}

module.exports = Queue;
