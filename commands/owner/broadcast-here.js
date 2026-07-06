import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "broadcast-here",
  category: "owner",
  data: new SlashCommandBuilder().setName("broadcast-here").setDescription("إرسال رسالة برودكاست لجميع أعضاء السيرفر الحالي").addStringOption((opt) => opt.setName("message").setDescription("الرسالة المراد إرسالها").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "broadcast-here") {
        if (interaction.user.id !== OWNER_ID) {
          return interaction.reply({ content: "Owner only.", ephemeral: true });
        }
        const broadcastMessage = interaction.options.getString("message");
        const targetGuild = interaction.guild;
        if (!targetGuild) {
          return interaction.reply({ content: "❌ هذا الأمر يعمل فقط داخل السيرفرات.", ephemeral: true });
        }
        const targetBotMember = targetGuild.members.me;
        if (!targetBotMember?.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'Administrator' في هذا السيرفر.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply(`⏳ جاري بدء إرسال البرودكاست إلى أعضاء سيرفر **${targetGuild.name}**... (قد يستغرق الأمر وقتاً طويلاً لتجنب الحظر)`);
        try {
          console.log(`[BROADCAST-HERE] Starting broadcast for guild: ${targetGuild.name} (${targetGuild.id})`);
          let members;
          try {
            members = await targetGuild.members.fetch({ withPresences: false, time: 6e4 }).catch((err) => {
              console.warn(`[BROADCAST-HERE] Member fetch failed for ${targetGuild.name}: ${err.message}. Using cache.`);
              return targetGuild.members.cache;
            });
          } catch (err) {
            console.error(`[BROADCAST-HERE] Critical error during fetch for ${targetGuild.name}:`, err);
            members = targetGuild.members.cache;
          }
          if (!members || members.size === 0) {
            return interaction.followUp("❌ لم يتم العثور على أعضاء لإرسال الرسائل إليهم.");
          }
          let successCount = 0;
          let failCount = 0;
          for (const [id, member] of members) {
            if (member.user.bot) continue;
            try {
              await member.send(broadcastMessage);
              successCount++;
            } catch (err) {
              failCount++;
            }
            await new Promise((resolve) => setTimeout(resolve, 3e3));
          }
          await interaction.followUp(`✅ اكتمل البرودكاست!
- تم الإرسال لـ: **${successCount}**
- فشل الإرسال لـ: **${failCount}** (غالباً بسبب إغلاق الخاص)`);
        } catch (err) {
          console.error("Broadcast-here error:", err);
          await interaction.followUp("❌ حدث خطأ أثناء إرسال الرسائل.");
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
    const commandName = "broadcast-here";
    if (commandName === "broadcast-here") {
          if (message.author.id !== OWNER_ID) return;
          const content2 = args.join(" ");
          if (!content2) return message.reply("Usage: broadcast-here <message>");
          message.channel.send(`📢 **BROADCAST:** ${content2}`);
          return;
        }
  }
};
