/**
 * @module guild
 */

/**
 * External namespace for discord.js classes.
 * @external discordjs
 * @category discord.js
 * @see {@link https://discord.js.org/#/docs/main/stable/general/welcome}
 */

/**
 * External Discord.js Client class.
 * @class Client
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/Client}
 */

/**
 * External Discord.js Guild class.
 * @class Guild
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/Guild}
 */

/**
 * External Discord.js CategoryChannel class.
 * @class CategoryChannel
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/CategoryChannel}
 */

/**
 * External Discord.js GuildChannel class.
 * @class GuildChannel
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/GuildChannel}
 */

/**
 * External Discord.js Role class.
 * @class Role
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/Role}
 */

/**
 * External Discord.js GuildMember class.
 * @class GuildMember
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/GuildMember}
 */

/**
 * External Discord.js User class.
 * @class User
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/User}
 */

/**
 * External Discord.js Message class.
 * @class Message
 * @category discord.js
 * @memberof external:discordjs
 * @see {@link https://discord.js.org/#/docs/main/stable/class/Message}
 */

const logger = require('./logger');
const {
    GuildMember,
    Role,
    User,
} = require('discord.js');
const Db = require('./db');
const Exceptions = require('./exceptions');
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

const findOrCreateCategory = async (guild, categoryName) => lock.acquire(`category-${guild.id}-${categoryName}`, async () => guild.channels.filter(guildChannel => guildChannel.type === 'category' && guildChannel.name === categoryName).first()
        || guild.createChannel(categoryName, 'category'));

const findOrCreateChannelInCategory = async (guild, category, channelName) => {
    const _channelName = channelName.toLowerCase();
    return lock.acquire(`channel-${guild.id}-${category.id}-${_channelName}`, async () => {
        const channel = guild.channels.filter(_channel => _channel.name === _channelName && _channel.parentID === category.id).first()
            || await guild.createChannel(_channelName, 'text');
        return setChannelParent(category)(channel);
    });
};

const findOrCreateRole = guild => async roleName => lock.acquire(`role-${guild.id}-${roleName}`, async () => (guild.roles.find(r => r.name === roleName) || guild.createRole({ name: roleName })));

const findChannel = guild => channelId => guild.channels.find(channel => channel.id === channelId);

const findRole = guild => roleId => guild.roles.find(role => role.id === roleId);

const makeRole = guild => permissions => mentionable => async roleName => Fp.pipeP(
    findOrCreateRole(guild),
    setRolePermissions(permissions),
    setRoleMentionable(mentionable),
)(roleName);

/**
 * @throws {InvalidArgumentException} Argument userResolvable must be a Discord.js GuildMember, discord id string,
 * an object with a discordId string property, or an object with a steamId64 property.
 * @throws {DiscordUserNotFound} Will throw if a guild member is not found with the discord id.
 */
const resolveUser = guild => async (userResolvable) => {
    let discordId;
    if (userResolvable instanceof GuildMember) {
        return userResolvable;
    }
    if (userResolvable instanceof User) {
        discordId = userResolvable.id;
    }
    else if (userResolvable !== null && typeof userResolvable === 'object') {
        if ('discordId' in userResolvable) {
            discordId = userResolvable.discordId;
        }
        else if ('steamId64' in userResolvable) {
            const user = await Db.findUserBySteamId64(guild.id)(userResolvable.steamId64);
            discordId = user.discordId;
        }
    }
    else if (typeof userResolvable === 'string') {
        discordId = userResolvable;
    }
    else {
        logger.error('Discord id not found.');
        throw new Exceptions.InvalidArgumentException('Discord id not found.');
    }

    const member = guild.members.get(discordId);
    if (member) {
        return member;
    }

    logger.error(`Discord ID ${discordId} not found.`);
    throw new Exceptions.DiscordUserNotFound(`Discord ID ${discordId} not found.`);
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

        throw new Exceptions.DiscordRoleNotFound(`Discord role ${roleResolvable} not found.`);
    }
    else if (roleResolvable instanceof Role) {
        return roleResolvable;
    }
    else if (roleResolvable !== null && typeof roleResolvable === 'object') {
        return resolveRole(guild)(roleResolvable.name);
    }
    else {
        logger.error('Not a valid role name or Role instance.');
        throw new Exceptions.InvalidArgumentException('Not a valid role name or Role instance.');
    }
};

const addRoleToUser = guild => roleResolvable => async (userResolvable) => {
    const [role, user] = await Promise.all([
        resolveRole(guild)(roleResolvable),
        resolveUser(guild)(userResolvable),
    ]);
    // logger.silly(`addRoleToUser ${role.name} ${user.displayName}`);
    return user.addRole(role);
};

const getUserRoles = guild => async (userResolvable) => {
    const user = await resolveUser(guild)(userResolvable);
    return user.roles;
};

const setChannelViewable = guild => value => async channel => channel.overwritePermissions(guild.roles.get(guild.id), { VIEW_CHANNEL: value });

const setChannelViewableForRole = role => value => async channel => channel.overwritePermissions(role, { VIEW_CHANNEL: value });

const sendChannelMessage = ({ channel }) => async text => channel.send(text).catch(logger.error);

const userToDisplayName = guild => user => guild.members.get(user.discordId).displayName;

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
