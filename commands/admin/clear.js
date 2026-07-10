import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "clear",
  category: "admin",
  data: new SlashCommandBuilder().setName("clear").setDescription("حذف الرسائل").addIntegerOption(o => o.setName("amount").setDescription("العدد").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async executeInteraction(interaction) {
    const amount = interaction.options.getInteger("amount");
    await interaction.channel.bulkDelete(amount);
    await interaction.reply({ content: `✅ تم حذف ${amount} رسالة`, ephemeral: true });
  }
};
