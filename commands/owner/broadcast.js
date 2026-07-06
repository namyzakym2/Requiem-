import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "broadcast",
  category: "owner",
  data: new SlashCommandBuilder().setName("broadcast").setDescription("إرسال رسالة برودكاست لجميع أعضاء سيرفر معين").addStringOption((opt) => opt.setName("server_id").setDescription("ID السيرفر").setRequired(true)).addStringOption((opt) => opt.setName("message").setDescription("الرسالة المراد إرسالها").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "broadcast") {
        if (interaction.user.id !== OWNER_ID) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        const targetGuildId = interaction.options.getString("server_id");
        const broadcastMessage = interaction.options.getString("message");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) {
          return interaction.reply({ content: `❌ البوت ليس عضواً في هذا السيرفر (${targetGuildId}).`, ephemeral: true });
        }
        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: `❌ البوت يفتقر إلى صلاحية 'Administrator' في السيرفر المستهدف: **${targetGuild.name}**.`, ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`⏳ جاري بدء إرسال البرودكاست إلى أعضاء سيرفر **${targetGuild.name}**... (قد يستغرق الأمر وقتاً طويلاً لتجنب الحظر)`);
        try {
          console.log(`[BROADCAST] Starting broadcast for guild: ${targetGuild.name} (${targetGuild.id})`);
          let members;
          try {
            console.log(`[BROADCAST] Attempting to fetch members for ${targetGuild.name}...`);
            members = await targetGuild.members.fetch({ withPresences: false, time: 6e4 }).catch((err) => {
              if (err.code === 50013) {
                console.warn(`[BROADCAST] Missing Permissions to fetch members for ${targetGuild.name}`);
              } else {
                console.warn(`[BROADCAST] Member fetch failed for ${targetGuild.name}: ${err.message}. Using cache.`);
              }
              return targetGuild.members.cache;
            });
          } catch (err) {
            console.error(`[BROADCAST] Critical error during fetch for ${targetGuild.name}:`, err);
            members = targetGuild.members.cache;
          }
          if (!members || members.size === 0) {
            console.warn(`[BROADCAST] No members found for ${targetGuild.name} (Cache size: ${targetGuild.members.cache.size})`);
            return interaction.followUp("❌ لم يتم العثور على أعضاء لإرسال الرسائل إليهم. تأكد من تفعيل 'Server Members Intent' في Discord Developer Portal.");
          }
          console.log(`[BROADCAST] Found ${members.size} members. Starting DM loop...`);
          let successCount = 0;
          let failCount = 0;
          for (const [id, member] of members) {
            if (member.user.bot) continue;
            try {
              await member.send(broadcastMessage);
              successCount++;
              if (successCount % 5 === 0) console.log(`[BROADCAST] Successfully sent ${successCount} messages...`);
            } catch (err) {
              failCount++;
              if (err instanceof Error && !err.message.includes("Cannot send messages to this user")) {
                console.error(`[BROADCAST] Failed to send DM to ${member.user.tag}:`, err.message);
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 3e3));
          }
          console.log(`[BROADCAST] Completed. Success: ${successCount}, Failed: ${failCount}`);
          await interaction.followUp(`✅ اكتمل البرودكاست!
- تم الإرسال لـ: **${successCount}**
- فشل الإرسال لـ: **${failCount}** (غالباً بسبب إغلاق الخاص)`);
        } catch (err) {
          console.error("Broadcast error:", err);
          await interaction.followUp("❌ حدث خطأ أثناء جلب الأعضاء أو إرسال الرسائل.");
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
    const commandName = "broadcast";
    if (commandName === "broadcast") {
          if (message.author.id !== OWNER_ID) return;
          const content2 = args.join(" ");
          if (!content2) return message.reply("Usage: broadcast <message>");
          client.guilds.cache.forEach(async (guild) => {
            const channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages));
            if (channel) channel.send(content2).catch(() => {
            });
          });
          return message.reply("✅ Broadcast sent to all servers.");
        }
  }
};
