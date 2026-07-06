import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "get-invite",
  category: "owner",
  data: new SlashCommandBuilder().setName("get-invite").setDescription("إنشاء رابط دعوة لسيرفر معين يتواجد فيه البوت").addStringOption((opt) => opt.setName("server_id").setDescription("ID السيرفر").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "get-invite") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const targetGuildId = interaction.options.getString("server_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس عضواً في هذا السيرفر (${targetGuildId}).`, ephemeral: true });
        }
        try {
          const channel2 = targetGuild.systemChannel || targetGuild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.permissionsFor(client.user)?.has(PermissionFlagsBits.CreateInstantInvite));
          if (!channel2) {
            return interaction.reply({ content: "❌ لا أملك صلاحية إنشاء روابط دعوة في هذا السيرفر.", ephemeral: true });
          }
          const invite = await channel2.createInvite({ maxAge: 0, maxUses: 0 });
          await interaction.reply({ content: `✅ رابط الدعوة لسيرفر **${targetGuild.name}**:
${invite.url}` });
        } catch (err) {
          console.error("Invite creation error:", err);
          await interaction.reply({ content: "❌ حدث خطأ أثناء محاولة إنشاء رابط الدعوة.", ephemeral: true });
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
    const commandName = "get-invite";
    if (commandName === "get-invite") {
          if (message.author.id !== OWNER_ID) return;
          const guildIdInput = args[0];
          if (!guildIdInput) return message.reply("Usage: get-invite <guildId>");
          const guild = client.guilds.cache.get(guildIdInput);
          if (!guild) return message.reply("Guild not found.");
          const channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText);
          if (!channel) return message.reply("No text channel found.");
          const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
          return message.reply(invite ? `Invite for **${guild.name}**: ${invite.url}` : "Failed to create invite.");
        }
  }
};
