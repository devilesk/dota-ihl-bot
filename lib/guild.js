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
 * @external CategoryChannel
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
 
const util = require('util');
const logger = require('./logger');
const {
    GuildMember,
    Role,
} = require('discord.js');
const {
    findUserBySteamId64,
} = require('./db');
const {
    DiscordRoleNotFound, DiscordUserNotFound, InvalidArgumentException,
} = require('./exceptions');

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

const setChannelParent = async (channel, category) => channel.setParent(category);

const setRolePermissions = async (role, permissions) => await role.setPermissions(permissions);

const setRoleMentionable = async (role, mentionable) => await role.setMentionable(mentionable);

/**
 * @throws {InvalidArgumentException} Argument userResolvable must be a Discord.js GuildMember, discord id string,
 * an object with a discord_id string property, or an object with a steamid_64 property.
 * @throws {DiscordUserNotFound} Will throw if a guild member is not found with the discord id.
 */
const resolveUser = async (guild, userResolvable) => {
    logger.debug(`resolveUser ${userResolvable} ${typeof userResolvable}`);
    let discord_id;
    if (userResolvable instanceof GuildMember) {
        return userResolvable;
    }
    else if (userResolvable !== null && typeof userResolvable === 'object') {
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
    
    const member = guild.members.get(discord_id);
    if (member) {
        return member;
    }
    else {
        logger.error(`Discord ID ${discord_id} not found.`);
        throw new DiscordUserNotFound(`Discord ID ${discord_id} not found.`);
    }
};

/**
 * @throws {InvalidArgumentException} Argument userResolvable must be a role name string or a Discord.js Role object.
 * @throws {DiscordUserNotFound} Will throw if a role with the given name is not found.
 */
const resolveRole = (guild, roleResolvable) => {
    if (typeof roleResolvable === 'string') {
        const role = guild.roles.find('name', roleResolvable);
        if (role) {
            return role;
        }
        else {
            throw new DiscordRoleNotFound(`Discord role ${roleResolvable} not found.`);
        }
    }
    else if (roleResolvable instanceof Role) {
        return roleResolvable;
    }
    else {
        logger.error('Not a valid role name or Role instance.');
        throw new InvalidArgumentException('Not a valid role name or Role instance.');
    }
}

const addRoleToUser = guild => roleResolvable => async (userResolvable) => {
    const [role, user] = await Promise.all([
        resolveRole(guild, roleResolvable),
        resolveUser(guild, userResolvable),
    ]);
    logger.debug(`addRoleToUser ${role.name} ${user.displayName}`);
    return user.addRole(role);
};

const getUserRoles = async (guild, userResolvable) => {
    const user = await resolveUser(guild, userResolvable);
    return user.roles;
}

const setChannelPrivate = guild => async channel => channel.overwritePermissions(guild.roles.get(guild.id), {
    VIEW_CHANNEL: false
});

module.exports = {
    findOrCreateCategory,
    findOrCreateChannelInCategory,
    findOrCreateRole,
    setChannelParent,
    setRolePermissions,
    setRoleMentionable,
    resolveUser,
    resolveRole,
    addRoleToUser,
    getUserRoles,
    setChannelPrivate,
};
