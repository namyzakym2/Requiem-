import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "setxp",
  category: "admin",
  data: new SlashCommandBuilder().setName("setxp").setDescription("Set a user's XP (Admin Only)").addUserOption((option) => option.setName("user").setDescription("The user").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("The XP amount").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "setxp") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        const level = Math.floor(amount / 300);
        db.prepare("INSERT OR REPLACE INTO leveling (userId, guildId, xp, level) VALUES (?, ?, ?, ?)").run(target.id, guildId, amount, level);
        await interaction.reply(`✅ Set ${target}'s XP to **${amount}** (Level ${level}) in this server.`);
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
    const commandName = "setxp";
    if (commandName === "setxp") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const target = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!target || isNaN(amount)) return message.reply("Usage: setxp <@user> <amount>");
          const level = Math.floor(amount / 300);
          db.prepare("INSERT OR REPLACE INTO leveling (userId, guildId, xp, level) VALUES (?, ?, ?, ?)").run(target.id, guildId, amount, level);
          return message.reply(`✅ Set ${target}'s XP to **${amount}** (Level ${level}) in this server.`);
        }
  }
};
