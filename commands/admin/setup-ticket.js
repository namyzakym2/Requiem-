import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "setup-ticket",
  category: "admin",
  data: new SlashCommandBuilder().setName("setup-ticket").setDescription("Create the ticket support interface").addRoleOption((option) => option.setName("role").setDescription("The support role to mention").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "setup-ticket") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "You need Administrator permissions.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guild.id, role.id);
        const embed = new EmbedBuilder().setTitle("Support Tickets").setDescription("Click the button below to open a support ticket.").setColor(5793266);
        const button = new ButtonBuilder().setCustomId("open_ticket").setLabel("Open Ticket").setStyle(ButtonStyle.Primary).setEmoji("🎫");
        const row = new ActionRowBuilder().addComponents(button);
        const botMember = guild.members.me;
        if (!botMember?.permissionsIn(interaction.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.", ephemeral: true });
        }
        await interaction.channel?.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket setup sent! Support role set to ${role}.`, ephemeral: true });
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
    const commandName = "setup-ticket";
    if (commandName === "setup-ticket") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You need Administrator permissions.");
          }
          const role = message.mentions.roles.first();
          if (!role) return message.reply("Usage: setup-ticket <@role>");
          db.prepare("INSERT INTO ticket_settings (guildId, supportRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET supportRoleId = excluded.supportRoleId").run(guildId, role.id);
          const embed = new EmbedBuilder().setTitle("Support Tickets").setDescription("Click the button below to open a support ticket.").setColor(5793266);
          const button = new ButtonBuilder().setCustomId("open_ticket").setLabel("Open Ticket").setStyle(ButtonStyle.Primary).setEmoji("🎫");
          const row = new ActionRowBuilder().addComponents(button);
          const botMember = message.guild?.members.me;
          if (!botMember?.permissionsIn(message.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return message.reply("❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.");
          }
          await message.channel.send({ embeds: [embed], components: [row] });
          return message.reply(`Ticket setup sent! Support role set to ${role}.`);
        }
  }
};
