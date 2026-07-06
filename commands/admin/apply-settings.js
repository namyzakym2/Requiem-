import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "apply-settings",
  category: "admin",
  data: new SlashCommandBuilder().setName("apply-settings").setDescription("إعدادات التقديم (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("القناة التي ستصل إليها التقديمات").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("الرتبة التي سيحصل عليها المقبول").setRequired(true)).addRoleOption((option) => option.setName("staff_role").setDescription("رتبة الإدارة التي يمكنها مراجعة التقديمات").setRequired(true)).addStringOption((option) => option.setName("image").setDescription("رابط صورة التقديم (اختياري)").setRequired(false)).addStringOption((option) => option.setName("questions").setDescription("الأسئلة مفصولة بفاصلة (بحد أقصى 5 أسئلة)").setRequired(false)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "apply-settings") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const channel2 = interaction.options.getChannel("channel", true);
        const role = interaction.options.getRole("role", true);
        const staffRole = interaction.options.getRole("staff_role", true);
        const imageUrl = interaction.options.getString("image");
        const questionsStr = interaction.options.getString("questions");
        let questionsJson = null;
        if (questionsStr) {
          const questions = questionsStr.split(",").map((q) => q.trim()).filter((q) => q.length > 0).slice(0, 5);
          questionsJson = JSON.stringify(questions);
        }
        db.prepare("INSERT OR REPLACE INTO apply_settings (guildId, channelId, roleId, staffRoleId, imageUrl, questions, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)").run(guild.id, channel2.id, role.id, staffRole.id, imageUrl, questionsJson, 1);
        await interaction.reply({ content: `✅ تم حفظ إعدادات التقديم:
- القناة: ${channel2}
- الرتبة: ${role}
- رتبة الإدارة: ${staffRole}${imageUrl ? `
- الصورة: [رابط](${imageUrl})` : ""}${questionsStr ? `
- الأسئلة: ${questionsStr}` : ""}`, ephemeral: true });
      }
  },
  async executeMessage(message, args, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    const guildId = message.guild.id;
    const commandName = "apply-settings";
    
  }
};
