import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "bonus-role-settings",
  category: "admin",
  data: new SlashCommandBuilder().setName("bonus-role-settings").setDescription("إعدادات الترقية التلقائية (Admin Only)").addRoleOption((option) => option.setName("max-role").setDescription("أعلى رتبة يمكن الوصول إليها")).addRoleOption((option) => option.setName("base-role").setDescription("الرتبة الأساسية المطلوبة لبدء الترقية")).addStringOption((option) => option.setName("excluded-roles").setDescription("رتب مستبعدة (ID الرتب مفصولة بفاصلة)")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "bonus-role-settings") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const maxRole = interaction.options.getRole("max-role");
        const baseRole = interaction.options.getRole("base-role");
        const excludedRolesStr = interaction.options.getString("excluded-roles");
        if (maxRole) {
          db.prepare("INSERT INTO bonus_role_settings (guildId, maxRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET maxRoleId = excluded.maxRoleId").run(guildId, maxRole.id);
        }
        if (baseRole) {
          db.prepare("INSERT INTO bonus_role_settings (guildId, baseRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET baseRoleId = excluded.baseRoleId").run(guildId, baseRole.id);
        }
        if (excludedRolesStr !== null) {
          const ids = excludedRolesStr.split(/[\s,]+/).filter((id) => id.length > 10).join(",");
          db.prepare("INSERT INTO bonus_role_settings (guildId, excludedRoleIds) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET excludedRoleIds = excluded.excludedRoleIds").run(guildId, ids);
        }
        await interaction.reply("✅ تم تحديث إعدادات الترقية التلقائية بالبونيس بنجاح. سيقوم النظام الآن بتحديد الرتب تلقائياً بين الرتبة الأساسية والسقف.");
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
    const commandName = "bonus-role-settings";
    
  }
};
