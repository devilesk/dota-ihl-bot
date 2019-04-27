/* eslint-disable object-curly-newline */
const fs = require('fs');
const Promise = require('bluebird');
const readFile = Promise.promisify(fs.readFile);

module.exports = {
    up: (queryInterface, Sequelize) => readFile('scripts/triggers_up.sql', 'utf8')
        .then(sql => queryInterface.sequelize.query(sql, { raw: true })),
    down: queryInterface => readFile('scripts/triggers_down.sql', 'utf8')
        .then(sql => queryInterface.sequelize.query(sql, { raw: true })),
};
