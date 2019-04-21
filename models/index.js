const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const logger = require('../lib/logger');

const basename = path.basename(__filename);
const config = require('../config.js');

config.logging = config.logging ? (str) => {
    logger.debug(str);
} : false;

class Database {
    constructor(_config) {
        this.config = _config;
        this.Sequelize = Sequelize;
        this.init();
    }

    init() {
        if (this.sequelize) return;

        this.sequelize = new Sequelize(this.config.database, this.config.username, this.config.password, this.config);

        fs
            .readdirSync(__dirname)
            .filter(file => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
            .forEach((file) => {
                const model = this.sequelize.import(path.join(__dirname, file));
                this[model.name] = model;
            });

        Object.keys(this).forEach((modelName) => {
            if (this[modelName].associate) {
                this[modelName].associate(this);
            }
        });
    }

    async close() {
        await this.sequelize.close();
        this.sequelize = null;
    }
}

module.exports = new Database(config);
