import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, n, C } from "../bank/utils.js";

export default {
  name: "inadd-ron",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("inadd-ron")
    .setDescription("سحب رون من عضو (Admins / Authorized Only)")
    .addUserOption((option) => option.setName("user").setDescription("العضو").setRequired(true))
    .addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true)),
    
  async executeInteraction(interaction, context) {
    const { db, OWNER_ID, logCurrencyTransaction } = context;

    const AUTHORIZED_CURRENCY_IDS = [OWNER_ID, "1071164421222695042"];
    const isAuthorized = AUTHORIZED_CURRENCY_IDS.includes(interaction.user.id) || 
                         interaction.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                         interaction.user.id === interaction.guild?.ownerId;

    if (!isAuthorized) {
      return interaction.reply({ content: "❌ هذا الأمر خاص بالمسؤولين والأشخاص المصرح لهم فقط.", ephemeral: true });
    }

    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    if (!targetUser) return interaction.reply({ content: "❌ لم يتم تحديد العضو بشكل صحيح.", ephemeral: true });
    if (!amount || amount < 1) return interaction.reply({ content: "❌ يرجى كتابة مبلغ صحيح أكبر من صفر.", ephemeral: true });

    const guildId = interaction.guildId;

    // Update SQLite database
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb - ?")
      .run(targetUser.id, guildId, amount, amount);

    // Sync to users.json
    try {
      const users = load("users.json");
      if (users[targetUser.id]) {
        users[targetUser.id].balance = Math.max(0, (users[targetUser.id].balance || 0) - amount);
        save("users.json", users);
      }
    } catch (e) {
      console.error("Error syncing users.json in inadd-ron:", e);
    }

    await logCurrencyTransaction(guildId, targetUser.id, amount, `Admin remove by ${interaction.user.username}`, "remove");

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("💸 سحب رون")
      .setDescription(`تم سحب **${n(amount)}** رون بنجاح من رصيد ${targetUser}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const { db, OWNER_ID, PREFIX, logCurrencyTransaction } = context;

    const AUTHORIZED_CURRENCY_IDS = [OWNER_ID, "1071164421222695042"];
    const isAuthorized = AUTHORIZED_CURRENCY_IDS.includes(message.author.id) || 
                         message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
                         message.author.id === message.guild?.ownerId;

    if (!isAuthorized) return;

    // Robust parsing of user and amount from arguments
    const targetUser = message.mentions.users.first() || 
                       (args[0] && args[0].match(/^\d+$/) ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
                       (args[1] && args[1].match(/^\d+$/) ? await message.client.users.fetch(args[1]).catch(() => null) : null);

    let amount = NaN;
    for (const arg of args) {
      const parsed = parseInt(arg);
      if (!isNaN(parsed) && !arg.includes("<@") && !arg.includes("<#") && !arg.includes("<@&")) {
        amount = parsed;
        break;
      }
    }

    const currentPrefix = PREFIX || ".";
    if (!targetUser || isNaN(amount) || amount < 1) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚠️ خطأ في الاستخدام").setDescription(`الاستخدام الصحيح:\n\`${currentPrefix}inadd-ron @user <المبلغ>\`\nأو\n\`${currentPrefix}inadd-ron <ID العضو> <المبلغ>\``)] });
    }

    const guildId = message.guild.id;

    // Update SQLite database
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb - ?")
      .run(targetUser.id, guildId, amount, amount);

    // Sync to users.json
    try {
      const users = load("users.json");
      if (users[targetUser.id]) {
        users[targetUser.id].balance = Math.max(0, (users[targetUser.id].balance || 0) - amount);
        save("users.json", users);
      }
    } catch (e) {
      console.error("Error syncing users.json in inadd-ron message:", e);
    }

    await logCurrencyTransaction(guildId, targetUser.id, amount, `Admin remove by ${message.author.username}`, "remove");

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("💸 سحب رون")
      .setDescription(`تم سحب **${n(amount)}** رون بنجاح من رصيد ${targetUser}.`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};

