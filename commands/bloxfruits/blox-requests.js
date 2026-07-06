import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "blox-requests",
  category: "bloxfruits",
  data: new SlashCommandBuilder().setName("blox-requests").setDescription("عرض طلبات تلفيل بلوكس فروت (Admin Only)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "blox-requests") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ هذا الأمر للمسؤولين فقط.", ephemeral: true });
        }
        const requests = db.prepare("SELECT * FROM blox_fruits_requests WHERE status != 'completed' LIMIT 10").all();
        if (requests.length === 0) {
          return interaction.reply({ content: "❌ لا توجد طلبات تلفيل حالياً.", ephemeral: true });
        }
        const embed = new EmbedBuilder().setTitle("📋 إدارة طلبات تلفيل بلوكس فروت").setColor(5793266).setTimestamp();
        let description = "";
        for (const req of requests) {
          description += `**ID:** \`${req.id}\` | **User:** <@${req.userId}>
**Roblox:** \`${req.robloxUsername}\` | **Pass:** \`${req.robloxPassword}\`
**Status:** \`${req.status}\` | **Level:** \`${req.currentLevel}\`
---
`;
        }
        embed.setDescription(description);
        const firstReq = requests[0];
        const manageRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`blox_start_${firstReq.id}`).setLabel(`بدء التلفيل #${firstReq.id}`).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`blox_complete_${firstReq.id}`).setLabel(`إكمال #${firstReq.id}`).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`blox_fail_${firstReq.id}`).setLabel(`فشل #${firstReq.id}`).setStyle(ButtonStyle.Danger)
        );
        const logRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("blox_view_logs").setLabel("عرض السجلات (Logs)").setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ embeds: [embed], components: [manageRow, logRow], ephemeral: true });
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
    const commandName = "blox-requests";
    if (commandName === "blox-requests") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
          const requests = db.prepare("SELECT * FROM blox_fruits_requests WHERE status = 'pending' LIMIT 10").all();
          if (requests.length === 0) return message.reply("❌ لا توجد طلبات معلقة.");
          const embed = new EmbedBuilder().setTitle("📋 طلبات تلفيل بلوكس فروت").setColor(5793266);
          let desc = "";
          requests.forEach((req) => {
            desc += `**ID:** \`${req.id}\` | <@${req.userId}>
**User:** \`${req.robloxUsername}\` | **Pass:** \`${req.robloxPassword}\`

`;
          });
          embed.setDescription(desc);
          return message.reply({ embeds: [embed] });
        }
  }
};
