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
    User,
} = require('discord.js');
const {
    findUserBySteamId64,
} = require('./db');
const {
    DiscordRoleNotFound, DiscordUserNotFound, InvalidArgumentException,
} = require('./exceptions');
const {
    pipeP,
} = require('./util/fp');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const findOrCreateCategory = async (guild, categoryName) => {
    return lock.acquire(`category-${guild.id}-${categoryName}`, async () => {
        let category = guild.channels.filter(guildChannel => guildChannel.type === 'category' && guildChannel.name === categoryName).first();
        if (category) {
            logger.debug(`Category exists. ${categoryName}`);
        }
        else {
            category = await guild.createChannel(categoryName, 'category');
            logger.debug(`Category created. ${categoryName}`);
        }
        return category;
    });
};

const findOrCreateChannelInCategory = async (guild, category, channelName) => {
    const _channelName = channelName.toLowerCase();
    return lock.acquire(`channel-${guild.id}-${category.id}-${_channelName}`, async () => {
        let channel = guild.channels.filter(_channel => _channel.name === _channelName && _channel.parentID === category.id).first();
        if (channel) {
            logger.debug(`Channel exists. ${_channelName}`);
        }
        else {
            channel = await guild.createChannel(_channelName, 'text');
            logger.debug(`Channel created. ${_channelName}`);
        }
        return setChannelParent(category)(channel);
    });
};

const findOrCreateRole = guild => async roleName => {
    return lock.acquire(`role-${guild.id}-${roleName}`, async () => {
        let role = guild.roles.find(role => role.name === roleName);
        if (role) {
            logger.debug(`Role exists. ${roleName}`);
        }
        else {
            role = await guild.createRole({ name: roleName });
            logger.debug(`Role created. ${roleName}`);
        }
        return role;
    });
};

const findChannel = guild => channelId => guild.channels.find(channel => channel.id === channelId);

const findRole = guild => roleId => guild.roles.find(role => role.id === roleId);

const makeRole = guild => permissions => mentionable => async (roleName) => pipeP(
    findOrCreateRole(guild),
    setRolePermissions([]),
    setRoleMentionable(true),
)(roleName);

const setChannelName = name => async channel => channel.setName(name);

const setChannelParent = category => async channel => channel.setParent(category);

const setChannelPosition = position => async channel => channel.setPosition(position);

const setChannelTopic = topic => async channel => channel.setTopic(topic);

const setRolePermissions = permissions => async role => role.setPermissions(permissions);

const setRoleMentionable = mentionable => async role => role.setMentionable(mentionable);

const setRoleName = name => async role => role.setName(name);

/**
 * @throws {InvalidArgumentException} Argument userResolvable must be a Discord.js GuildMember, discord id string,
 * an object with a discord_id string property, or an object with a steamid_64 property.
 * @throws {DiscordUserNotFound} Will throw if a guild member is not found with the discord id.
 */
const resolveUser = guild => async userResolvable => {
    let discord_id;
    if (userResolvable instanceof GuildMember) {
        return userResolvable;
    }
    else if (userResolvable instanceof User) {
        discord_id = userResolvable.id;
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
const resolveRole = guild => roleResolvable => {
    if (typeof roleResolvable === 'string') {
        const role = guild.roles.find(role => role.name === roleResolvable);
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
    else if (roleResolvable !== null && typeof roleResolvable === 'object') {
        return resolveRole(guild)(roleResolvable.name);
    }
    else {
        logger.error('Not a valid role name or Role instance.');
        throw new InvalidArgumentException('Not a valid role name or Role instance.');
    }
}

const addRoleToUser = guild => roleResolvable => async (userResolvable) => {
    const [role, user] = await Promise.all([
        resolveRole(guild)(roleResolvable),
        resolveUser(guild)(userResolvable),
    ]);
    logger.debug(`addRoleToUser ${role.name} ${user.displayName}`);
    return user.addRole(role);
};

const getUserRoles = guild => async userResolvable => {
    const user = await resolveUser(guild)(userResolvable);
    return user.roles;
}

const setChannelViewable = guild => value => async channel => channel.overwritePermissions(guild.roles.get(guild.id), {
    VIEW_CHANNEL: value
});

module.exports = {
    findOrCreateCategory,
    findOrCreateChannelInCategory,
    findOrCreateRole,
    findChannel,
    findRole,
    makeRole,
    setChannelName,
    setChannelParent,
    setChannelPosition,
    setChannelTopic,
    setRolePermissions,
    setRoleMentionable,
    setRoleName,
    resolveUser,
    resolveRole,
    addRoleToUser,
    getUserRoles,
    setChannelViewable,
};
