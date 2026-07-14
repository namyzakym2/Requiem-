import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "سحب_خزنة",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("سحب_خزنة")
    .setDescription("🏦 اسحب من خزنتك المؤمنة إلى محفظتك كاش")
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ المراد سحبه").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const amount = interaction.options.getInteger("المبلغ");
    if (!amount || amount < 1) return interaction.reply({ embeds: [E("❌ خطأ").setDescription("اكتب مبلغ صحيح")], ephemeral: true });

    const users = load("users.json");
    if (!users[uid]) users[uid] = { balance: 0, bank_vault: 0 };

    if ((users[uid].bank_vault || 0) < amount) {
      return interaction.reply({ 
        embeds: [E("❌ رصيد خزنة غير كافٍ").setDescription(`خزنتك الحالية تحتوي على: **${n(users[uid].bank_vault || 0)} دولار**\nالمبلغ المطلوب سحبه: **${n(amount)} دولار**`)], 
        ephemeral: true 
      });
    }

    users[uid].bank_vault = (users[uid].bank_vault || 0) - amount;
    users[uid].balance = (users[uid].balance || 0) + amount;
    save("users.json", users);
    logTx(uid, "سحب_خزنة", amount, "سحب من الخزنة");

    // Sync with SQLite db balance (adds to wallet, reduces from bank_vault)
    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet + ?, bank_vault = COALESCE(bank_vault, 0) - ? WHERE userId = ? AND guildId = ?").run(amount, amount, uid, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor("#a855f7")
      .setTitle("✅ تم سحب الأموال من الخزنة")
      .setDescription("تم تسييل المبلغ وسحبه بنجاح إلى محفظتك كاش.")
      .addFields(
        { name: "💰 المبلغ المسحوب", value: `\`${n(amount)} دولار\``, inline: true },
        { name: "🔒 المتبقي بالخزنة", value: `\`${n(users[uid].bank_vault)} دولار\``, inline: true },
        { name: "💳 المجموع بالمحفظة", value: `\`${n(users[uid].balance)} دولار\``, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام: \`${PREFIX}سحب_خزنة <المبلغ>\``)] });
    const amount = parseInt(args[0]);
    if (!amount || isNaN(amount) || amount < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("اكتب مبلغ صحيح")] });

    const uid = message.author.id;
    const users = load("users.json");
    if (!users[uid]) users[uid] = { balance: 0, bank_vault: 0 };

    if ((users[uid].bank_vault || 0) < amount) {
      return message.reply({ 
        embeds: [E("❌ رصيد خزنة غير كافٍ").setDescription(`خزنتك الحالية تحتوي على: **${n(users[uid].bank_vault || 0)} دولار**\nالمبلغ المطلوب سحبه: **${n(amount)} دولار**`)] 
      });
    }

    users[uid].bank_vault = (users[uid].bank_vault || 0) - amount;
    users[uid].balance = (users[uid].balance || 0) + amount;
    save("users.json", users);
    logTx(uid, "سحب_خزنة", amount, "سحب من الخزنة");

    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet + ?, bank_vault = COALESCE(bank_vault, 0) - ? WHERE userId = ? AND guildId = ?").run(amount, amount, uid, message.guild.id);

    const embed = new EmbedBuilder()
      .setColor("#a855f7")
      .setTitle("✅ تم سحب الأموال من الخزنة")
      .setDescription("تم تسييل المبلغ وسحبه بنجاح إلى محفظتك كاش.")
      .addFields(
        { name: "💰 المبلغ المسحوب", value: `\`${n(amount)} دولار\``, inline: true },
        { name: "🔒 المتبقي بالخزنة", value: `\`${n(users[uid].bank_vault)} دولار\``, inline: true },
        { name: "💳 المجموع بالمحفظة", value: `\`${n(users[uid].balance)} دولار\``, inline: true }
      )
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
