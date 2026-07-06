import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "set-prefix",
  category: "admin",
  data: new SlashCommandBuilder().setName("set-prefix").setDescription("Change the bot prefix (Admin Only)").addStringOption((option) => option.setName("prefix").setDescription("The new prefix").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "set-prefix") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const newPrefix = interaction.options.getString("prefix");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guildId}`, newPrefix);
        await interaction.reply(`✅ Prefix updated to: \`${newPrefix}\``);
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
    const commandName = "set-prefix";
    if (commandName === "set-prefix") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const newPrefix = args[0];
          if (!newPrefix) return message.reply("Usage: set-prefix <prefix>");
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guildId}`, newPrefix);
          return message.reply(`✅ Prefix updated to: \`${newPrefix}\``);
        }
  }
};
