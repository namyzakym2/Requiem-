import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "add-role",
  category: "moderation",
  data: new SlashCommandBuilder().setName("add-role").setDescription("Assign a role to a user").addUserOption((option) => option.setName("user").setDescription("The user to give the role to").setRequired(true)).addRoleOption((option) => option.setName("role").setDescription("The role to assign").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "add-role") {
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
          return interaction.reply({ content: "❌ I cannot assign this role because it is higher than or equal to my highest role.", ephemeral: true });
        }
        try {
          await member.roles.add(role.id);
          await interaction.reply({ content: `✅ Successfully added the role **${role.name}** to **${user2.tag}**.` });
        } catch (err) {
          console.error("Error adding role:", err);
          await interaction.reply({ content: "❌ Failed to add the role. Make sure I have enough permissions and my role is above the target role.", ephemeral: true });
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
    const commandName = "add-role";
    if (commandName === "add-role") {
          if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply("You need 'Manage Roles' permission.");
          }
          const target = message.mentions.members.first();
          const role = message.mentions.roles.first();
          if (!target || !role) return message.reply("Usage: add-role <@user> <@role>");
          try {
            await target.roles.add(role);
            return message.reply(`✅ Added role <@&${role.id}> to ${target}.`);
          } catch (err) {
            return message.reply("❌ Failed to add role. Check my permissions and role hierarchy.");
          }
        }
  }
};
