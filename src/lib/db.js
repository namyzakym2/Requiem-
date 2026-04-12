import Database from "better-sqlite3";
const db = new Database("bot.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS leveling (
    userId TEXT,
    guildId TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    xb INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    PRIMARY KEY (userId, guildId)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    channelId TEXT,
    category TEXT,
    staffId TEXT,
    status TEXT DEFAULT 'open',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ticket_categories (
    guildId TEXT,
    categoryName TEXT,
    roleId TEXT,
    PRIMARY KEY (guildId, categoryName)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS rewards (
    guildId TEXT,
    level INTEGER,
    roleId TEXT,
    PRIMARY KEY (guildId, level)
  );

  CREATE TABLE IF NOT EXISTS ticket_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketId INTEGER,
    userId TEXT,
    channelId TEXT,
    category TEXT,
    action TEXT, -- 'created' or 'closed'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS aliases (
    guildId TEXT,
    aliasName TEXT,
    originalCommand TEXT,
    PRIMARY KEY (guildId, aliasName)
  );

  CREATE TABLE IF NOT EXISTS protection_settings (
    guildId TEXT PRIMARY KEY,
    antiLink INTEGER DEFAULT 0,
    antiSpam INTEGER DEFAULT 0,
    antiRaid INTEGER DEFAULT 0,
    antiBot INTEGER DEFAULT 0,
    antiChannelControl INTEGER DEFAULT 0,
    antiRoleControl INTEGER DEFAULT 0,
    antiNuke INTEGER DEFAULT 0,
    nukeLimit INTEGER DEFAULT 3,
    counterNuke INTEGER DEFAULT 0,
    logChannel TEXT,
    verifiedRoleId TEXT
  );

  CREATE TABLE IF NOT EXISTS tokens (
    userId TEXT,
    guildId TEXT,
    accessToken TEXT,
    refreshToken TEXT,
    expiresAt INTEGER,
    PRIMARY KEY (userId, guildId)
  );

  CREATE TABLE IF NOT EXISTS welcome_settings (
    guildId TEXT PRIMARY KEY,
    channelId TEXT,
    message TEXT DEFAULT 'Welcome {user} to {server}!',
    imageEnabled INTEGER DEFAULT 1,
    dmEnabled INTEGER DEFAULT 0,
    dmMessage TEXT DEFAULT 'Welcome to {server}!',
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS leveling_settings (
    guildId TEXT PRIMARY KEY,
    message TEXT DEFAULT 'Congratulations {user}! You leveled up to **Level {level}**! \u{1F389}',
    channelId TEXT,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS auto_roles (
    guildId TEXT,
    roleId TEXT,
    PRIMARY KEY (guildId, roleId)
  );

  CREATE TABLE IF NOT EXISTS badwords (
    guildId TEXT,
    word TEXT,
    PRIMARY KEY (guildId, word)
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    reason TEXT,
    moderatorId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS auto_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    UNIQUE(guildId, trigger)
  );

  CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    emoji TEXT NOT NULL,
    roleId TEXT NOT NULL,
    UNIQUE(guildId, messageId, emoji)
  );

  CREATE TABLE IF NOT EXISTS credits (
    userId TEXT PRIMARY KEY,
    amount INTEGER DEFAULT 0,
    lastDaily DATETIME
  );

  CREATE TABLE IF NOT EXISTS xp_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    guildId TEXT,
    xp INTEGER,
    type TEXT, -- 'text' or 'voice'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS apply_settings (
    guildId TEXT PRIMARY KEY,
    channelId TEXT,
    roleId TEXT,
    staffRoleId TEXT,
    imageUrl TEXT,
    questions TEXT, -- JSON array of strings
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    userId TEXT,
    status TEXT DEFAULT 'pending',
    answers TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suggestion_settings (
    guildId TEXT PRIMARY KEY,
    channelId TEXT,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS evaluation_settings (
    guildId TEXT PRIMARY KEY,
    channelId TEXT,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    userId TEXT, -- The user who rated
    staffId TEXT, -- The staff member being rated
    rating INTEGER,
    feedback TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS custom_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON array of strings
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS command_permissions (
    guildId TEXT,
    commandName TEXT,
    channelId TEXT,
    type TEXT, -- 'allow' or 'deny'
    PRIMARY KEY (guildId, commandName, channelId)
  );

  CREATE TABLE IF NOT EXISTS mention_protection (
    guildId TEXT,
    userId TEXT,
    enabled INTEGER DEFAULT 0,
    PRIMARY KEY (guildId, userId)
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    messageId TEXT PRIMARY KEY,
    channelId TEXT,
    guildId TEXT,
    prize TEXT,
    endTime INTEGER,
    winnersCount INTEGER,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS azkar_settings (
    guildId TEXT PRIMARY KEY,
    channelId TEXT,
    interval INTEGER DEFAULT 30, -- in minutes
    enabled INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS custom_azkar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    content TEXT
  );

  CREATE TABLE IF NOT EXISTS currency_log_settings (
    guildId TEXT PRIMARY KEY,
    channelId TEXT
  );

  CREATE TABLE IF NOT EXISTS bonus_roles (
    guildId TEXT,
    roleId TEXT,
    PRIMARY KEY (guildId, roleId)
  );

  CREATE TABLE IF NOT EXISTS bonus_role_settings (
    guildId TEXT PRIMARY KEY,
    maxRoleId TEXT,
    excludedRoleIds TEXT,
    baseRoleId TEXT
  );

  CREATE TABLE IF NOT EXISTS giveaway_participants (
    messageId TEXT,
    userId TEXT,
    PRIMARY KEY (messageId, userId),
    FOREIGN KEY (messageId) REFERENCES giveaways(messageId)
  );

  CREATE TABLE IF NOT EXISTS blox_fruits_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    guildId TEXT,
    robloxUsername TEXT,
    robloxPassword TEXT,
    robloxId TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    currentLevel INTEGER DEFAULT 0,
    maxLevel INTEGER DEFAULT 2550,
    money INTEGER DEFAULT 0,
    items TEXT DEFAULT '[]', -- JSON array of items found
    lastUpdate DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blox_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId INTEGER,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requestId) REFERENCES blox_fruits_requests(id)
  );

  CREATE TABLE IF NOT EXISTS logging_settings (
    guildId TEXT PRIMARY KEY,
    channelId TEXT,
    logMessageDelete TEXT,
    logMessageEdit TEXT,
    logMemberJoin TEXT,
    logMemberLeave TEXT,
    logRoleUpdate TEXT,
    logChannelUpdate TEXT,
    logVoiceState TEXT,
    logCommandUsage TEXT,
    logLevelUp TEXT,
    logTicketEvents TEXT,
    logProtectionEvents TEXT,
    logBotAdd TEXT,
    logRoleCreate TEXT,
    logRoleDelete TEXT,
    logChannelCreate TEXT,
    logChannelDelete TEXT,
    logMemberBan TEXT,
    logMemberUnban TEXT,
    logNicknameChange TEXT
  );

  CREATE TABLE IF NOT EXISTS whitelisted_bots (
    guildId TEXT,
    botId TEXT,
    PRIMARY KEY (guildId, botId)
  );

  CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    name TEXT,
    data TEXT, -- JSON string containing roles and channels
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
try {
  const info = db.prepare("PRAGMA table_info(leveling)").all();
  const hasGuildId = info.some((col) => col.name === "guildId");
  if (!hasGuildId) {
    db.exec(`
      CREATE TABLE leveling_new (
        userId TEXT,
        guildId TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        PRIMARY KEY (userId, guildId)
      );
      INSERT INTO leveling_new (userId, xp, level) SELECT userId, xp, level FROM leveling;
      DROP TABLE leveling;
      ALTER TABLE leveling_new RENAME TO leveling;
    `);
  }
} catch (e) {
}
function addColumnIfNotExists(table, column, type) {
  try {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    const exists = info.some((col) => col.name === column);
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
      console.log(`Added column ${column} to ${table}`);
    }
  } catch (e) {
    console.error(`Failed to add column ${column} to ${table}:`, e);
  }
}
addColumnIfNotExists("tickets", "category", "TEXT");
addColumnIfNotExists("tickets", "staffId", "TEXT");
addColumnIfNotExists("protection_settings", "verifiedRoleId", "TEXT");
addColumnIfNotExists("welcome_settings", "enabled", "INTEGER DEFAULT 1");
addColumnIfNotExists("leveling", "xb", "INTEGER DEFAULT 0");
addColumnIfNotExists("blox_fruits_requests", "robloxId", "TEXT");
addColumnIfNotExists("leveling_settings", "enabled", "INTEGER DEFAULT 1");
addColumnIfNotExists("protection_settings", "antiBot", "INTEGER DEFAULT 0");
addColumnIfNotExists("protection_settings", "antiChannelControl", "INTEGER DEFAULT 0");
addColumnIfNotExists("logging_settings", "logBotAdd", "INTEGER DEFAULT 0");
addColumnIfNotExists("protection_settings", "counterNuke", "INTEGER DEFAULT 0");
var db_default = db;
export {
  db_default as default
};
