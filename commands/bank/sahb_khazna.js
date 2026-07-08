import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "سحب_خزنة",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("سحب_خزنة")
    .setDescription("🏦 اسحب من خزنتك إلى محفظتك")
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ المراد سحبه").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const uid = interaction.user.id;
    const amount = interaction.options.getInteger("المبلغ");
    if (!amount || amount < 1) return interaction.reply({ embeds: [E("❌ خطأ").setDescription("اكتب مبلغ صحيح")], ephemeral: true });

    const users = load("users.json");
    if (!users[uid]) users[uid] = { balance: 0, vault: 0 };

    if ((users[uid].vault || 0) < amount) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription(`خزنتك تحتوي على: **${n(users[uid].vault || 0)} رون** فقط`)], ephemeral: true });
    }

    users[uid].vault = (users[uid].vault || 0) - amount;
    users[uid].balance = (users[uid].balance || 0) + amount;
    save("users.json", users);
    logTx(uid, "سحب_خزنة", amount, "سحب من الخزنة");

    // Sync with SQLite db balance (adds to wallet)
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(uid, interaction.guildId, amount, amount);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم السحب من الخزنة")
      .addFields(
        { name: "💰 المسحوب", value: `${n(amount)} رون`, inline: true },
        { name: "🏦 الخزنة", value: `${n(users[uid].vault)} رون`, inline: true },
        { name: "💳 المحفظة", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
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
    if (!users[uid]) users[uid] = { balance: 0, vault: 0 };

    if ((users[uid].vault || 0) < amount) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription(`خزنتك تحتوي على: **${n(users[uid].vault || 0)} رون** فقط`)] });
    }

    users[uid].vault = (users[uid].vault || 0) - amount;
    users[uid].balance = (users[uid].balance || 0) + amount;
    save("users.json", users);
    logTx(uid, "سحب_خزنة", amount, "سحب من الخزنة");

    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(uid, message.guild.id, amount, amount);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم السحب من الخزنة")
      .addFields(
        { name: "💰 المسحوب", value: `${n(amount)} رون`, inline: true },
        { name: "🏦 الخزنة", value: `${n(users[uid].vault)} رون`, inline: true },
        { name: "💳 المحفظة", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
  }
};
