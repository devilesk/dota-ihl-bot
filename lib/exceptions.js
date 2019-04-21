class MyError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class DiscordRoleNotFound extends MyError {}

class DiscordUserNotFound extends MyError {}

class InvalidArgumentException extends MyError {}

class MissingEnvironmentVariable extends MyError {}

class MissingDiscordPermission extends MyError {}

module.exports = {
    MyError,
    DiscordRoleNotFound,
    DiscordUserNotFound,
    InvalidArgumentException,
    MissingEnvironmentVariable,
    MissingDiscordPermission,
};
