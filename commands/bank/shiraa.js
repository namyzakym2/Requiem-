import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "شراء",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("شراء")
    .setDescription("🛒 اشترِ عقاراً أو مركبة أو سلعة فاخرة")
    .addStringOption(o => o.setName("الاسم").setDescription("اسم السلعة بدقة (مثال: سيارة فاخرة)").setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const name = interaction.options.getString("الاسم");
    const market = load("market.json");

    const pKey = Object.keys(market.properties).find(k => k.toLowerCase() === name.toLowerCase());
    const prop = market.properties[pKey || name];
    if (!prop) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذه السلعة غير متوفرة في السوق. تأكد من مطابقة الاسم تماماً كما يظهر في `/سوق`.")], ephemeral: true });
    }

    const price = Math.round(prop.price);
    const uid = interaction.user.id;
    const users = load("users.json");

    // Sync from SQLite
    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0, inventory: {} };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < price) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`سعر السلعة: **${n(price)} رون**\nرصيدك الحالي: **${n(users[uid].balance || 0)} رون**`)], ephemeral: true });
    }

    users[uid].balance -= price;
    if (!users[uid].inventory) users[uid].inventory = {};
    const itemKey = pKey || name;
    users[uid].inventory[itemKey] = (users[uid].inventory[itemKey] || 0) + 1;
    save("users.json", users);
    logTx(uid, "شراء_ممتلكات", -price, `شراء ${itemKey}`);

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(price, uid, interaction.guildId);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم الشراء بنجاح")
      .setDescription(`لقد اشتريت **${itemKey}** بنجاح وأضيفت لمخزن ممتلكاتك.`)
      .addFields(
        { name: "💵 السعر", value: `${n(price)} رون`, inline: true },
        { name: "💳 رصيدك المتبقي", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى تحديد اسم السلعة التي ترغب في شرائها. مثال: `!شراء سيارة فاخرة`")] });

    const name = args.join(" ");
    const market = load("market.json");

    const pKey = Object.keys(market.properties).find(k => k.toLowerCase() === name.toLowerCase());
    const prop = market.properties[pKey || name];
    if (!prop) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذه السلعة غير متوفرة في السوق. تأكد من مطابقة الاسم تماماً كما يظهر في `!سوق`.")] });
    }

    const price = Math.round(prop.price);
    const uid = message.author.id;
    const users = load("users.json");

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const dbBal = userRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: dbBal, vault: 0, inventory: {} };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, dbBal);
    }

    if ((users[uid].balance || 0) < price) {
      return message.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`سعر السلعة: **${n(price)} رون**\nرصيدك الحالي: **${n(users[uid].balance || 0)} رون**`)] });
    }

    users[uid].balance -= price;
    if (!users[uid].inventory) users[uid].inventory = {};
    const itemKey = pKey || name;
    users[uid].inventory[itemKey] = (users[uid].inventory[itemKey] || 0) + 1;
    save("users.json", users);
    logTx(uid, "شراء_ممتلكات", -price, `شراء ${itemKey}`);

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(price, uid, message.guild.id);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("✅ تم الشراء بنجاح")
      .setDescription(`لقد اشتريت **${itemKey}** بنجاح وأضيفت لمخزن ممتلكاتك.`)
      .addFields(
        { name: "💵 السعر", value: `${n(price)} رون`, inline: true },
        { name: "💳 رصيدك المتبقي", value: `${n(users[uid].balance)} رون`, inline: true }
      ).setTimestamp()] });
  }
};
