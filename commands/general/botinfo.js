import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "botinfo",
  category: "general",
  data: new SlashCommandBuilder().setName("botinfo").setDescription("Display detailed information about the bot"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "botinfo") {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        const embed = new EmbedBuilder().setTitle("🥀 Requiem Information").setColor("#8B0000").setThumbnail(client.user?.displayAvatarURL() || null).setDescription("A masterpiece of power and elegance. Orchestrating the end of old worlds and the birth of new ones.").addFields(
          { name: "📌 Name", value: `${client.user?.tag}`, inline: true },
          { name: "🆔 ID", value: `${client.user?.id}`, inline: true },
          { name: "📅 Created At", value: `<t:${Math.floor(client.user.createdTimestamp / 1e3)}:R>`, inline: true },
          { name: "📚 Library", value: "discord.js", inline: true },
          { name: "🔢 Version", value: "1.0.0", inline: true },
          { name: "🌐 Servers", value: `${client.guilds.cache.size}`, inline: true },
          { name: "👥 Users", value: `${client.users.cache.size}`, inline: true },
          { name: "⏳ Uptime", value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: "⚡ Latency", value: `${client.ws.ping}ms`, inline: true }
        ).setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() }).setTimestamp();
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
    const commandName = "botinfo";
    if (commandName === "botinfo") {
          const embed = new EmbedBuilder().setTitle("Bot Information").addFields(
            { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
            { name: "Users", value: `${client.users.cache.size}`, inline: true },
            { name: "Uptime", value: `${Math.floor(client.uptime / 1e3 / 60)} minutes`, inline: true }
          ).setColor(44678);
          return message.reply({ embeds: [embed] });
        }
  }
};
