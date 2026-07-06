import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "unban-all",
  category: "moderation",
  data: new SlashCommandBuilder().setName("unban-all").setDescription("Unban ALL users from a specific server (Authorized Only)").addStringOption((option) => option.setName("server_id").setDescription("ID of the server").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "unban-all") {
        if (user.id !== OWNER_ID && user.username !== OWNER_USERNAME) return interaction.reply({ content: "❌ هذا الأمر خاص بالمطور فقط.", ephemeral: true });
        const targetGuildId = interaction.options.getString("server_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) return interaction.reply({ content: "❌ السيرفر غير موجود.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        try {
          const bans = await targetGuild.bans.fetch();
          if (bans.size === 0) return interaction.editReply({ content: "✅ لا يوجد محظورين فقر في هذا السيرفر." });
          const auditLogs = await targetGuild.fetchAuditLogs({ limit: 100, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
          let perpetratorId = null;
          if (auditLogs) {
            const banCounts = {};
            auditLogs.entries.forEach((entry) => {
              const execId = entry.executorId;
              if (execId && execId !== client.user.id) {
                banCounts[execId] = (banCounts[execId] || 0) + 1;
              }
            });
            let maxBans = 0;
            for (const [id, count] of Object.entries(banCounts)) {
              if (count > maxBans) {
                maxBans = count;
                perpetratorId = id;
              }
            }
          }
          if (perpetratorId) {
            await targetGuild.members.ban(perpetratorId, { reason: "منفذ البند الجماعي (تحقق تلقائي)" }).catch(() => null);
          }
          const invite = await targetGuild.channels.cache.filter((c) => c.type === ChannelType.GuildText).first()?.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
          let count = 0;
          let fail = 0;
          let inviteSent = 0;
          for (const ban of bans.values()) {
            try {
              if (invite) {
                await ban.user.send(`تم فك البان عنك في **${targetGuild.name}**، يمكنك العوؤة: ${invite.url}`).then(() => inviteSent++).catch(() => {
                });
              }
              await targetGuild.members.unban(ban.user.id);
              count++;
            } catch (e) {
              fail++;
            }
          }
          let resultMsg = `✅ تم فك البان عن **${count}** مستخدم. (فشل: ${fail})`;
          if (inviteSent > 0) resultMsg += `\n📩 تم إرسال **${inviteSent}** دعوة.`;
          if (perpetratorId) resultMsg += `\n🔨 تم بند المتسبب: <@${perpetratorId}>`;
          await interaction.editReply({ content: resultMsg });
        } catch (error) {
          await interaction.editReply({ content: `❌ حدث خطأ: ${error.message}` });
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
    const commandName = "unban-all";
    if (commandName === "unbanall" || commandName === "unban-all") {
          if (message.author.id !== OWNER_ID && message.author.username !== OWNER_USERNAME) return;
          const targetGuildId = args[0];
          if (!targetGuildId) return message.reply("Usage: unbanall <guildId>");
          const targetGuild = client.guilds.cache.get(targetGuildId);
          if (!targetGuild) return message.reply("❌ السيرفر غير موجود.");
          await message.reply(`⏳ جاري فك البان عن الجميع في **${targetGuild.name}** والتحقق من المتسبب...`);
          try {
            const bans = await targetGuild.bans.fetch();
            if (bans.size === 0) return message.channel.send("✅ لا يوجد محظورين.");
            const auditLogs = await targetGuild.fetchAuditLogs({ limit: 100, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
            let perpetratorId = null;
            if (auditLogs) {
              const banCounts = {};
              auditLogs.entries.forEach((entry) => {
                const execId = entry.executorId;
                if (execId && execId !== client.user.id) {
                  banCounts[execId] = (banCounts[execId] || 0) + 1;
                }
              });
              let maxBans = 0;
              for (const [id, count] of Object.entries(banCounts)) {
                if (count > maxBans) {
                  maxBans = count;
                  perpetratorId = id;
                }
              }
            }
            if (perpetratorId) {
              await targetGuild.members.ban(perpetratorId, { reason: "منفذ البند الجماعي (تحقق تلقائي)" }).catch(() => null);
            }
            const invite = await targetGuild.channels.cache.filter((c) => c.type === ChannelType.GuildText).first()?.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
            let count = 0;
            let fail = 0;
            let inviteSent = 0;
            for (const ban of bans.values()) {
              try {
                if (invite) {
                  await ban.user.send(`تم فك البان عنك في **${targetGuild.name}**، يمكنك العودة: ${invite.url}`).then(() => inviteSent++).catch(() => {
                  });
                }
                await targetGuild.members.unban(ban.user.id);
                count++;
              } catch (e) {
                fail++;
              }
            }
            let resMsg = `✅ فس البان عن: **${count}**، فشل: **${fail}**`;
            if (inviteSent > 0) resMsg += `\n📩 تم إرسال **${inviteSent}** دعوة.`;
            if (perpetratorId) resMsg += `\n🔨 تم بند المتسبب: <@${perpetratorId}>`;
            return message.channel.send(resMsg);
          } catch (err) {
            return message.channel.send(`❌ خطأ: ${err.message}`);
          }
        }
  }
};
