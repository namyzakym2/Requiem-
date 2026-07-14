import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export default {
  name: "set-lang",
  aliases: ["set-language", "setlang", "اللغة", "اللمة"],
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("set-lang")
    .setDescription("🔧 ضبط لغة البوت (عربي/إنجليزي) | Set the bot's language (Arabic/English)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o
      .setName("language")
      .setDescription("اختر اللغة | Select language")
      .setRequired(true)
      .addChoices(
        { name: "العربية (Arabic)", value: "ar" },
        { name: "English", value: "en" }
      )
    ),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const { guild, member } = interaction;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ هذا الأمر متاح فقط لمدراء السيرفر (Administrator).", ephemeral: true });
    }

    const lang = interaction.options.getString("language");
    
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(`lang_${guild.id}`, lang);

    const isAr = lang === "ar";
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(isAr ? "✅ تم تحديث اللغة" : "✅ Language Updated")
      .setDescription(isAr 
        ? `تم ضبط لغة البوت بنجاح إلى **العربية** لهذا السيرفر.\nالآن يمكنك استخدام جميع مميزات البوت!` 
        : `The bot's language has been successfully set to **English** for this server.\nYou can now use all the bot's features!`
      )
      .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const { db } = context;
    const { guild, member } = message;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ هذا الأمر متاح فقط لمدراء السيرفر (Administrator).");
    }

    const input = args[0]?.toLowerCase();
    let lang = "";

    if (input === "ar" || input === "عربي" || input === "العربية") {
      lang = "ar";
    } else if (input === "en" || input === "english" || input === "انجليزي" || input === "إنجليزي") {
      lang = "en";
    } else {
      return message.reply("❌ الرجاء تحديد لغة صالحة: `set-lang ar` أو `set-lang en`.\n❌ Please specify a valid language: `set-lang ar` or `set-lang en`.");
    }

    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(`lang_${guild.id}`, lang);

    const isAr = lang === "ar";
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(isAr ? "✅ تم تحديث اللغة" : "✅ Language Updated")
      .setDescription(isAr 
        ? `تم ضبط لغة البوت بنجاح إلى **العربية** لهذا السيرفر.\nالآن يمكنك استخدام جميع مميزات البوت!` 
        : `The bot's language has been successfully set to **English** for this server.\nYou can now use all the bot's features!`
      )
      .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
