import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "بيع",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("بيع")
    .setDescription("🛒 بع عقاراً أو مركبة أو أصلًا تمتلكه")
    .addStringOption(o => o.setName("الاسم").setDescription("اسم السلعة بدقة (مثل: سيارة فاخرة)").setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const name = interaction.options.getString("الاسم");
    const market = load("market.json");

    const pKey = Object.keys(market.properties).find(k => k.toLowerCase() === name.toLowerCase());
    const prop = market.properties[pKey || name];
    if (!prop) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذه السلعة لا يمكن تداولها في السوق.")], ephemeral: true });
    }

    const uid = interaction.user.id;
    const users = load("users.json");
    const itemKey = pKey || name;

    if (!users[uid] || !users[uid].inventory || !users[uid].inventory[itemKey] || users[uid].inventory[itemKey] < 1) {
      return interaction.reply({ embeds: [E("❌ لا تمتلكها").setDescription(`أنت لا تمتلك **${itemKey}** في مخزن ممتلكاتك حالياً.`)], ephemeral: true });
    }

    const price = Math.round(prop.price);
    users[uid].inventory[itemKey] -= 1;
    if (users[uid].inventory[itemKey] === 0) {
      delete users[uid].inventory[itemKey];
    }

    users[uid].balance = (users[uid].balance || 0) + price;
    save("users.json", users);
    logTx(uid, "بيع_ممتلكات", price, `بيع ${itemKey}`);

    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, interaction.guildId, price, price);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم البيع بنجاح")
      .setDescription(`لقد بعت **${itemKey}** بنجاح بسعر **${n(price)} دولار** للسهم.`)
      .addFields(
        { name: "💵 العائد", value: `${n(price)} دولار`, inline: true },
        { name: "💳 رصيدك الحالي", value: `${n(users[uid].balance)} دولار`, inline: true }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى تحديد السلعة التي تريد بيعها.")] });

    const name = args.join(" ");
    const market = load("market.json");

    const pKey = Object.keys(market.properties).find(k => k.toLowerCase() === name.toLowerCase());
    const prop = market.properties[pKey || name];
    if (!prop) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذه السلعة لا يمكن تداولها في السوق.")] });
    }

    const uid = message.author.id;
    const users = load("users.json");
    const itemKey = pKey || name;

    if (!users[uid] || !users[uid].inventory || !users[uid].inventory[itemKey] || users[uid].inventory[itemKey] < 1) {
      return message.reply({ embeds: [E("❌ لا تمتلكها").setDescription(`أنت لا تمتلك **${itemKey}** في مخزن ممتلكاتك حالياً.`)] });
    }

    const price = Math.round(prop.price);
    users[uid].inventory[itemKey] -= 1;
    if (users[uid].inventory[itemKey] === 0) {
      delete users[uid].inventory[itemKey];
    }

    users[uid].balance = (users[uid].balance || 0) + price;
    save("users.json", users);
    logTx(uid, "بيع_ممتلكات", price, `بيع ${itemKey}`);

    db.prepare("INSERT INTO leveling (userId, guildId, bank_wallet) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bank_wallet = bank_wallet + ?")
      .run(uid, message.guild.id, price, price);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم البيع بنجاح")
      .setDescription(`لقد بعت **${itemKey}** بنجاح بسعر **${n(price)} دولار** للسهم.`)
      .addFields(
        { name: "💵 العائد", value: `${n(price)} دولار`, inline: true },
        { name: "💳 رصيدك الحالي", value: `${n(users[uid].balance)} دولار`, inline: true }
      ).setTimestamp()] });
  }
};
