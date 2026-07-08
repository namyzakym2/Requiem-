import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { load, save, C, E } from "./utils.js";

export default {
  name: "حظر_بنك",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("حظر_بنك")
    .setDescription("⚙️ احظر عضواً من استخدام نظام وألعاب البنك")
    .addUserOption(o => o.setName("العضو").setDescription("العضو المراد حظره").setRequired(true))
    .addStringOption(o => o.setName("السبب").setDescription("سبب الحظر").setRequired(false)),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")], ephemeral: true });
    }

    const target = interaction.options.getUser("العضو");
    const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب";

    const bans = load("bans.json");
    bans[target.id] = {
      bannedBy: interaction.user.id,
      reason,
      time: Date.now()
    };
    save("bans.json", bans);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ تم الحظر من البنك")
      .setDescription(`✅ تم حظر <@${target.id}> من استخدام البنك وألعابه بنجاح.\n\n📝 **السبب:** ${reason}`)] });
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("هذا الأمر متاح للمسؤولين فقط.")] });
    }

    const target = message.mentions.users.first();
    if (!target) {
      return message.reply({ embeds: [E("❌ خطأ").setDescription("يرجى منشن العضو الذي تريد حظره.")] });
    }

    const reason = args.slice(1).join(" ") || "لم يتم تحديد سبب";

    const bans = load("bans.json");
    bans[target.id] = {
      bannedBy: message.author.id,
      reason,
      time: Date.now()
    };
    save("bans.json", bans);

    return message.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("⚙️ تم الحظر من البنك")
      .setDescription(`✅ تم حظر <@${target.id}> من استخدام البنك وألعابه بنجاح.\n\n📝 **السبب:** ${reason}`)] });
  }
};
