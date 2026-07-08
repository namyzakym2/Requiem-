import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "c",
  category: "economy",
  data: new SlashCommandBuilder().setName("c").setDescription("عرض رصيدك أو تحويل رون").addUserOption((option) => option.setName("user").setDescription("العضو المراد التحويل له أو عرض رصيده")).addIntegerOption((option) => option.setName("amount").setDescription("المبلغ المراد تحويله")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "c" || commandName === "xbc") {
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        if (!targetUser && !amount) {
          const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
          const balance = userRow?.xb || 0;
          return interaction.reply(`💰 رصيدك الحالي هو: **${balance}** رون`);
        }
        if (targetUser && !amount) {
          const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const balance = userRow?.xb || 0;
          return interaction.reply(`💰 رصيد **${targetUser.username}** هو: **${balance}** رون`);
        }
        if (targetUser && amount && amount > 0) {
          if (targetUser.id === user.id) return interaction.reply({ content: "❌ لا يمكنك تحويل العملات لنفسك.", ephemeral: true });
          const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
          const senderBalance = senderRow?.xb || 0;
          if (senderBalance < amount) {
            return interaction.reply({ content: `❌ رصيدك غير كافٍ. رصيدك الحالي هو **${senderBalance}** رون.`, ephemeral: true });
          }
          const code = Math.floor(1e5 + Math.random() * 9e5).toString();
          const existing = pendingTransfers.get(user.id);
          if (existing) clearTimeout(existing.timeout);
          const timeout = setTimeout(() => {
            pendingTransfers.delete(user.id);
          }, 6e4);
          pendingTransfers.set(user.id, { targetId: targetUser.id, amount, code, timeout });
          await interaction.reply(`⚠️ لتأكيد تحويل **${amount}** رون إلى ${targetUser}، يرجى استخدام الأمر:

\`/confirm-transfer code: ${code}\`

*(الكود صالح لمدة دقيقة واحدة)*`);
        } else {
          await interaction.reply({ content: "❌ يرجى إدخال مبلغ صحيح أكبر من 0 للتحويل.", ephemeral: true });
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
    const commandName = "c";
    if (commandName === "c" || commandName === "xbc") {
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!targetUser && args.length === 0) {
            const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(message.author.id, guildId);
            const balance = userRow?.xb || 0;
            return message.reply(`💰 رصيدك الحالي هو: **${balance}** رون`);
          }
          if (targetUser && (isNaN(amount) || args.length === 1)) {
            const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
            const balance = userRow?.xb || 0;
            return message.reply(`💰 رصيد **${targetUser.username}** هو: **${balance}** رون`);
          }
          if (targetUser && !isNaN(amount) && amount > 0) {
            if (targetUser.id === message.author.id) return message.reply("❌ لا يمكنك تحويل العملات لنفسك.");
            const senderRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(message.author.id, guildId);
            const senderBalance = senderRow?.xb || 0;
            if (senderBalance < amount) {
              return message.reply(`❌ رصيدك غير كافٍ. رصيدك الحالي هو **${senderBalance}** رون.`);
            }
            db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, message.author.id, guildId);
            await awardXB(guildId, targetUser.id, amount, `Transfer from ${message.author.username}`);
            return message.reply(`✅ تم تحويل **${amount}** رون بنجاح إلى ${targetUser}.`);
          }
          return message.reply(`❌ الاستخدام الصحيح:
- \`${currentPrefix}c\` لرؤية رصيدك
- \`${currentPrefix}c @user\` لرؤية رصيد عضو
- \`${currentPrefix}c @user <المبلغ>\` لتحويل رون`);
        }
  }
};
