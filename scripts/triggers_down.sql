DROP TRIGGER IF EXISTS league_notify ON "Leagues";
DROP TRIGGER IF EXISTS lobby_notify ON "Lobbies";
DROP TRIGGER IF EXISTS user_notify ON "Users";
DROP FUNCTION IF EXISTS notify_trigger();