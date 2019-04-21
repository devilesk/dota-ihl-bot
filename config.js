require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });

module.exports = {
    operatorsAliases: false,
    database: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.DB_LOG_SQL === 'true',
}