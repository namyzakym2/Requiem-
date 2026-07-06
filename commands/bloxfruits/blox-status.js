import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "blox-status",
  category: "bloxfruits",
  data: new SlashCommandBuilder().setName("blox-status").setDescription("متابعة حالة تلفيل حسابك في بلوكس فروت"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "blox-status") {
        const request = db.prepare("SELECT * FROM blox_fruits_requests WHERE userId = ? ORDER BY id DESC LIMIT 1").get(interaction.user.id);
        if (!request) {
          return interaction.reply({ content: "❌ ليس لديك أي طلبات تلفيل حالية.", ephemeral: true });
        }
        const logs2 = db.prepare("SELECT * FROM blox_logs WHERE requestId = ? ORDER BY timestamp DESC LIMIT 3").all(request.id);
        const items = JSON.parse(request.items || "[]");
        const avatarUrl = request.robloxId ? `https://www.roblox.com/headshot-thumbnail/image?userId=${request.robloxId}&width=420&height=420&format=png` : null;
        const embed = new EmbedBuilder().setTitle(`📊 حالة تلفيل حساب: ${request.robloxUsername}`).setThumbnail(avatarUrl).setDescription(`**الحالة:** \`${request.status.toUpperCase()}\``).addFields(
          { name: "📈 المستوى", value: `\`${request.currentLevel}\` / \`${request.maxLevel}\``, inline: true },
          { name: "💰 الفلوس", value: `\`${request.money}\` ฿`, inline: true },
          { name: "⚔️ السيوف المجمعة", value: items.length > 0 ? items.join(", ") : "لا يوجد بعد", inline: false }
        ).setColor(request.status === "processing" ? 16776960 : request.status === "completed" ? 65280 : 5793266).setTimestamp();
        if (logs2.length > 0) {
          const logText = logs2.map((l) => `• [${new Date(l.timestamp).toLocaleTimeString("ar-SA")}] ${l.message}`).join("\n");
          embed.addFields({ name: "📜 آخر التحديثات", value: logText });
        }
        await interaction.reply({ embeds: [embed], ephemeral: true });
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
    const commandName = "blox-status";
    
  }
};
