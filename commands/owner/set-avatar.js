import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "set-avatar",
  category: "owner",
  data: new SlashCommandBuilder().setName("set-avatar").setDescription("Set the bot's avatar (Admin Only)").addStringOption((option) => option.setName("url").setDescription("The image URL for the avatar").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "set-avatar") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const url = interaction.options.getString("url");
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        try {
          await client.user?.setAvatar(url);
          await interaction.editReply("✅ Bot avatar updated successfully!");
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "❌ Failed to update avatar. Make sure the URL is valid and the image is not too large." });
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
    const commandName = "set-avatar";
    if (commandName === "set-avatar") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const url = args[0];
          if (!url) return message.reply("Usage: set-avatar <url>");
          try {
            await client.user?.setAvatar(url);
            return message.reply("✅ Bot avatar updated successfully!");
          } catch (err) {
            return message.reply("❌ Failed to update avatar.");
          }
        }
  }
};
