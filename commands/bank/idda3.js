import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "إيداع",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("إيداع")
    .setDescription("🏦 أودع في خزنتك لحمايتها من السرقة والنهب")
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
    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amount) {
      return interaction.reply({ 
        embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك الحالي في المحفظة: **${n(users[uid].balance || 0)} دولار**\nالمبلغ المطلوب إيداعه: **${n(amount)} دولار**`)], 
        ephemeral: true 
      });
    }

    users[uid].balance = (users[uid].balance || 0) - amount;
    users[uid].bank_vault = (users[uid].bank_vault || 0) + amount;
    save("users.json", users);
    logTx(uid, "إيداع", -amount, "إيداع في الخزنة");

    // Update SQLite database to reflect the withdrawal from wallet, and update bank_vault
    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ?, bank_vault = COALESCE(bank_vault, 0) + ? WHERE userId = ? AND guildId = ?").run(amount, amount, uid, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor("#a855f7")
      .setTitle("🏦 تم إيداع الأموال بنجاح")
      .setDescription(`تم نقل الأموال بأمان من محفظتك كاش إلى الخزنة الحصينة المشفرة.`)
      .addFields(
        { name: "💰 المبلغ المودَع", value: `\`${n(amount)} دولار\``, inline: true },
        { name: "🔒 الرصيد بالخزنة", value: `\`${n(users[uid].bank_vault)} دولار\``, inline: true },
        { name: "💳 الرصيد بالمحفظة", value: `\`${n(users[uid].balance)} دولار\``, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
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

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.bank_wallet || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, bank_vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < amount) {
      return message.reply({ 
        embeds: [E("❌ رصيد غير كافٍ").setDescription(`رصيدك الحالي في المحفظة: **${n(users[uid].balance || 0)} دولار**\nالمبلغ المطلوب إيداعه: **${n(amount)} دولار**`)] 
      });
    }

    users[uid].balance = (users[uid].balance || 0) - amount;
    users[uid].bank_vault = (users[uid].bank_vault || 0) + amount;
    save("users.json", users);
    logTx(uid, "إيداع", -amount, "إيداع في الخزنة");

    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ?, bank_vault = COALESCE(bank_vault, 0) + ? WHERE userId = ? AND guildId = ?").run(amount, amount, uid, message.guild.id);

    const embed = new EmbedBuilder()
      .setColor("#a855f7")
      .setTitle("🏦 تم إيداع الأموال بنجاح")
      .setDescription(`تم نقل الأموال بأمان من محفظتك كاش إلى الخزنة الحصينة المشفرة.`)
      .addFields(
        { name: "💰 المبلغ المودَع", value: `\`${n(amount)} دولار\``, inline: true },
        { name: "🔒 الرصيد بالخزنة", value: `\`${n(users[uid].bank_vault)} دولار\``, inline: true },
        { name: "💳 الرصيد بالمحفظة", value: `\`${n(users[uid].balance)} دولار\``, inline: true }
      )
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
