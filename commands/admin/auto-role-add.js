import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "auto-role-add",
  category: "admin",
  data: new SlashCommandBuilder().setName("auto-role-add").setDescription("إضافة رتبة تلقائية وإعطاؤها لجميع الأعضاء (Admin Only)").addRoleOption((option) => option.setName("role").setDescription("الرتبة المراد إضافتها").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "auto-role-add") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        db.prepare("INSERT OR REPLACE INTO auto_roles (guildId, roleId) VALUES (?, ?)").run(guildId, role.id);
        await interaction.reply(`✅ تم إضافة الرتبة ${role} إلى قائمة الرتب التلقائية. جاري توزيع الرتبة على جميع الأعضاء...`);
        const guild2 = interaction.guild;
        guild2.members.fetch().then(async (members) => {
          let count = 0;
          for (const member of members.values()) {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role.id).catch(() => {
              });
              count++;
            }
          }
          await interaction.followUp(`✅ تم الانتهاء من توزيع الرتبة على **${count}** عضو.`);
        }).catch((err) => {
          console.error("Failed to fetch members for auto-role-add:", err);
          interaction.followUp("❌ حدث خطأ أثناء محاولة توزيع الرتبة على جميع الأعضاء.").catch(() => {
          });
        });
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
    const commandName = "auto-role-add";
    
  }
};
