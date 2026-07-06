import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "set-reward",
  category: "admin",
  data: new SlashCommandBuilder().setName("set-reward").setDescription("Set a level role reward (Admin Only)").addIntegerOption((option) => option.setName("level").setDescription("The level").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("The role").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "set-reward") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const level = interaction.options.getInteger("level");
        const role = interaction.options.getRole("role");
        db.prepare("INSERT OR REPLACE INTO rewards (guildId, level, roleId) VALUES (?, ?, ?)").run(guildId, level, role.id);
        await interaction.reply(`✅ Reward set: Level **${level}** -> <@&${role.id}>`);
      }
  },
  async executeMessage(message, args, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    const guildId = message.guild.id;
    const commandName = "set-reward";
    if (commandName === "set-reward") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const level = parseInt(args[0]);
          const role = message.mentions.roles.first();
          if (isNaN(level) || !role) return message.reply("Usage: set-reward <level> <@role>");
          db.prepare("INSERT OR REPLACE INTO rewards (guildId, level, roleId) VALUES (?, ?, ?)").run(guildId, level, role.id);
          return message.reply(`✅ Reward set: Level **${level}** -> <@&${role.id}>`);
        }
  }
};
