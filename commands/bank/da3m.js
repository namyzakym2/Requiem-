import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, n, E } from "./utils.js";

export default {
  name: "دعم",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("دعم")
    .setDescription("⚙️ أضف مبلغاً من الرون مباشرة إلى محفظة لاعب")
    .addUserOption(o => o.setName("اللاعب").setDescription("اللاعب المستهدف").setRequired(true))
    .addIntegerOption(o => o.setName("المبلغ").setDescription("المبلغ المطلوب إضافته").setMinValue(1).setRequired(true)),

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

    users[target.id].balance = (users[target.id].balance || 0) + amount;
    save("users.json", users);

    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(target.id, interaction.guildId, amount, amount);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إضافة دعم مالي")
      .setDescription(`✅ تم منح <@${target.id}> دعم مالي بقيمة **${n(amount)} رون** بنجاح.\n\n💳 **رصيده الحالي في المحفظة:** ${n(users[target.id].balance)} رون`)] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount < 1) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("الاستخدام: `!دعم <@user> <المبلغ>`")] });
    }

    const users = load("users.json");

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, message.guild.id);
    const dbBal = userRow?.xb || 0;
    if (!users[target.id]) {
      users[target.id] = { balance: dbBal, vault: 0 };
    } else {
      users[target.id].balance = Math.max(users[target.id].balance || 0, dbBal);
    }

    users[target.id].balance = (users[target.id].balance || 0) + amount;
    save("users.json", users);

    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?")
      .run(target.id, message.guild.id, amount, amount);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ إضافة دعم مالي")
      .setDescription(`✅ تم منح <@${target.id}> دعم مالي بقيمة **${n(amount)} رون** بنجاح.\n\n💳 **رصيده الحالي في المحفظة:** ${n(users[target.id].balance)} رون`)] });
  }
};
