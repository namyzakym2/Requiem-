import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "promote-owner",
  category: "owner",
  data: new SlashCommandBuilder().setName("promote-owner").setDescription("Promote a user to Owner status (Guild Owner Only)").addUserOption((option) => option.setName("user").setDescription("The user to promote").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "promote-owner") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة الترقية معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (interaction.user.id !== guild.ownerId) {
          return interaction.reply({ content: "Only the server owner can use this command.", ephemeral: true });
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
              reason: `Manual promotion by ${user.tag}`
            });
          }
          try {
            const botHighestRole = botMember.roles.highest;
            if (botHighestRole && ownerRole.position < botHighestRole.position - 1) {
              await ownerRole.setPosition(botHighestRole.position - 1);
            }
          } catch (err) {
            if (err.code === 50013) console.warn(`[PROMOTE] Missing Permissions to move Owner role in ${guild.name}`);
            else console.warn(`Could not move Owner role in ${guild.name}:`, err.message);
          }
          if (ownerRole.editable) {
            await targetMember.roles.add(ownerRole);
            await interaction.editReply(`✅ Successfully promoted ${targetMember.user.tag} to Owner.`);
          } else {
            await interaction.editReply({ content: "❌ لا يمكن للبوت إعطاء هذه الرتبة لأنها أعلى من رتبته في القائمة." });
          }
        } catch (err) {
          console.error(err);
          await interaction.editReply({ content: "❌ Failed to promote user. Check my permissions and role hierarchy." });
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
    const commandName = "promote-owner";
    if (commandName === "promote-owner") {
          if (message.author.id !== OWNER_ID) return;
          const target = message.mentions.users.first();
          if (!target) return message.reply("Usage: promote-owner <@user>");
          db.prepare("INSERT OR REPLACE INTO owners (userId) VALUES (?)").run(target.id);
          return message.reply(`✅ Promoted ${target} to Bot Owner.`);
        }
  }
};
