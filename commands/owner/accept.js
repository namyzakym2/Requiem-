import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "accept",
  category: "owner",
  data: new SlashCommandBuilder().setName("accept").setDescription("Accept a user and give them the Owner role (Admin Only)").addUserOption((option) => option.setName("user").setDescription("The user to accept").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "accept") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة القبول معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const targetMember = interaction.options.getMember("user");
        if (!targetMember) return interaction.reply({ content: "User not found.", ephemeral: true });
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'إدارة الرتب' (Manage Roles).", ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        try {
          let ownerRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "owner");
          if (!ownerRole) {
            ownerRole = await guild.roles.create({
              name: "Owner",
              permissions: [PermissionFlagsBits.Administrator],
              reason: `Accepted by ${user.tag}`
            });
          }
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            if (err.code === 50013) console.warn(`[ACCEPT] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }
          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole);
            await interaction.editReply(`✅ تم قبول ${targetMember.user.tag} وإعطاؤه رتبة Owner.`);
          } else {
            await interaction.editReply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة." });
          }
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "❌ فشل قبول المستخدم. تأكد من صلاحياتي وموقع رتبتي." });
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
    const commandName = "accept";
    if (commandName === "accept") {
          if (message.author.id !== OWNER_ID) return;
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: accept <userId>");
          db.prepare("UPDATE transfer_requests SET status = 'accepted' WHERE targetUserId = ? AND status = 'pending'").run(targetId);
          return message.reply(`✅ Accepted transfer request for <@${targetId}>.`);
        }
  }
};
