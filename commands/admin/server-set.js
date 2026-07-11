import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from "discord.js";

export default {
  name: "server-set",
  aliases: ["serverset", "setup", "ضبط", "server_set"],
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("server-set")
    .setDescription("⚙️ إعدادات السيرفر والرتب والقنوات (Server configuration & roles)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
      sub.setName("add-role")
        .setDescription("➕ إضافة رتبة لعضو معين")
        .addUserOption(o => o.setName("user").setDescription("العضو المراد إضافة الرتبة له").setRequired(true))
        .addRoleOption(o => o.setName("role").setDescription("الرتبة المراد إضافتها").setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("remove-role")
        .setDescription("➖ إزالة رتبة من عضو معين")
        .addUserOption(o => o.setName("user").setDescription("العضو المراد إزالة الرتبة منه").setRequired(true))
        .addRoleOption(o => o.setName("role").setDescription("الرتبة المراد إزالتها").setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("set-welcome")
        .setDescription("👋 ضبط قناة الترحيب بالأعضاء الجدد")
        .addChannelOption(o => o.setName("channel").setDescription("قناة الترحيب").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("set-leave")
        .setDescription("🚪 ضبط قناة المغادرة (الوداع)")
        .addChannelOption(o => o.setName("channel").setDescription("قناة المغادرة").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("set-modlog")
        .setDescription("🛡️ ضبط قناة السجلات الإدارية")
        .addChannelOption(o => o.setName("channel").setDescription("قناة السجلات الإدارية").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("set-prefix")
        .setDescription("🔧 تغيير البريفكس (البادئة) الخاص بالبوت")
        .addStringOption(o => o.setName("prefix").setDescription("البريفكس الجديد").setRequired(true))
    ),

  async executeInteraction(interaction, context) {
    const { db, client } = context;
    const { guild, member, options } = interaction;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ هذا الأمر مخصص لمدراء السيرفر فقط (Administrator).", ephemeral: true });
    }

    const subcommand = options.getSubcommand();
    const botMember = guild.members.me;

    try {
      if (subcommand === "add-role") {
        const targetUser = options.getUser("user", true);
        const targetRole = options.getRole("role", true);
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
          return interaction.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر.", ephemeral: true });
        }

        if (botMember && targetRole.position >= botMember.roles.highest.position) {
          return interaction.reply({ content: "❌ لا يمكنني إعطاء هذه الرتبة لأنها مساوية لرتبي أو أعلى منها في الترتيب.", ephemeral: true });
        }

        await targetMember.roles.add(targetRole.id);
        const embed = new EmbedBuilder()
          .setColor("#10b981")
          .setDescription(`✅ تم بنجاح إضافة رتبة **${targetRole.name}** للعضو ${targetUser}.`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === "remove-role") {
        const targetUser = options.getUser("user", true);
        const targetRole = options.getRole("role", true);
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
          return interaction.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر.", ephemeral: true });
        }

        if (botMember && targetRole.position >= botMember.roles.highest.position) {
          return interaction.reply({ content: "❌ لا يمكنني إزالة هذه الرتبة لأنها مساوية لرتبي أو أعلى منها في الترتيب.", ephemeral: true });
        }

        await targetMember.roles.remove(targetRole.id);
        const embed = new EmbedBuilder()
          .setColor("#ef4444")
          .setDescription(`✅ تم بنجاح إزالة رتبة **${targetRole.name}** من العضو ${targetUser}.`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === "set-welcome") {
        const channel = options.getChannel("channel", true);

        // Update database welcome settings
        db.prepare(`
          INSERT INTO welcome_settings (guildId, channelId, message, imageEnabled, dmEnabled, dmMessage, status, title, description, embedColor, imageUrl, enabled)
          VALUES (?, ?, ?, 1, 0, ?, 'on', ?, ?, ?, ?, 1)
          ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, status = 'on', enabled = 1
        `).run(
          guild.id,
          channel.id,
          "👋 أهلاً بك يا {user} في السيرفر! 🎉",
          "Welcome to {server}!",
          "أهلاً بك في السيرفر! 🎉",
          "مرحباً بك {user} في {guild}! أنت العضو رقم #{memberCount}. نتمنى لك وقتاً ممتعاً!",
          "#8b5cf6",
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"
        );

        // Also update welcome_configs
        db.prepare("INSERT OR REPLACE INTO welcome_configs (guildId, channelId, message) VALUES (?, ?, ?)")
          .run(guild.id, channel.id, "👋 أهلاً بك يا {user} في السيرفر! 🎉");

        const embed = new EmbedBuilder()
          .setColor("#8b5cf6")
          .setDescription(`✅ تم تحديد قناة الترحيب لتكون: ${channel}`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === "set-leave") {
        const channel = options.getChannel("channel", true);

        db.prepare(`
          INSERT INTO leave_settings (guildId, channelId, message, enabled)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, enabled = 1
        `).run(guild.id, channel.id, "👋 وداعاً {user}، نتمنى لك التوفيق! 💔");

        const embed = new EmbedBuilder()
          .setColor("#f59e0b")
          .setDescription(`✅ تم تحديد قناة المغادرة والوداع لتكون: ${channel}`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === "set-modlog") {
        const channel = options.getChannel("channel", true);

        db.prepare(`
          INSERT INTO logging_settings (
            guildId, channelId, logMessageDelete, logMessageEdit, logMemberJoin, 
            logMemberLeave, logRoleUpdate, logChannelUpdate, logVoiceState, 
            logCommandUsage, logLevelUp, logTicketEvents, logProtectionEvents, logBotAdd,
            logRoleCreate, logRoleDelete, logChannelCreate, logChannelDelete, logMemberBan,
            logMemberUnban, logNicknameChange
          ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
          ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId
        `).run(guild.id, channel.id);

        const embed = new EmbedBuilder()
          .setColor("#3b82f6")
          .setDescription(`✅ تم تحديد قناة السجلات واللوقات لتكون: ${channel}`)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === "set-prefix") {
        const newPrefix = options.getString("prefix", true);

        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guild.id}`, newPrefix);

        const embed = new EmbedBuilder()
          .setColor("#6b7280")
          .setDescription(`✅ تم تغيير بريفكس البوت في السيرفر إلى: \`${newPrefix}\``)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

    } catch (err) {
      console.error("Error in server-set command:", err);
      return interaction.reply({ content: "❌ حدث خطأ داخلي أثناء معالجة الأمر.", ephemeral: true });
    }
  },

  async executeMessage(message, args, context) {
    const { db, client } = context;
    const { guild, member } = message;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ هذا الأمر مخصص لمدراء السيرفر فقط (Administrator).");
    }

    const subcommand = args[0]?.toLowerCase();
    const botMember = guild.members.me;

    const printHelp = () => {
      const embed = new EmbedBuilder()
        .setColor("#3b82f6")
        .setTitle("⚙️ أوامر ضبط السيرفر (Server Settings Command Guide)")
        .setDescription("الرجاء استخدام الأمر بالشكل الصحيح:")
        .addFields(
          { name: "➕ إضافة رتبة لعضو", value: `\`server-set add-role @user @role\``, inline: false },
          { name: "➖ إزالة رتبة من عضو", value: `\`server-set remove-role @user @role\``, inline: false },
          { name: "👋 ضبط قناة الترحيب", value: `\`server-set set-welcome #channel\``, inline: false },
          { name: "🚪 ضبط قناة المغادرة", value: `\`server-set set-leave #channel\``, inline: false },
          { name: "🛡️ ضبط قناة السجلات واللوقات", value: `\`server-set set-modlog #channel\``, inline: false },
          { name: "🔧 تغيير البريفكس البوت", value: `\`server-set set-prefix <prefix>\``, inline: false }
        )
        .setFooter({ text: `البريفكس الحالي: ${context.PREFIX || "!"}` })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    };

    if (!subcommand) {
      return printHelp();
    }

    try {
      if (subcommand === "add-role") {
        const targetMember = message.mentions.members.first();
        const targetRole = message.mentions.roles.first();

        if (!targetMember || !targetRole) {
          return message.reply("❌ الاستخدام الخاطئ! يرجى كتابة: `server-set add-role @user @role`.");
        }

        if (botMember && targetRole.position >= botMember.roles.highest.position) {
          return message.reply("❌ لا يمكنني إعطاء هذه الرتبة لأنها مساوية لرتبي أو أعلى منها في الترتيب.");
        }

        await targetMember.roles.add(targetRole.id);
        return message.reply(`✅ تم بنجاح إضافة رتبة **${targetRole.name}** للعضو ${targetMember}.`);
      }

      if (subcommand === "remove-role") {
        const targetMember = message.mentions.members.first();
        const targetRole = message.mentions.roles.first();

        if (!targetMember || !targetRole) {
          return message.reply("❌ الاستخدام الخاطئ! يرجى كتابة: `server-set remove-role @user @role`.");
        }

        if (botMember && targetRole.position >= botMember.roles.highest.position) {
          return message.reply("❌ لا يمكنني إزالة هذه الرتبة لأنها مساوية لرتبي أو أعلى منها في الترتيب.");
        }

        await targetMember.roles.remove(targetRole.id);
        return message.reply(`✅ تم بنجاح إزالة رتبة **${targetRole.name}** من العضو ${targetMember}.`);
      }

      if (subcommand === "set-welcome" || subcommand === "welcome") {
        const channel = message.mentions.channels.first();

        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply("❌ يرجى منشن قناة كتابية صالحة! مثال: `server-set set-welcome #welcome`.");
        }

        db.prepare(`
          INSERT INTO welcome_settings (guildId, channelId, message, imageEnabled, dmEnabled, dmMessage, status, title, description, embedColor, imageUrl, enabled)
          VALUES (?, ?, ?, 1, 0, ?, 'on', ?, ?, ?, ?, 1)
          ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, status = 'on', enabled = 1
        `).run(
          guild.id,
          channel.id,
          "👋 أهلاً بك يا {user} في السيرفر! 🎉",
          "Welcome to {server}!",
          "أهلاً بك في السيرفر! 🎉",
          "مرحباً بك {user} في {guild}! أنت العضو رقم #{memberCount}. نتمنى لك وقتاً ممتعاً!",
          "#8b5cf6",
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"
        );

        db.prepare("INSERT OR REPLACE INTO welcome_configs (guildId, channelId, message) VALUES (?, ?, ?)")
          .run(guild.id, channel.id, "👋 أهلاً بك يا {user} في السيرفر! 🎉");

        return message.reply(`✅ تم تحديد قناة الترحيب لتكون: ${channel}`);
      }

      if (subcommand === "set-leave" || subcommand === "leave") {
        const channel = message.mentions.channels.first();

        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply("❌ يرجى منشن قناة كتابية صالحة! مثال: `server-set set-leave #goodbye`.");
        }

        db.prepare(`
          INSERT INTO leave_settings (guildId, channelId, message, enabled)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, enabled = 1
        `).run(guild.id, channel.id, "👋 وداعاً {user}، نتمنى لك التوفيق! 💔");

        return message.reply(`✅ تم تحديد قناة المغادرة والوداع لتكون: ${channel}`);
      }

      if (subcommand === "set-modlog" || subcommand === "modlog") {
        const channel = message.mentions.channels.first();

        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply("❌ يرجى منشن قناة كتابية صالحة! مثال: `server-set set-modlog #logs`.");
        }

        db.prepare(`
          INSERT INTO logging_settings (
            guildId, channelId, logMessageDelete, logMessageEdit, logMemberJoin, 
            logMemberLeave, logRoleUpdate, logChannelUpdate, logVoiceState, 
            logCommandUsage, logLevelUp, logTicketEvents, logProtectionEvents, logBotAdd,
            logRoleCreate, logRoleDelete, logChannelCreate, logChannelDelete, logMemberBan,
            logMemberUnban, logNicknameChange
          ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
          ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId
        `).run(guild.id, channel.id);

        return message.reply(`✅ تم تحديد قناة السجلات واللوقات لتكون: ${channel}`);
      }

      if (subcommand === "set-prefix" || subcommand === "prefix") {
        const newPrefix = args[1];

        if (!newPrefix) {
          return message.reply("❌ يرجى تحديد البريفكس الجديد! مثال: `server-set set-prefix !`.");
        }

        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`prefix_${guild.id}`, newPrefix);

        return message.reply(`✅ تم تغيير بريفكس البوت في السيرفر إلى: \`${newPrefix}\``);
      }

      return printHelp();

    } catch (err) {
      console.error("Error in server-set text command:", err);
      return message.reply("❌ حدث خطأ داخلي أثناء معالجة الأمر.");
    }
  }
};
