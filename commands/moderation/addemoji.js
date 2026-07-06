import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
  name: "addemoji",
  aliases: ["emojis", "eo"],
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("addemoji")
    .setDescription("إضافة إيموجي أو عدة إيموجيات إلى السيرفر")
    .addStringOption(opt => opt.setName("emojis").setDescription("الإيموجيات المراد إضافتها").setRequired(true)),

  async executeInteraction(interaction, context) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة الإيموجيات.", ephemeral: true });
    }
    const input = interaction.options.getString("emojis");
    const emojisInContent = input.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/gi);
    if (!emojisInContent) {
      return interaction.reply({ content: "❌ يرجى إرفاق الإيموجيات المراد إضافتها.", ephemeral: true });
    }

    await interaction.deferReply();
    const added = [];
    for (const emote of emojisInContent) {
      const match = emote.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
      if (match) {
        const animated = Boolean(match[1]);
        const name = match[2];
        const id = match[3];
        const link = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
        try {
          const created = await interaction.guild.emojis.create({ attachment: link, name });
          added.push(created.toString());
        } catch (err) {
          console.error("Failed to add emoji:", err);
        }
      }
    }

    if (added.length > 0) {
      return interaction.editReply(`✅ تم إضافة الإيموجيات بنجاح: ${added.join(" ")}`);
    } else {
      return interaction.editReply("❌ فشل إضافة الإيموجيات (قد تكون مساحة الإيموجيات ممتلئة أو الرابط غير صالح).");
    }
  },

  async executeMessage(message, args, context) {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return message.reply("❌ ليس لديك صلاحية إدارة الإيموجيات.");
    }
    const emojisInContent = message.content.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/gi);
    if (!emojisInContent) {
      return message.reply("❌ يرجى إرفاق الإيموجيات بعد الأمر.");
    }

    const added = [];
    for (const emote of emojisInContent) {
      const match = emote.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
      if (match) {
        const animated = Boolean(match[1]);
        const name = match[2];
        const id = match[3];
        const link = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
        try {
          const created = await message.guild.emojis.create({ attachment: link, name });
          added.push(created.toString());
        } catch (err) {
          console.error(err);
        }
      }
    }

    if (added.length > 0) {
      return message.reply(`✅ تم إضافة الإيموجيات إلى السيرفر: [ ${added.join(", ")} ]`);
    } else {
      return message.reply("❌ لم يتم إضافة أي إيموجي.");
    }
  }
};
