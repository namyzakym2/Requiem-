import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, E } from "./utils.js";

export default {
  name: "رفع_حظر",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("رفع_حظر")
    .setDescription("⚙️ ارفع الحظر المالي عن عضو")
    .addUserOption(o => o.setName("العضو").setDescription("العضو المطلوب إلغاء حظره").setRequired(true)),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")], ephemeral: true });
    }

    const target = interaction.options.getUser("العضو");
    const bans = load("bans.json");

    if (!bans[target.id]) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا العضو غير محظور في نظام البنك.")], ephemeral: true });
    }

    delete bans[target.id];
    save("bans.json", bans);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ تم إلغاء حظر البنك")
      .setDescription(`✅ تم إلغاء حظر البنك للأعضاء عن <@${target.id}> بنجاح.`)] });
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    const target = message.mentions.users.first();
    if (!target) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى منشن العضو المطلوب إلغاء حظره.")] });
    }

    const bans = load("bans.json");
    if (!bans[target.id]) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا العضو غير محظور في نظام البنك.")] });
    }

    delete bans[target.id];
    save("bans.json", bans);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ تم إلغاء حظر البنك")
      .setDescription(`✅ تم إلغاء حظر البنك للأعضاء عن <@${target.id}> بنجاح.`)] });
  }
};
