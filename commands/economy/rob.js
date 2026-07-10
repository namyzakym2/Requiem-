import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "rob",
  category: "economy",
  data: new SlashCommandBuilder().setName("rob").setDescription("سرقة رون من مستخدم").addUserOption(o => o.setName("user").setDescription("الشخص").setRequired(true)),
  async executeInteraction(interaction, context) {
    const { db } = context;
    const target = interaction.options.getUser("user");
    if (target.id === interaction.user.id) return interaction.reply("لا يمكنك سرقة نفسك!");
    
    const amount = Math.floor(Math.random() * 200);
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb - ?").run(target.id, interaction.guildId, amount, amount);
    db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(interaction.user.id, interaction.guildId, amount, amount);
    
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xEF4444).setDescription(`💸 نجحت في سرقة **${amount}** رون من ${target}!`).setTimestamp()] });
  }
};
