import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "broadcast",
  category: "owner",
  data: new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("إرسال رسالة برودكاست")
    .addSubcommand(sub => 
      sub.setName("server")
         .setDescription("إرسال رسالة برودكاست لجميع أعضاء سيرفر معين")
         .addStringOption((opt) => opt.setName("server_id").setDescription("ID السيرفر").setRequired(true))
         .addStringOption((opt) => opt.setName("message").setDescription("الرسالة المراد إرسالها (استخدم {user} للمنشة)").setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("all")
         .setDescription("إرسال رسالة لجميع الأعضاء في كل السيرفرات")
         .addStringOption((opt) => opt.setName("message").setDescription("الرسالة المراد إرسالها (استخدم {user} للمنشة)").setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("online")
         .setDescription("إرسال رسالة للأعضاء المتصلين في كل السيرفرات")
         .addStringOption((opt) => opt.setName("message").setDescription("الرسالة المراد إرسالها (استخدم {user} للمنشة)").setRequired(true))
    ),
  async executeInteraction(interaction, context) {
    const {
      client, OWNER_ID
    } = context;

    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "Owner only.", ephemeral: true });
    }

    const subCommand = interaction.options.getSubcommand();
    const broadcastMessage = interaction.options.getString("message");
    
    await interaction.deferReply({ ephemeral: true });

    let targets = [];

    if (subCommand === 'server') {
        const targetGuildId = interaction.options.getString("server_id");
        const targetGuild = client.guilds.cache.get(targetGuildId);
        if (!targetGuild) return interaction.editReply(`❌ البوت ليس عضواً في هذا السيرفر.`);
        targets = Array.from((await targetGuild.members.fetch()).values());
    } else {
        // all or online
        for (const [_, guild] of client.guilds.cache) {
            const members = await guild.members.fetch({ withPresences: subCommand === 'online' });
            for (const [_, member] of members) {
                if (member.user.bot) continue;
                if (subCommand === 'online' && member.presence?.status !== 'online') continue;
                targets.push(member);
            }
        }
    }

    let successCount = 0;
    let failCount = 0;

    for (const member of targets) {
        try {
            const message = broadcastMessage.replace(/{user}/g, `<@${member.id}>`);
            await member.send(message);
            successCount++;
        } catch (err) {
            failCount++;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    await interaction.editReply(`✅ اكتمل البرودكاست!
- تم الإرسال لـ: **${successCount}**
- فشل الإرسال لـ: **${failCount}**`);
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
