import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, n, E } from "./utils.js";

export default {
  name: "سحب",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("سحب")
    .setDescription("⚙️ اسحب مبلغاً من محفظة لاعب (للمسؤولين)")
    .addUserOption(o => o.setName("اللاعب").setDescription("اللاعب المستهدف").setRequired(true))
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ المطلوب سحبه").setMinValue(1).setRequired(true)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")], ephemeral: true });
    }

    const target = interaction.options.getUser("اللاعب");
    const amount = interaction.options.getInteger("المبلغ");

    const users = load("users.json");

    // Sync from SQLite balance
    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, interaction.guildId);
    const dbBal = userRow?.xb || 0;
    if (!users[target.id]) {
      users[target.id] = { balance: dbBal, vault: 0 };
    } else {
      users[target.id].balance = Math.max(users[target.id].balance || 0, dbBal);
    }

    if ((users[target.id].balance || 0) < amount) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription(`رصيد <@${target.id}> الحالي هو **${n(users[target.id].balance || 0)} رون** فقط. لا يمكن سحب مبلغ أكبر من رصيده.`)], ephemeral: true });
    }

    users[target.id].balance -= amount;
    save("users.json", users);

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, target.id, interaction.guildId);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ سحب رصيد من لاعب")
      .setDescription(`✅ تم سحب مبلغ **${n(amount)} رون** من محفظة <@${target.id}> بنجاح.\n\n💳 **رصيده المتبقي في المحفظة:** ${n(users[target.id].balance)} رون`)] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount < 1) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("الاستخدام: `!سحب <@user> <المبلغ>`")] });
    }

    const users = load("users.json");

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, message.guild.id);
    const dbBal = userRow?.xb || 0;
    if (!users[target.id]) {
      users[target.id] = { balance: dbBal, vault: 0 };
    } else {
      users[target.id].balance = Math.max(users[target.id].balance || 0, dbBal);
    }

    if ((users[target.id].balance || 0) < amount) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription(`رصيد <@${target.id}> الحالي هو **${n(users[target.id].balance || 0)} رون** فقط. لا يمكن سحب مبلغ أكبر من رصيده.`)] });
    }

    users[target.id].balance -= amount;
    save("users.json", users);

    db.prepare("UPDATE leveling SET xb = xb - ? WHERE userId = ? AND guildId = ?").run(amount, target.id, message.guild.id);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ سحب رصيد من لاعب")
      .setDescription(`✅ تم سحب مبلغ **${n(amount)} رون** من محفظة <@${target.id}> بنجاح.\n\n💳 **رصيده المتبقي في المحفظة:** ${n(users[target.id].balance)} رون`)] });
  }
};
