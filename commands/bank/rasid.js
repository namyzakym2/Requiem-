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
    const users = load("users.json");

    // Sync from SQLite to ensure accurate balance matching
    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, interaction.guildId);
    const dbBal = userRow?.xb || 0;
    
    if (!users[target.id]) {
      users[target.id] = { balance: dbBal, vault: 0 };
    } else {
      users[target.id].balance = Math.max(users[target.id].balance || 0, dbBal);
    }

    const u = users[target.id];

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle(`💳 رصيد ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "💰 المحفظة", value: `${n(u.balance || 0)} رون`, inline: true },
        { name: "🏦 الخزنة",  value: `${n(u.vault   || 0)} رون`, inline: true }
      ).setTimestamp()] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const target = message.mentions.users.first() || message.author;
    const users = load("users.json");

    const userRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(target.id, message.guild.id);
    const dbBal = userRow?.xb || 0;
    
    if (!users[target.id]) {
      users[target.id] = { balance: dbBal, vault: 0 };
    } else {
      users[target.id].balance = Math.max(users[target.id].balance || 0, dbBal);
    }

    const u = users[target.id];

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle(`💳 رصيد ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "💰 المحفظة", value: `${n(u.balance || 0)} رون`, inline: true },
        { name: "🏦 الخزنة",  value: `${n(u.vault   || 0)} رون`, inline: true }
      ).setTimestamp()] });
  }
};
