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

const logger = require('./logger');
const {
    GuildMember,
    Role,
    User,
} = require('discord.js');
const Db = require('./db');
const {
    DiscordRoleNotFound, DiscordUserNotFound, InvalidArgumentException,
} = require('./exceptions');
const Fp = require('./util/fp');
const AsyncLock = require('async-lock');

const lock = new AsyncLock();

const setChannelName = name => async channel => channel.setName(name);

const setChannelParent = category => async channel => channel.setParent(category);

const setChannelPosition = position => async channel => channel.setPosition(position);

const setChannelTopic = topic => async channel => channel.setTopic(topic);

const setRolePermissions = permissions => async role => role.setPermissions(permissions);

const setRoleMentionable = mentionable => async role => role.setMentionable(mentionable);

const setRoleName = name => async role => role.setName(name);

const findOrCreateCategory = async (guild, categoryName) => lock.acquire(`category-${guild.id}-${categoryName}`, async () => {
    return guild.channels.filter(guildChannel => guildChannel.type === 'category' && guildChannel.name === categoryName).first()
        || await guild.createChannel(categoryName, 'category');
});

const findOrCreateChannelInCategory = async (guild, category, channelName) => {
    const _channelName = channelName.toLowerCase();
    return lock.acquire(`channel-${guild.id}-${category.id}-${_channelName}`, async () => {
        let channel = guild.channels.filter(_channel => _channel.name === _channelName && _channel.parentID === category.id).first()
            || await guild.createChannel(_channelName, 'text');
        return setChannelParent(category)(channel);
    });
};

const findOrCreateRole = guild => async roleName => lock.acquire(`role-${guild.id}-${roleName}`, async () => (guild.roles.find(r => r.name === roleName) || await guild.createRole({ name: roleName })));

const findChannel = guild => channelId => guild.channels.find(channel => channel.id === channelId);

const findRole = guild => roleId => guild.roles.find(role => role.id === roleId);

const makeRole = guild => permissions => mentionable => async roleName => Fp.pipeP(
    findOrCreateRole(guild),
    setRolePermissions(permissions),
    setRoleMentionable(mentionable),
)(roleName);

/**
 * @throws {InvalidArgumentException} Argument userResolvable must be a Discord.js GuildMember, discord id string,
 * an object with a discord_id string property, or an object with a steamid_64 property.
 * @throws {DiscordUserNotFound} Will throw if a guild member is not found with the discord id.
 */
const resolveUser = guild => async (userResolvable) => {
    let discord_id;
    if (userResolvable instanceof GuildMember) {
        return userResolvable;
    }
    if (userResolvable instanceof User) {
        discord_id = userResolvable.id;
    }
    else if (userResolvable !== null && typeof userResolvable === 'object') {
        if ('discord_id' in userResolvable) {
            discord_id = userResolvable.discord_id;
        }
        else if ('steamid_64' in userResolvable) {
            const user = await Db.findUserBySteamId64(guild.id)(userResolvable.steamid_64);
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

    logger.error(`Discord ID ${discord_id} not found.`);
    throw new DiscordUserNotFound(`Discord ID ${discord_id} not found.`);
};

/**
 * @throws {InvalidArgumentException} Argument userResolvable must be a role name string or a Discord.js Role object.
 * @throws {DiscordUserNotFound} Will throw if a role with the given name is not found.
 */
const resolveRole = guild => (roleResolvable) => {
    if (typeof roleResolvable === 'string') {
        const role = guild.roles.find(r => r.name === roleResolvable);
        if (role) {
            return role;
        }

        throw new DiscordRoleNotFound(`Discord role ${roleResolvable} not found.`);
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
};

const addRoleToUser = guild => roleResolvable => async (userResolvable) => {
    const [role, user] = await Promise.all([
        resolveRole(guild)(roleResolvable),
        resolveUser(guild)(userResolvable),
    ]);
    // logger.debug(`addRoleToUser ${role.name} ${user.displayName}`);
    return user.addRole(role);
};

const getUserRoles = guild => async (userResolvable) => {
    const user = await resolveUser(guild)(userResolvable);
    return user.roles;
};

const setChannelViewable = guild => value => async channel => channel.overwritePermissions(guild.roles.get(guild.id), {
    VIEW_CHANNEL: value,
});

const setChannelViewableForRole = role => value => async channel => channel.overwritePermissions(role, {
    VIEW_CHANNEL: value,
});

const sendChannelMessage = ({ channel }) => async text => channel.send(text).catch(logger.error);

const userToDisplayName = guild => user => guild.members.get(user.discord_id).displayName;

module.exports = {
    setChannelName,
    setChannelParent,
    setChannelPosition,
    setChannelTopic,
    setRolePermissions,
    setRoleMentionable,
    setRoleName,
    findOrCreateCategory,
    findOrCreateChannelInCategory,
    findOrCreateRole,
    findChannel,
    findRole,
    makeRole,
    resolveUser,
    resolveRole,
    addRoleToUser,
    getUserRoles,
    setChannelViewable,
    setChannelViewableForRole,
    sendChannelMessage,
    userToDisplayName,
};
