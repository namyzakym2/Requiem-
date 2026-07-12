import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) {
    const num = parseInt(str);
    if (!isNaN(num)) return num; // default to minutes
    return null;
  }
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return val / 60; // seconds to minutes
    case 'm': return val;      // minutes
    case 'h': return val * 60; // hours to minutes
    case 'd': return val * 1440; // days to minutes
    default: return val;
  }
}

export default {
  name: "giveaway",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 إنشاء مسابقة (Giveaway)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) =>
      option.setName("prize")
        .setDescription("الجائزة المراد توزيعها")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("duration")
        .setDescription("المدة (مثال: 10m, 2h, 1d)")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName("winners")
        .setDescription("عدد الفائزين بالمسابقة")
        .setRequired(true)
    ),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const prize = interaction.options.getString("prize");
    const durationStr = interaction.options.getString("duration");
    const winnersCount = interaction.options.getInteger("winners");

    // Check permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية إدارة الرسائل لإنشاء مسابقة.", ephemeral: true });
    }

    const durationMin = parseDuration(durationStr);
    if (!durationMin || durationMin <= 0) {
      return interaction.reply({ content: "❌ مدة المسابقة غير صالحة. يرجى استخدام صيغة مثل `10m` أو `2h` أو `1d`.", ephemeral: true });
    }

    const endTime = Date.now() + durationMin * 60 * 1000;

    const embed = new EmbedBuilder()
      .setDescription(
        `🟢 **${prize}**\n` +
        `🔒 **Hosted By** ${interaction.user}\n` +
        `⏰ **Ends** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
        `.mm.8`
      )
      .setColor("#6d28d9");

    const msg = await interaction.reply({ content: "🎉 **GIVEAWAY** 🎉", embeds: [embed], fetchReply: true });
    
    // Add reaction
    await msg.react("🎉").catch(console.error);

    // Save to database
    db.prepare("INSERT INTO giveaways (messageId, channelId, guildId, prize, endTime, winnersCount, hostId) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(msg.id, interaction.channelId, interaction.guildId, prize, endTime, winnersCount, interaction.user.id);
  },

  async executeMessage(message, args, context) {
    const { db, PREFIX } = context;

    // Check permissions
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply("❌ ليس لديك صلاحية إدارة الرسائل لإنشاء مسابقة.");
    }

    if (args.length < 3) {
      const usageEmbed = new EmbedBuilder()
        .setTitle("❌ استخدام خاطئ للأمر")
        .setDescription(
          `**الاستخدام الصحيح:**\n` +
          `\`${PREFIX}giveaway <المدة> <عدد الفائزين> <الجائزة>\`\n\n` +
          `**أمثلة:**\n` +
          `\`${PREFIX}giveaway 10m 1 نيترو قيرل\`\n` +
          `\`${PREFIX}giveaway 2h 3 سكنات فورتنايت\`\n` +
          `\`${PREFIX}giveaway 1d 1 حساب مبرمج\`\n\n` +
          `**وحدات الوقت المتاحة:** \`m\` (دقائق), \`h\` (ساعات), \`d\` (أيام).`
        )
        .setColor("#ef4444");
      return message.reply({ embeds: [usageEmbed] });
    }

    const durationStr = args[0];
    const winnersCount = parseInt(args[1]);
    const prize = args.slice(2).join(" ");

    const durationMin = parseDuration(durationStr);
    if (!durationMin || durationMin <= 0) {
      return message.reply("❌ مدة المسابقة غير صالحة. يرجى استخدام صيغة مثل `10m` أو `2h` أو `1d`.");
    }

    if (isNaN(winnersCount) || winnersCount <= 0) {
      return message.reply("❌ عدد الفائزين يجب أن يكون رقماً صحيحاً أكبر من 0.");
    }

    const endTime = Date.now() + durationMin * 60 * 1000;

    const embed = new EmbedBuilder()
      .setDescription(
        `🟢 **${prize}**\n` +
        `🔒 **Hosted By** ${message.author}\n` +
        `⏰ **Ends** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
        `.mm.8`
      )
      .setColor("#6d28d9");

    // Delete original message
    await message.delete().catch(() => {});

    const msg = await message.channel.send({ content: "🎉 **GIVEAWAY** 🎉", embeds: [embed] });
    
    // Add reaction
    await msg.react("🎉").catch(console.error);

    // Save to database
    db.prepare("INSERT INTO giveaways (messageId, channelId, guildId, prize, endTime, winnersCount, hostId) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(msg.id, message.channelId, message.guildId, prize, endTime, winnersCount, message.author.id);
  }
};
