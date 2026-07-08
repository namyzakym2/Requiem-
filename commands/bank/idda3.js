import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "إيداع",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("إيداع")
    .setDescription("🏦 أودع في خزنتك (محمية من السرقة)")
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ المودع").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const amount = interaction.options.getInteger("المبلغ");
    if (!amount || amount < 1) return interaction.reply({ embeds: [E("❌ خطأ").setDescription("اكتب مبلغ صحيح")], ephemeral: true });

    const users = load("users.json");
    
    // Sync with SQLite db balance
    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amount) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك في المحفظة: **${n(users[uid].balance || 0)} رون**`)], ephemeral: true });
    }

    users[uid].balance = (users[uid].balance || 0) - amount;
    users[uid].vault = (users[uid].vault || 0) + amount;
    save("users.json", users);
    logTx(uid, "إيداع", -amount, "إيداع في الخزنة");

    // Update SQLite database to reflect the withdrawal from wallet
    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, uid, interaction.guildId);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🏦 تم الإيداع في الخزنة بنجاح")
      .addFields(
        { name: "💰 المودَع", value: `${n(amount)} رون`, inline: true },
        { name: "🏦 الخزنة", value: `${n(users[uid].vault)} رون`, inline: true },
        { name: "💳 المحفظة", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام: \`${PREFIX}إيداع <المبلغ>\``)] });
    const amount = parseInt(args[0]);
    if (!amount || isNaN(amount) || amount < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("اكتب مبلغ صحيح")] });

    const uid = message.author.id;
    const users = load("users.json");

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amount) {
      return message.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك في المحفظة: **${n(users[uid].balance || 0)} رون**`)] });
    }

    users[uid].balance = (users[uid].balance || 0) - amount;
    users[uid].vault = (users[uid].vault || 0) + amount;
    save("users.json", users);
    logTx(uid, "إيداع", -amount, "إيداع في الخزنة");

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, uid, message.guild.id);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🏦 تم الإيداع في الخزنة بنجاح")
      .addFields(
        { name: "💰 المودَع", value: `${n(amount)} رون`, inline: true },
        { name: "🏦 الخزنة", value: `${n(users[uid].vault)} رون`, inline: true },
        { name: "💳 المحفظة", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
  }
};
