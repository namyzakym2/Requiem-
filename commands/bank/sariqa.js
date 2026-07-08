import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, logTx, C, n, E, noRoom } from "./utils.js";

export default {
  name: "سرقة",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("سرقة")
    .setDescription("🕵️ جرب سرقة جزء من محفظة لاعب آخر (مخاطرة عالية!)")
    .addUserOption(o => o.setName("الضحية").setDescription("اللاعب المراد سرقته").setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const victim = interaction.options.getUser("الضحية");
    const uid = interaction.user.id;

    if (uid === victim.id) {
      return interaction.reply({ embeds: [E("🤦 خطأ").setDescription("هل تسرق نفسك يا بطل؟ 😂")], ephemeral: true });
    }

    const cd = (cfg.cooldowns["سرقة"] ?? 3) * 3600000;
    const users = load("users.json");
    const cools = load("cooldowns.json");
    const now = Date.now();

    // Sync thief balance from SQLite
    const thiefRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    const thiefDbBal = thiefRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: thiefDbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, thiefDbBal);
    }

    // Sync victim balance from SQLite
    const victimRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(victim.id, interaction.guildId);
    const victimDbBal = victimRow?.xb || 0;
    if (!users[victim.id]) {
      users[victim.id] = { balance: victimDbBal, vault: 0 };
    } else {
      users[victim.id].balance = Math.max(users[victim.id].balance || 0, victimDbBal);
    }

    if (cools[`steal_${uid}`] && now - cools[`steal_${uid}`] < cd) {
      const rem = cd - (now - cools[`steal_${uid}`]);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return interaction.reply({ embeds: [E("⏳ انتظر").setDescription(`يمكنك القيام بمحاولة سرقة أخرى بعد **${h}س ${m}د**`)], ephemeral: true });
    }

    const vicData = users[victim.id];
    const victimCash = vicData.balance || 0;

    if (victimCash < 1000) {
      return interaction.reply({ embeds: [E("🕵️ سرقة فاشلة").setDescription(`محفظة <@${victim.id}> فارغة تقريباً ولا تستحق السرقة. (الحد الأدنى لسرقة شخص هو 1,000 رون)`)], ephemeral: true });
    }

    if (vicData.protectionUntil && now < vicData.protectionUntil) {
      const rem = vicData.protectionUntil - now;
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return interaction.reply({ embeds: [E("🛡️ حماية").setDescription(`<@${victim.id}> محمي تماماً من السرقة حالياً!\nالدرع ينتهي بعد **${h}س ${m}د**`)], ephemeral: true });
    }

    cools[`steal_${uid}`] = now;
    save("cooldowns.json", cools);

    const success = Math.random() < 0.35;
    if (success) {
      // Steal 15% to 35% of their cash
      const pct = (Math.random() * (0.35 - 0.15) + 0.15);
      const stolen = Math.floor(victimCash * pct);

      users[uid].balance += stolen;
      users[victim.id].balance -= stolen;
      users[uid].totalStolen = (users[uid].totalStolen || 0) + stolen;
      save("users.json", users);

      logTx(uid, "سرقة_ناجحة", stolen, `سرقة من <@${victim.id}>`);
      logTx(victim.id, "تعرض_للسرقة", -stolen, `سرقة بواسطة <@${uid}>`);

      db.prepare("UPDATE leveling SET xb = xb + ? WHERE userId = ? AND guildId = ?").run(stolen, uid, interaction.guildId);
      db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(stolen, victim.id, interaction.guildId);

      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("🕵️ عملية سرقة ناجحة!")
        .setDescription(`تسللت بخفة لسرقة <@${victim.id}> ونجحت عمليتك!\n\n💰 **المبلغ المسروق:** +${n(stolen)} رون\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} رون`)
        .setTimestamp()] });
    } else {
      // Penalty: fine 10% of thief's current wallet balance
      const thiefCash = users[uid].balance || 0;
      const fine = Math.max(200, Math.floor(thiefCash * 0.10));

      users[uid].balance = Math.max(0, thiefCash - fine);
      save("users.json", users);

      logTx(uid, "سرقة_فاشلة", -fine, `غرامة سرقة فاشلة من <@${victim.id}>`);

      db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(fine, uid, interaction.guildId);

      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("👮 تم القبض عليك!")
        .setDescription(`أثناء محاولة سرقة <@${victim.id}>، انطلقت صفارات الإنذار وفرضت عليك الشرطة غرامة مالية.\n\n🚓 **الغرامة المخصومة:** -${n(fine)} رون\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} رون`)
        .setTimestamp()] });
    }
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    if (args.length < 1) return message.reply({ embeds: [E("❌ خطأ").setDescription(`الاستخدام الصحيح: \`${PREFIX}سرقة <@user>\``)] });

    const victim = message.mentions.users.first();
    if (!victim) return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى منشن العضو الذي ترغب في سرقته.")] });

    const uid = message.author.id;
    if (uid === victim.id) {
      return message.reply({ embeds: [E("🤦 خطأ").setDescription("هل تسرق نفسك يا بطل؟ 😂")] });
    }

    const cd = (cfg.cooldowns["سرقة"] ?? 3) * 3600000;
    const users = load("users.json");
    const cools = load("cooldowns.json");
    const now = Date.now();

    const thiefRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(uid, message.guild.id);
    const thiefDbBal = thiefRow?.xb || 0;
    if (!users[uid]) {
      users[uid] = { balance: thiefDbBal, vault: 0 };
    } else {
      users[uid].balance = Math.max(users[uid].balance || 0, thiefDbBal);
    }

    const victimRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(victim.id, message.guild.id);
    const victimDbBal = victimRow?.xb || 0;
    if (!users[victim.id]) {
      users[victim.id] = { balance: victimDbBal, vault: 0 };
    } else {
      users[victim.id].balance = Math.max(users[victim.id].balance || 0, victimDbBal);
    }

    if (cools[`steal_${uid}`] && now - cools[`steal_${uid}`] < cd) {
      const rem = cd - (now - cools[`steal_${uid}`]);
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return message.reply({ embeds: [E("⏳ انتظر").setDescription(`يمكنك القيام بمحاولة سرقة أخرى بعد **${h}س ${m}د**`)] });
    }

    const vicData = users[victim.id];
    const victimCash = vicData.balance || 0;

    if (victimCash < 1000) {
      return message.reply({ embeds: [E("🕵️ سرقة فاشلة").setDescription(`محفظة <@${victim.id}> فارغة تقريباً ولا تستحق السرقة. (الحد الأدنى لسرقة شخص هو 1,000 رون)`)] });
    }

    if (vicData.protectionUntil && now < vicData.protectionUntil) {
      const rem = vicData.protectionUntil - now;
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      return message.reply({ embeds: [E("🛡️ حماية").setDescription(`<@${victim.id}> محمي تماماً من السرقة حالياً!\nالدرع ينتهي بعد **${h}س ${m}د**`)] });
    }

    cools[`steal_${uid}`] = now;
    save("cooldowns.json", cools);

    const success = Math.random() < 0.35;
    if (success) {
      const pct = (Math.random() * (0.35 - 0.15) + 0.15);
      const stolen = Math.floor(victimCash * pct);

      users[uid].balance += stolen;
      users[victim.id].balance -= stolen;
      users[uid].totalStolen = (users[uid].totalStolen || 0) + stolen;
      save("users.json", users);

      logTx(uid, "سرقة_ناجحة", stolen, `سرقة من <@${victim.id}>`);
      logTx(victim.id, "تعرض_للسرقة", -stolen, `سرقة بواسطة <@${uid}>`);

      db.prepare("UPDATE leveling SET xb = xb + ? WHERE userId = ? AND guildId = ?").run(stolen, uid, message.guild.id);
      db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(stolen, victim.id, message.guild.id);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("🕵️ عملية سرقة ناجحة!")
        .setDescription(`تسللت بخفة لسرقة <@${victim.id}> ونجحت عمليتك!\n\n💰 **المبلغ المسروق:** +${n(stolen)} رون\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} رون`)
        .setTimestamp()] });
    } else {
      const thiefCash = users[uid].balance || 0;
      const fine = Math.max(200, Math.floor(thiefCash * 0.10));

      users[uid].balance = Math.max(0, thiefCash - fine);
      save("users.json", users);

      logTx(uid, "سرقة_فاشلة", -fine, `غرامة سرقة فاشلة من <@${victim.id}>`);

      db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(fine, uid, message.guild.id);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("👮 تم القبض عليك!")
        .setDescription(`أثناء محاولة سرقة <@${victim.id}>، انطلقت صفارات الإنذار وفرضت عليك الشرطة غرامة مالية.\n\n🚓 **الغرامة المخصومة:** -${n(fine)} رون\n💳 **رصيدك الحالي:** ${n(users[uid].balance)} رون`)
        .setTimestamp()] });
    }
  }
};
