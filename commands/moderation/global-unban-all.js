import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "global-unban-all",
  category: "moderation",
  data: new SlashCommandBuilder().setName("global-unban-all").setDescription("Unban ALL users from ALL servers the bot is in (Authorized Only)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "global-unban-all") {
        if (user.id !== OWNER_ID && user.username !== OWNER_USERNAME) return interaction.reply({ content: "❌ هذا الأمر خاص بالمطور فقط.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        let totalUnbanned = 0;
        let totalInvites = 0;
        let guildsCount = 0;
        for (const guild of client.guilds.cache.values()) {
          guildsCount++;
          try {
            const bans = await guild.bans.fetch().catch(() => null);
            if (!bans || bans.size === 0) continue;
            const auditLogs = await guild.fetchAuditLogs({ limit: 100, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
            let perpetratorId = null;
            if (auditLogs) {
              const banCounts = {};
              auditLogs.entries.forEach((entry) => {
                const execId = entry.executorId;
                if (execId && execId !== client.user.id) {
                  banCounts[execId] = (banCounts[execId] || 0) + 1;
                }
              });
              let max = 0;
              for (const [id, count] of Object.entries(banCounts)) {
                if (count > max) {
                  max = count;
                  perpetratorId = id;
                }
              }
            }
            if (perpetratorId) {
              await guild.members.ban(perpetratorId, { reason: "Mass ban perpetrator (Global Cleanup)" }).catch(() => null);
            }
            const invite = await guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).first()?.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
            for (const ban of bans.values()) {
              try {
                if (invite) {
                  await ban.user.send(`تم فك البان عنك في **${guild.name}**، تفضل بالدخول: ${invite.url}`).then(() => totalInvites++).catch(() => {
                  });
                }
                await guild.members.unban(ban.user.id);
                totalUnbanned++;
              } catch (e) {
              }
            }
          } catch (err) {
          }
        }
        await interaction.editReply({ content: `✅ نظام التنظيف الشامل انتهى:\n- تم فك البان عن: **${totalUnbanned}**\n- تم إرسال: **${totalInvites}** دعوة\n- عدد السيرفرات: **${guildsCount}**` });
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
    const commandName = "global-unban-all";
    if (commandName === "globalunbanall" || commandName === "global-unban-all") {
          if (message.author.id !== OWNER_ID && message.author.username !== OWNER_USERNAME) return;
          await message.reply("⏳ جاري تنفيؠ عملية التنظيف العالمية...");
          let totalUnbanned = 0;
          let totalInvites = 0;
          for (const guild of client.guilds.cache.values()) {
            try {
              const bans = await guild.bans.fetch().catch(() => null);
              if (!bans || bans.size === 0) continue;
              const invite = await guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).first()?.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
              for (const ban of bans.values()) {
                try {
                  if (invite) {
                    await ban.user.send(`تم فك البان عنك في **${guild.name}**، تفضل بالدخول: ${invite.url}`).then(() => totalInvites++).catch(() => {
                    });
                  }
                  await guild.members.unban(ban.user.id);
                  totalUnbanned++;
                } catch (e) {
                }
              }
            } catch (e) {
            }
          }
          return message.channel.send(`✅ انتهى التنظيف العالمي:\n- فك البان عن: **${totalUnbanned}**\n- إرسال: **${totalInvites}** دعوة`);
        }
  }
};
