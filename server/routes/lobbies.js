const logger = require('../../lib/logger');
const Router = require('koa-router');
const db = require('../../models');

const router = new Router();
const BASE_URL = '/api/v1/lobbies';

router.get(BASE_URL, async (ctx) => {
    try {
        const data = await db.Lobby.findAll({ limit: ctx.request.query.limit || 10, offset: ctx.request.query.offset || 0 }, { order: [['id', 'ASC']] });
        ctx.body = {
            status: 'success',
            data,
        };
    }
    catch (e) {
        logger.error(e);
    }
});

router.get(`${BASE_URL}/:id`, async (ctx) => {
    try {
        const data = await db.Lobby.findOne({ where: { id: ctx.params.id } });
        if (data) {
            ctx.body = {
                status: 'success',
                data,
            };
        }
        else {
            ctx.status = 404;
            ctx.body = {
                status: 'error',
                message: 'That lobby does not exist.',
            };
        }
    }
    catch (e) {
        logger.error(e);
    }
});

module.exports = router;
