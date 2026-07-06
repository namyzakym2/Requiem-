import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "remove-role",
  category: "moderation",
  data: new SlashCommandBuilder().setName("remove-role").setDescription("Remove a role from a user").addUserOption((option) => option.setName("user").setDescription("The user to remove the role from").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("The role to remove").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "remove-role") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({ content: "❌ You need 'Manage Roles' permission to use this command.", ephemeral: true });
        }
        const user2 = interaction.options.getUser("user", true);
        const role = interaction.options.getRole("role", true);
        const member = await interaction.guild?.members.fetch(user2.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
        }
        const botMember = await interaction.guild?.members.fetch(client.user.id);
        if (botMember && role.position >= botMember.roles.highest.position) {
          return interaction.reply({ content: "❌ I cannot remove this role because it is higher than or equal to my highest role.", ephemeral: true });
        }
        try {
          await member.roles.remove(role.id);
          await interaction.reply({ content: `✅ Successfully removed the role **${role.name}** from **${user2.tag}**.` });
        } catch (err) {
          console.error("Error removing role:", err);
          await interaction.reply({ content: "❌ Failed to remove the role. Make sure I have enough permissions and my role is above the target role.", ephemeral: true });
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
    const commandName = "remove-role";
    if (commandName === "remove-role") {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply("You need 'Manage Roles' permission.");
          }
          const target = message.mentions.members.first();
          const role = message.mentions.roles.first();
          if (!target || !role) return message.reply("Usage: remove-role <@user> <@role>");
          try {
            await target.roles.remove(role);
            return message.reply(`✅ Removed role <@&${role.id}> from ${target}.`);
          } catch (err) {
            return message.reply("❌ Failed to remove role. Check my permissions and role hierarchy.");
          }
        }
  }
};
