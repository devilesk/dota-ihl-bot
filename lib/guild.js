/**
 * @module guild
 */
 
 /**
 * Discord.js Client object
 * @external Client
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/Client}
 */
 
 /**
 * Discord.js Guild object
 * @external Guild
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/Guild}
 */
 
 /**
 * Discord.js Category object
 * @external Category
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/CategoryChannel}
 */
 
 /**
 * Discord.js Channel object
 * @external GuildChannel
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/GuildChannel}
 */
 
 /**
 * Discord.js Role object
 * @external Role
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/Role}
 */
 
 /**
 * Discord.js GuildMember object
 * @external GuildMember
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/GuildMember}
 */
 
 /**
 * Discord.js User object
 * @external User
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/User}
 */
 
 /**
 * Discord.js Message object
 * @external Message
 * @see {@link https://discord.js.org/#/docs/main/11.3.2/class/Message}
 */
 
const logger = require('./logger');
const {
    findUserBySteamId64,
} = require('./db');

const findOrCreateCategory = async (guild, categoryName) => {
    let category = guild.channels.filter(guildChannel => guildChannel.type === 'category' && guildChannel.name === categoryName).first();
    if (category) {
        logger.debug(`Category exists. ${categoryName}`);
    }
    else {
        category = await guild.createChannel(categoryName, 'category');
        logger.debug(`Category created. ${categoryName}`);
    }
    return category;
};

const findOrCreateChannelInCategory = async (guild, category, channelName) => {
    const _channelName = channelName.toLowerCase();
    let channel = guild.channels.filter(_channel => _channel.name === _channelName && _channel.parentID === category.id).first();
    if (channel) {
        logger.debug(`Channel exists. ${_channelName}`);
    }
    else {
        channel = await guild.createChannel(_channelName, 'text');
        logger.debug(`Channel created. ${_channelName}`);
    }
    await channel.setParent(category);
    return channel;
};

const findOrCreateRole = async (guild, roleName) => {
    let role = guild.roles.find('name', roleName);
    if (role) {
        logger.debug(`Role exists. ${roleName}`);
    }
    else {
        role = await guild.createRole({ name: roleName });
        logger.debug(`Role created. ${roleName}`);
    }
    return role;
};

const resolveUser = async (guild, userResolvable) => {
    logger.debug(`resolveUser ${userResolvable} ${typeof userResolvable}`);
    if (userResolvable !== null && typeof userResolvable === 'object') {
        if ('discord_id' in userResolvable) {
            return guild.members.get(userResolvable.discord_id);
        }
        if ('steamid_64' in userResolvable) {
            const user = await findUserBySteamId64(guild.id)(userResolvable.steamid_64);
            return guild.members.get(user.discord_id);
        }
    }
    else if (typeof userResolvable === 'string') {
        return guild.members.get(userResolvable);
    }
    return null;
};

const resolveRole = (guild, roleResolvable) => ((typeof roleResolvable === 'string') ? guild.roles.find('name', roleResolvable) : roleResolvable);

const addRoleToUser = guild => roleResolvable => async (userResolvable) => {
    const [role, user] = await Promise.all([
        resolveRole(guild, roleResolvable),
        resolveUser(guild, userResolvable),
    ]);
    if (!role) logger.debug(`addRoleToUser role not found ${roleResolvable}`);
    if (!user) logger.debug(`addRoleToUser user not found ${userResolvable}`);
    if (role && user) {
        logger.debug(`addRoleToUser ${role.name} ${user.displayName}`);
        return user.addRole(role);
    }
    return null;
};

module.exports = {
    findOrCreateCategory,
    findOrCreateChannelInCategory,
    findOrCreateRole,
    resolveUser,
    resolveRole,
    addRoleToUser,
};
