const logger = require('./logger');
const {
    findUserBySteamId64,
} = require('./db');

module.exports = {
    findOrCreateCategory: async (guild, categoryName) => ({ id: categoryName, name: categoryName, type: 'category' }),
    findOrCreateChannelInCategory: async (guild, category, channelName) => ({
        id: channelName, name: channelName, type: 'text', parentID: category.name,
    }),
    findOrCreateRole: guild => async roleName => ({ id: roleName, name: roleName }),
    setChannelParent: category => async channel => true,
    setChannelPosition: position => async channel => true,
    setRolePermissions: permissions => async role => true,
    setRoleMentionable: mentionable => async role => true,
    makeRole: guild => permissions => mentionable => async roleName => ({ id: roleName, name: roleName }),
    addRoleToUser: guild => roleResolvable => async userResolvable => true,
    resolveUser: guild => async (userResolvable) => {
        if (userResolvable !== null && typeof userResolvable === 'object') {
            if ('discord_id' in userResolvable) {
                discord_id = userResolvable.discord_id;
            }
            else if ('steamid_64' in userResolvable) {
                const user = await findUserBySteamId64(guild.id)(userResolvable.steamid_64);
                discord_id = user.discord_id;
            }
        }
        else if (typeof userResolvable === 'string') {
            discord_id = userResolvable;
        }
        else {
            logger.error('Discord id not found.');
            throw new InvalidArgumentException('Discord id not found.');
        }
        return { id: discord_id };
    },
    resolveRole: guild => roleResolvable => roleResolvable,
    getUserRoles: guild => async userResolvable => [],
};
