import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "join-server",
  category: "owner",
  data: new SlashCommandBuilder().setName("join-server").setDescription("إدخال الأعضاء (التوكنات) إلى سيرفر معين بواسطة ID").addStringOption((option) => option.setName("server_id").setDescription("ID السيرفر المستهدف").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "join-server") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const targetGuildId = interaction.options.getString("server_id");
        if (targetGuildId === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة إدخال الأعضاء (التوكنات) معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        const targetGuild = client.guilds.cache.get(targetGuildId);
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands&guild_id=${targetGuildId}`;
        if (!targetGuild) {
          return interaction.reply({
            content: `⚠️ البوت ليس عضواً في السيرفر المستهدف (${targetGuildId}).

يجب عليك أولاً دعوة البوت للسيرفر باستخدام الرابط التالي:
${inviteUrl}`,
            ephemeral: true
          });
        }
        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
          return interaction.reply({ content: `❌ البوت يفتقر إلى صلاحية 'إنشاء دعوة' (Create Instant Invite) في السيرفر المستهدف: **${targetGuild.name}**.`, ephemeral: true });
        }
        const allTokens = db.prepare("SELECT * FROM tokens").all();
        const uniqueTokens = Array.from(new Map(allTokens.map((t) => [t.userId, t])).values());
        if (uniqueTokens.length === 0) {
          return interaction.reply({ content: "❌ لا توجد توكنات مسجلة في قاعدة البيانات.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`⏳ البوت موجود بالفعل في **${targetGuild.name}**.
جاري بدء إدخال **${uniqueTokens.length}** عضو إلى السيرفر المذكور...`);
        let success = 0;
        let failed = 0;
        for (const tokenData of uniqueTokens) {
          try {
            let accessToken = tokenData.accessToken;
            if (Date.now() > tokenData.expiresAt) {
              const refreshed = await refreshAccessToken(tokenData.refreshToken);
              if (refreshed) {
                accessToken = refreshed.access_token;
                db.prepare("UPDATE tokens SET accessToken = ?, refreshToken = ?, expiresAt = ? WHERE userId = ? AND guildId = ?").run(refreshed.access_token, refreshed.refresh_token, Date.now() + refreshed.expires_in * 1e3, tokenData.userId, tokenData.guildId);
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
        await interaction.followUp(`✅ اكتملت عملية الإدخال إلى **${targetGuild.name}**!
- تم بنجاح: **${success}**
- فشل: **${failed}**`);
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
    const commandName = "join-server";
    if (commandName === "join-server") {
          if (message.author.id !== OWNER_ID) return;
          const inviteUrl = args[0];
          if (!inviteUrl) return message.reply("Usage: join-server <inviteUrl>");
          return message.reply("Bots cannot join servers via invite links directly. Please use the invite link to add me manually.");
        }
  }
};
