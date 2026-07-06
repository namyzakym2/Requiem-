import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "clear",
  category: "moderation",
  data: new SlashCommandBuilder().setName("clear").setDescription("Purge a number of messages").addIntegerOption((option) => option.setName("amount").setDescription("Number of messages to delete (1-100)").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "clear") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply({ content: "You need 'Manage Messages' permission.", ephemeral: true });
        }
        if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية حذف الرسائل (Manage Messages).", ephemeral: true });
        }
        const amount = interaction.options.getInteger("amount");
        if (amount < 1 || amount > 100) return interaction.reply({ content: "Please provide a number between 1 and 100.", ephemeral: true });
        try {
          const deleted = await channel.bulkDelete(amount, true);
          await interaction.reply({ content: `✅ Deleted ${deleted.size} messages.`, ephemeral: true });
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "Failed to clear messages.", ephemeral: true });
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
    const commandName = "clear";
    if (commandName === "clear") {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("You need 'Manage Messages' permission.");
          }
          if (!message.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply("❌ البوت يفتقر إلى صلاحية حذف الرسائل (Manage Messages).");
          }
          const amount = parseInt(args[0]);
          if (isNaN(amount) || amount < 1 || amount > 100) return message.reply("Please provide a number between 1 and 100.");
          try {
            const deleted = await message.channel.bulkDelete(amount, true);
            const reply = await message.channel.send(`✅ Deleted ${deleted.size} messages.`);
            setTimeout(() => reply.delete().catch(() => {
            }), 5e3);
            return;
          } catch (err) {
            return message.reply("Failed to clear messages.");
          }
        }
  }
};
