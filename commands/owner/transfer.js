import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "transfer",
  category: "owner",
  data: new SlashCommandBuilder().setName("transfer").setDescription("نقل الأعضاء من سيرفر آخر").addStringOption((option) => option.setName("from_server_id").setDescription("ID السيرفر المراد النقل منه").setRequired(true)).addStringOption((option) => option.setName("to_server_id").setDescription("ID السيرفر المراد النقل إليه (اتركه فارغاً للسيرفر الحالي)").setRequired(false)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "transfer") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة التحقق (نقل الأعضاء) معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const sourceGuildId = interaction.options.getString("from_server_id");
        const targetGuildId = interaction.options.getString("to_server_id") || guild.id;
        if (sourceGuildId === "1254568460764053566") {
          return interaction.reply({ content: "❌ لا يمكن نقل التوكنات من هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس موجوداً في السيرفر المستهدف (${targetGuildId}).`, ephemeral: true });
        }
        const tokens = db.prepare("SELECT * FROM tokens WHERE guildId = ?").all(sourceGuildId);
        if (tokens.length === 0) {
          return interaction.reply({ content: `❌ لا توجد توكنات مسجلة لهذا السيرفر (${sourceGuildId}).`, ephemeral: true });
        }
        await interaction.deferReply();
        const targetName = targetGuild.name;
        await interaction.editReply(`⏳ جاري بدء نقل **${tokens.length}** عضو إلى سيرفر **${targetName}**...`);
        let success = 0;
        let failed = 0;
        for (const tokenData of tokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ? AND guildId = ?").run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1e3, tokenData.userId, sourceGuildId);
              } else {
                failed++;
                continue;
              }
            }
            const response = await axios.put(
              `https://discord.com/api/guilds/${targetGuildId}/members/${tokenData.userId}`,
              { access_token: accessToken },
              { headers: { Authorization: `Bot ${DISCORD_TOKEN}`, "Content-Type": "application/json" } }
            );
            if (response.status === 201 || response.status === 204) {
              success++;
            } else {
              failed++;
            }
          } catch (err) {
            failed++;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await interaction.followUp(`✅ اكتملت العملية!
- تم بنجاح: **${success}**
- فشل: **${failed}**
- السيرفر المستهدف: **${targetName}**`);
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
    const commandName = "transfer";
    if (commandName === "transfer") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const targetId = args[0];
          if (!targetId) return message.reply("Usage: transfer <targetUserId>");
          db.prepare("INSERT INTO transfer_requests (guildId, requesterId, targetUserId, status) VALUES (?, ?, ?, 'pending')").run(guildId, message.author.id, targetId);
          return message.reply(`✅ Transfer request sent to <@${targetId}>.`);
        }
  }
};
