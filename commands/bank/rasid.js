import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { settings, C, n, E, noRoom } from "./utils.js";

export default {
  name: "رصيد",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("رصيد")
    .setDescription("💳 عرض الرصيد والمحفظة والخزنة بالتفصيل")
    .addUserOption(o => o.setName("اللاعب").setDescription("اللاعب المراد عرض رصيده").setRequired(false)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const target = interaction.options.getUser("اللاعب") || interaction.user;

    // Use SQLite as the single source of truth
    const userRow = db.prepare("SELECT bank_wallet, bank_vault FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, interaction.guildId);
    const balance = userRow?.bank_wallet || 0;
    const bank_vault = userRow?.bank_vault || 0;

    const embed = new EmbedBuilder()
      .setColor("#a855f7")
      .setTitle(`💳 كشف الحساب المالي | ${target.username}`)
      .setDescription(`مرحباً بك في الخدمة المصرفية لـ Requiem. تفاصيل الأرصدة الحالية للحساب:`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "💰 الرصيد الحالي بالمحفظة", value: `\`${n(balance)} دولار\``, inline: true },
        { name: "🏦 الرصيد المؤمن بالخزنة", value: `\`${n(bank_vault)} دولار\``, inline: true },
        { name: "📊 المجموع الإجمالي", value: `\`${n(balance + bank_vault)} دولار\``, inline: false }
      )
      .setFooter({ text: `طلب بواسطة: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const target = message.mentions.users.first() || message.author;

    // Use SQLite as the single source of truth
    const userRow = db.prepare("SELECT bank_wallet, bank_vault FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, message.guild.id);
    const balance = userRow?.bank_wallet || 0;
    const bank_vault = userRow?.bank_vault || 0;

    const embed = new EmbedBuilder()
      .setColor("#a855f7")
      .setTitle(`💳 كشف الحساب المالي | ${target.username}`)
      .setDescription(`تفاصيل الأرصدة الحالية في المحفظة والخزنة البنكية:`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "💰 الرصيد الحالي بالمحفظة", value: `\`${n(balance)} دولار\``, inline: true },
        { name: "🏦 الرصيد المؤمن بالخزنة", value: `\`${n(bank_vault)} دولار\``, inline: true },
        { name: "📊 المجموع الإجمالي", value: `\`${n(balance + bank_vault)} دولار\``, inline: false }
      )
      .setFooter({ text: `طلب بواسطة: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
