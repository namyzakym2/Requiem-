import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "broadcast-tokens",
  category: "owner",
  data: new SlashCommandBuilder().setName("broadcast-tokens").setDescription("إرسال رسالة برودكاست لجميع المستخدمين المسجلين (التوكنات)").addStringOption((opt) => opt.setName("message").setDescription("الرسالة المراد إرسالها").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "broadcast-tokens") {
        if (interaction.user.id !== OWNER_ID) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة البرودكاست عبر التوكنات معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        const broadcastMessage = interaction.options.getString("message");
        const allTokens = db.prepare("SELECT * FROM tokens").all();
        const uniqueTokens = Array.from(new Map(allTokens.map((t) => [t.userId, t])).values());
        if (uniqueTokens.length === 0) {
          return interaction.reply({ content: "❌ لا توجد توكنات مسجلة في قاعدة البيانات.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`⏳ جاري بدء إرسال البرودكاست إلى **${uniqueTokens.length}** مستخدم مسجل... (سيتم تحديث التوكنات المنتهية تلقائياً)`);
        let successCount = 0;
        let failCount = 0;
        for (const tokenData of uniqueTokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ?").run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1e3, tokenData.userId);
              } else {
                failCount++;
                continue;
              }
            }
            try {
              const user2 = await client.users.fetch(tokenData.userId);
              await user2.send(broadcastMessage);
              successCount++;
            } catch (dmErr) {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        }
        await interaction.followUp(`✅ اكتمل برودكاست التوكنات!
- تم الإرسال لـ: **${successCount}**
- فشل الإرسال لـ: **${failCount}**`);
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
    const commandName = "broadcast-tokens";
    if (commandName === "broadcast-tokens") {
          if (message.author.id !== OWNER_ID) return;
          return message.reply("Broadcast tokens command executed (placeholder).");
        }
  }
};
