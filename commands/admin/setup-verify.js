import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "setup-verify",
  category: "admin",
  data: new SlashCommandBuilder().setName("setup-verify").setDescription("إعداد زر التحقق لجمع التوكنات").addRoleOption((option) => option.setName("role").setDescription("الرتبة التي سيحصل عليها العضو بعد التحقق").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "setup-verify") {
        if (guild.id === "1254568460764053566") {
          return interaction.reply({ content: "❌ ميزة التحقق معطلة في هذا السيرفر بناءً على طلب المالك.", ephemeral: true });
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const role = interaction.options.getRole("role");
        if (!guild.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى صلاحية 'إدارة القنوات' أو 'إدارة الرتب' لتنفيذ هذا الإجراء.", ephemeral: true });
        }
        db.prepare("INSERT INTO protection_settings (guildId, verifiedRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET verifiedRoleId = excluded.verifiedRoleId").run(guild.id, role.id);
        await interaction.reply({ content: "⏳ جاري ضبط صلاحيات القنوات تلقائياً... يرجى الانتظار.", ephemeral: true });
        const channels = await guild.channels.fetch();
        let successCount = 0;
        let failCount = 0;
        const protection = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(guild.id);
        const logChannelId = protection?.logChannel;
        for (const [id, channel2] of channels) {
          if (!channel2) continue;
          try {
            const channelName = channel2.name.toLowerCase();
            const isPrivate = channelName.includes("log") || channelName.includes("admin") || channelName.includes("staff") || channelName.includes("mod") || channelName.includes("private") || id === logChannelId;
            if (id === interaction.channelId) {
              await channel2.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
              await channel2.permissionOverwrites.edit(role.id, { ViewChannel: true });
            } else if (isPrivate) {
              await channel2.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
              await channel2.permissionOverwrites.edit(role.id, { ViewChannel: false });
            } else {
              await channel2.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
              await channel2.permissionOverwrites.edit(role.id, { ViewChannel: true });
            }
            successCount++;
          } catch (err) {
            failCount++;
          }
        }
        const embed = new EmbedBuilder().setTitle("التحقق من العضوية").setDescription("اضغط على الزر أدناه للتحقق من حسابك والحصول على الرتب.").setColor(5793266);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("verify_member").setLabel("تحقق الآن").setStyle(ButtonStyle.Primary).setEmoji("✅")
        );
        const botMember = guild.members.me;
        if (!botMember?.permissionsIn(interaction.channelId).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          return interaction.followUp({ content: "❌ البوت يفتقر إلى صلاحية إرسال الرسائل أو الروابط في هذا الروم.", ephemeral: true });
        }
        await interaction.channel?.send({ embeds: [embed], components: [row] });
        return interaction.followUp({ content: `✅ تم إعداد نظام التحقق بنجاح!
- الرتبة: **${role.name}**
- القنوات التي تم تعديلها: **${successCount}**
- القنوات التي فشل تعديلها: **${failCount}**`, ephemeral: true });
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
    const commandName = "setup-verify";
    if (commandName === "setup-verify") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const role = message.mentions.roles.first();
          if (!role) return message.reply("Usage: setup-verify <@role>");
          if (!message.guild?.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
            return message.reply("❌ البوت يفتقر إلى صلاحية 'إدارة القنوات' أو 'إدارة الرتب' لتنفيذ هذا الإجراء.");
          }
          db.prepare("INSERT INTO protection_settings (guildId, verifiedRoleId) VALUES (?, ?) ON CONFLICT(guildId) DO UPDATE SET verifiedRoleId = excluded.verifiedRoleId").run(message.guildId, role.id);
          await message.reply("⏳ جاري ضبط صلاحيات القنوات تلقائياً... يرجى الانتظار.");
          const channels = await message.guild.channels.fetch();
          let successCount = 0;
          let failCount = 0;
          const protection2 = db.prepare("SELECT logChannel FROM protection_settings WHERE guildId = ?").get(message.guildId);
          const logChannelId = protection2?.logChannel;
          for (const [id, channel] of channels) {
            if (!channel) continue;
            try {
              const channelName = channel.name.toLowerCase();
              const isPrivate = channelName.includes("log") || channelName.includes("admin") || channelName.includes("staff") || channelName.includes("mod") || channelName.includes("private") || id === logChannelId;
              if (id === message.channelId) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true });
                await channel.permissionOverwrites.edit(role.id, { ViewChannel: true });
              } else if (isPrivate) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                await channel.permissionOverwrites.edit(role.id, { ViewChannel: false });
              } else {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                await channel.permissionOverwrites.edit(role.id, { ViewChannel: true });
              }
              successCount++;
            } catch (err) {
              failCount++;
            }
          }
          const embed = new EmbedBuilder().setTitle("Verification").setDescription("Click the button below to verify and get access to the server.").setColor(65280);
          const button = new ButtonBuilder().setCustomId(`verify_member`).setLabel("Verify").setStyle(ButtonStyle.Success);
          const row = new ActionRowBuilder().addComponents(button);
          await message.channel.send({ embeds: [embed], components: [row] });
          return message.channel.send(`✅ تم إعداد نظام التحقق بنجاح!
- الرتبة: **${role.name}**
- القنوات التي تم تعديلها: **${successCount}**
- القنوات التي فشل تعديلها: **${failCount}** (غالباً بسبب صلاحيات البوت)`);
        }
  }
};
