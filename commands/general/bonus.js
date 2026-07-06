import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "bonus",
  category: "general",
  data: new SlashCommandBuilder().setName("bonus").setDescription("Check current XP bonus status"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "bonus") {
        const userRow = db.prepare("SELECT bonus FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
        const currentBonus = userRow?.bonus || 0;
        const currentHour = (/* @__PURE__ */ new Date()).getHours();
        const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
        const isBonusChannel = BONUS_CHANNELS.includes(channel?.id || "");
        let multiplier = 1;
        if (isHappyHour) multiplier *= 2;
        if (isBonusChannel) multiplier *= 2;
        const embed = new EmbedBuilder().setTitle("نظام الـ Bonus و XP").setDescription(`رصيدك الحالي من الـ **Bonus**: \`${currentBonus}\``).addFields(
          { name: "Happy Hour", value: isHappyHour ? "✅ Active (2x XP)" : "❌ Inactive (6 PM - 8 PM)", inline: true },
          { name: "Channel Bonus", value: isBonusChannel ? "✅ Active (2x XP)" : "❌ Inactive in this channel", inline: true },
          { name: "Total Multiplier", value: `${multiplier}x`, inline: false }
        ).setFooter({ text: "تحصل على ترقية تلقائية عند وصولك لـ 20 bonus" }).setColor(multiplier > 1 ? 65280 : 5793266);
        await interaction.reply({ embeds: [embed] });
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
    const commandName = "bonus";
    if (commandName === "bonus") {
          const currentHour = (/* @__PURE__ */ new Date()).getHours();
          const isHappyHour = currentHour >= HAPPY_HOUR_START && currentHour < HAPPY_HOUR_END;
          const isBonusChannel = BONUS_CHANNELS.includes(message.channel.id);
          let multiplier = 1;
          if (isHappyHour) multiplier *= 2;
          if (isBonusChannel) multiplier *= 2;
          const embed = new EmbedBuilder().setTitle("XP Bonus Status").addFields(
            { name: "Happy Hour", value: isHappyHour ? "✅ Active (2x XP)" : "❌ Inactive (6 PM - 8 PM)", inline: true },
            { name: "Channel Bonus", value: isBonusChannel ? "✅ Active (2x XP)" : "❌ Inactive in this channel", inline: true },
            { name: "Total Multiplier", value: `${multiplier}x`, inline: false }
          ).setColor(multiplier > 1 ? 65280 : 16711680);
          return message.reply({ embeds: [embed] });
        }
  }
};
