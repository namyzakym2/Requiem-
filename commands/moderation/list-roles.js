import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "list-roles",
  category: "moderation",
  data: new SlashCommandBuilder().setName("list-roles").setDescription("List all roles of a user").addUserOption((option) => option.setName("user").setDescription("The user to list roles for").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "list-roles") {
        const user2 = interaction.options.getUser("user", true);
        const member = await interaction.guild?.members.fetch(user2.id).catch(() => null);
        if (!member) {
          return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
        }
        const roles = member.roles.cache.filter((role) => role.name !== "@everyone").map((role) => `<@&${role.id}>`).join(", ");
        const embed = new EmbedBuilder().setTitle(`Roles for ${user2.username}`).setDescription(roles || "No roles assigned.").setColor(5793266).setThumbnail(user2.displayAvatarURL()).setTimestamp();
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
    const commandName = "list-roles";
    if (commandName === "list-roles") {
          const roles = message.guild?.roles.cache.filter((r) => r.name !== "@everyone").map((r) => `<@&${r.id}>`).join(", ");
          return message.reply(`**Roles in this server:**
${roles || "None"}`);
        }
  }
};
