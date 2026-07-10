import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, settings, C, n, E, noRoom } from "./utils.js";

export default {
  name: "رصيد",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("رصيد")
    .setDescription("💳 عرض الرصيد والخزنة")
    .addUserOption(o => o.setName("اللاعب").setDescription("اللاعب المراد عرض رصيده").setRequired(false)),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const target = interaction.options.getUser("اللاعب") || interaction.user;

    // Use SQLite as the single source of truth
    const userRow = db.prepare("SELECT xb, vault FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, interaction.guildId);
    const balance = userRow?.xb || 0;
    const vault = userRow?.vault || 0;

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle(`💳 رصيد ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "💰 المحفظة", value: `${n(balance)} رون`, inline: true },
        { name: "🏦 الخزنة",  value: `${n(vault)} رون`, inline: true }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const target = message.mentions.users.first() || message.author;

    // Use SQLite as the single source of truth
    const userRow = db.prepare("SELECT xb, vault FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, message.guild.id);
    const balance = userRow?.xb || 0;
    const vault = userRow?.vault || 0;

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle(`💳 رصيد ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "💰 المحفظة", value: `${n(balance)} رون`, inline: true },
        { name: "🏦 الخزنة",  value: `${n(vault)} رون`, inline: true }
      ).setTimestamp()] });
  }
};
