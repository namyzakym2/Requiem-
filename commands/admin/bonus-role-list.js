import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "bonus-role-list",
  category: "admin",
  data: new SlashCommandBuilder().setName("bonus-role-list").setDescription("عرض قائمة رتب الترقية التلقائية"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "bonus-role-list") {
        const settings = db.prepare("SELECT maxRoleId, excludedRoleIds, baseRoleId FROM bonus_role_settings WHERE guildId = ?").get(guildId);
        const excludedRoleIds = settings?.excludedRoleIds ? settings.excludedRoleIds.split(",").map((id) => id.trim()) : [];
        const maxRoleId = settings?.maxRoleId;
        const baseRoleId = settings?.baseRoleId;
        let systemRoles = [];
        if (baseRoleId && maxRoleId) {
          const baseRole = interaction.guild?.roles.cache.get(baseRoleId);
          const maxRole = interaction.guild?.roles.cache.get(maxRoleId);
          if (baseRole && maxRole) {
            systemRoles = interaction.guild.roles.cache.filter((r) => r.position > baseRole.position && r.position <= maxRole.position && !excludedRoleIds.includes(r.id)).sort((a, b) => a.position - b.position).map((r) => r);
          }
        }
        if (systemRoles.length === 0) {
          const roles = db.prepare("SELECT roleId FROM bonus_roles WHERE guildId = ?").all(guildId);
          systemRoles = roles.map((r) => interaction.guild?.roles.cache.get(r.roleId)).filter((r) => r !== void 0 && !excludedRoleIds.includes(r.id)).sort((a, b) => a.position - b.position);
        }
        if (systemRoles.length === 0) {
          return interaction.reply({ content: "لا توجد رتب ترقية تلقائية مضافة حالياً.", ephemeral: true });
        }
        const list = systemRoles.map((r, i) => `${i + 1}. <@&${r.id}>`).join("\n");
        const embed = new EmbedBuilder().setTitle("🏆 نظام الترقية التلقائية (Bonus)").setDescription(`يتم الترقية تلقائياً عند جمع **20 bonus**.

**ترتيب الرتب:**
${list}`).setColor(65280);
        if (baseRoleId) {
          embed.addFields({ name: "الرتبة الأساسية المطلوبة", value: `<@&${baseRoleId}>`, inline: true });
        }
        if (maxRoleId) {
          embed.addFields({ name: "أعلى رتبة (السقف)", value: `<@&${maxRoleId}>`, inline: true });
        }
        if (excludedRoleIds.length > 0) {
          const excluded = excludedRoleIds.map((id) => `<@&${id}>`).join(", ");
          embed.addFields({ name: "الرتب المستبعدة (تخطي)", value: excluded });
        }
        await interaction.reply({ embeds: [embed] });
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
    const commandName = "bonus-role-list";
    
  }
};
