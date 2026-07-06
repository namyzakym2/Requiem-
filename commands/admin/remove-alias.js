import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "remove-alias",
  category: "admin",
  data: new SlashCommandBuilder().setName("remove-alias").setDescription("Remove a command shortcut (Admin Only)").addStringOption((option) => option.setName("alias").setDescription("The shortcut name to remove").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "remove-alias") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const aliasName = interaction.options.getString("alias").toLowerCase();
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
        try {
          const guildCommands = await guild.commands.fetch();
          const cmd = guildCommands.find((c) => c.name === aliasName);
          if (cmd) await cmd.delete();
          await interaction.editReply(`✅ Alias **${aliasName}** removed.`);
        } catch (err) {
          await interaction.editReply(`✅ Alias removed from DB.`);
        }
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
    const commandName = "remove-alias";
    if (commandName === "remove-alias") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const aliasName = args[0]?.toLowerCase();
          if (!aliasName) return message.reply("Usage: remove-alias <alias>");
          db.prepare("DELETE FROM aliases WHERE guildId = ? AND aliasName = ?").run(guildId, aliasName);
          return message.reply(`✅ Alias **${aliasName}** removed.`);
        }
  }
};
