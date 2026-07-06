import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "confirm-transfer",
  category: "economy",
  data: new SlashCommandBuilder().setName("confirm-transfer").setDescription("تأكيد عملية تحويل العملات").addStringOption((option) => option.setName("code").setDescription("كود التأكيد المكون من 6 أرقام").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "confirm-transfer") {
        const code = interaction.options.getString("code");
        const pending = pendingTransfers.get(user.id);
        if (!pending) {
          return interaction.reply({ content: "❌ لا توجد عملية تحويل معلقة لك أو انتهت صلاحية الكود.", ephemeral: true });
        }
        if (pending.code !== code) {
          return interaction.reply({ content: "❌ كود التأكيد غير صحيح.", ephemeral: true });
        }
        clearTimeout(pending.timeout);
        pendingTransfers.delete(user.id);
        const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
        const senderBalance = senderRow?.xb || 0;
        if (senderBalance < pending.amount) {
          return interaction.reply({ content: "❌ رصيدك أصبح غير كافٍ لإتمام العملية.", ephemeral: true });
        }
        db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(pending.amount, user.id, guildId);
        db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(pending.targetId, guildId, pending.amount, pending.amount);
        const targetUser = await client.users.fetch(pending.targetId);
        await interaction.reply(`✅ تم تأكيد التحويل! تم تحويل **${pending.amount}** XB بنجاح إلى ${targetUser}.`);
        await logCurrencyTransaction(guildId, user.id, pending.amount, `Transfer to ${targetUser.username}`, "transfer");
        await logCurrencyTransaction(guildId, pending.targetId, pending.amount, `Transfer from ${user.username}`, "add");
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
    const commandName = "confirm-transfer";
    
  }
};
