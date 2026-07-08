import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from "discord.js";

const categoryMap = {
  admin: { name: "🛡️ الإدارة (Admin)", desc: "أوامر مخصصة لإدارة السيرفر، الإعدادات، والتحكم بالبث" },
  moderation: { name: "🔨 الإشراف (Moderation)", desc: "أوامر الطرد، الحظر، الكتم، التحذيرات، والتحكم بالقنوات" },
  economy: { name: "💰 الاقتصاد (Economy)", desc: "أوامر العملات، المكافآت، التحويلات المالية، والترتيب" },
  general: { name: "✨ العامة (General)", desc: "أوامر معلوماتية وتفاعلية لجميع الأعضاء" },
  games: { name: "🎮 الألعاب (Games)", desc: "ألعاب تفاعلية ومسلية للأعضاء" },
  owner: { name: "👑 المطور (Owner)", desc: "أوامر خاصة بمالك البوت فقط" },
  bloxfruits: { name: "🏴‍☠️ بلوكس فروت (Blox Fruits)", desc: "معلومات وأوامر متعلقة بلعبة Blox Fruits" }
};

export default {
  name: "help",
  aliases: ["مساعدة", "الاوامر", "أوامر", "اوامر"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("عرض قائمة الأوامر المتاحة أو تفاصيل أمر معين (View commands list)")
    .addStringOption((option) =>
      option.setName("command").setDescription("اسم الأمر لعرض تفاصيله (Optional command name)").setRequired(false)
    ),

  async executeInteraction(interaction, context) {
    const { client, PREFIX = "/", OWNER_ID } = context;
    const commandArg = interaction.options.getString("command")?.toLowerCase();

    // Get all unique commands
    const uniqueCommands = Array.from(client.commands.values()).reduce((acc, cmd) => {
      if (!acc.find(c => c.name === cmd.name)) {
        acc.push(cmd);
      }
      return acc;
    }, []);

    const isOwner = interaction.user.id === OWNER_ID;

    // 1. If a specific command was requested
    if (commandArg) {
      const command = client.commands.get(commandArg);
      if (!command) {
        return interaction.reply({ content: `❌ لم يتم العثور على أمر باسم: \`${commandArg}\``, ephemeral: true });
      }

      // Hide owner commands from non-owners
      if (command.category === "owner" && !isOwner) {
        return interaction.reply({ content: `❌ ليس لديك الصلاحية لعرض تفاصيل هذا الأمر.`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`📖 تفاصيل الأمر: ${command.name}`)
        .setDescription(command.data?.description || command.description || "لا يوجد وصف متوفر.")
        .addFields(
          { name: "🏷️ القسم (Category)", value: categoryMap[command.category]?.name || command.category, inline: true },
          { name: "🔗 الاختصارات (Aliases)", value: command.aliases && command.aliases.length > 0 ? command.aliases.map(a => `\`${a}\``).join(", ") : "لا يوجد", inline: true },
          { name: "⚙️ الاستخدام (Usage)", value: `\`${PREFIX}${command.name}\``, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Requiem Bot`, iconURL: client.user.displayAvatarURL() });

      return interaction.reply({ embeds: [embed] });
    }

    // 2. Main Help Menu
    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle("🥀 قائمة الأوامر والمساعدة | Command Help Menu")
      .setDescription(
        `أهلاً بك في نظام مساعدة **${client.user.username}**.\n` +
        `اختر قسم من القائمة المنسدلة بالأسفل لعرض أوامره، أو اكتب \`/help [اسم الأمر]\` للحصول على تفاصيل محددة.\n\n` +
        `**الأقسام المتاحة | Available Categories:**`
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    // List categories in embed
    Object.keys(categoryMap).forEach((catKey) => {
      if (catKey === "owner" && !isOwner) return;
      embed.addFields({
        name: categoryMap[catKey].name,
        value: categoryMap[catKey].desc,
        inline: false
      });
    });

    // Create dropdown select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category_select")
      .setPlaceholder("اختر قسماً لعرض أوامره... | Select a category");

    Object.keys(categoryMap).forEach((catKey) => {
      if (catKey === "owner" && !isOwner) return;
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(categoryMap[catKey].name)
          .setDescription(categoryMap[catKey].desc.substring(0, 100))
          .setValue(catKey)
      );
    });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({ embeds: [embed], components: [row] });

    // Interactive collector for the select menu
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ هذه القائمة ليست لك.", ephemeral: true });
      }

      const selectedCategory = i.values[0];
      const categoryCommands = uniqueCommands.filter(c => c.category === selectedCategory);

      const catInfo = categoryMap[selectedCategory] || { name: selectedCategory, desc: "" };

      const catEmbed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`${catInfo.name}`)
        .setDescription(`${catInfo.desc}\n\n**قائمة الأوامر الخاصة بهذا القسم:**`)
        .setTimestamp()
        .setFooter({ text: `عدد الأوامر: ${categoryCommands.length} | Requiem Bot`, iconURL: client.user.displayAvatarURL() });

      if (categoryCommands.length === 0) {
        catEmbed.addFields({ name: "تنبيه", value: "لا توجد أوامر مسجلة في هذا القسم حالياً.", inline: false });
      } else {
        categoryCommands.forEach(cmd => {
          const desc = cmd.data?.description || cmd.description || "بدون وصف";
          const aliasesText = cmd.aliases && cmd.aliases.length > 0 ? ` [${cmd.aliases.join(", ")}]` : "";
          catEmbed.addFields({
            name: `\`${PREFIX}${cmd.name}\`${aliasesText}`,
            value: desc,
            inline: true
          });
        });
      }

      await i.update({ embeds: [catEmbed] });
    });

    collector.on("end", async () => {
      // Disable select menu on timeout
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          selectMenu.setDisabled(true)
        );
        await interaction.editReply({ components: [disabledRow] }).catch(() => {});
      } catch (e) {}
    });
  },

  async executeMessage(message, args, context) {
    const { client, PREFIX = "/", OWNER_ID } = context;
    const commandArg = args[0]?.toLowerCase();

    // Get all unique commands
    const uniqueCommands = Array.from(client.commands.values()).reduce((acc, cmd) => {
      if (!acc.find(c => c.name === cmd.name)) {
        acc.push(cmd);
      }
      return acc;
    }, []);

    const isOwner = message.author.id === OWNER_ID;

    // 1. Specific command details or category direct command list
    if (commandArg) {
      // Check if it's a category name in our map
      if (categoryMap[commandArg] || (commandArg === "owner" && isOwner)) {
        const selectedCategory = commandArg;
        const categoryCommands = uniqueCommands.filter(c => c.category === selectedCategory);
        const catInfo = categoryMap[selectedCategory];

        const catEmbed = new EmbedBuilder()
          .setColor("#8B0000")
          .setTitle(`${catInfo.name}`)
          .setDescription(`${catInfo.desc}\n\n**قائمة الأوامر الخاصة بهذا القسم:**`)
          .setTimestamp()
          .setFooter({ text: `عدد الأوامر: ${categoryCommands.length} | Requiem Bot`, iconURL: client.user.displayAvatarURL() });

        categoryCommands.forEach(cmd => {
          const desc = cmd.data?.description || cmd.description || "بدون وصف";
          const aliasesText = cmd.aliases && cmd.aliases.length > 0 ? ` [${cmd.aliases.join(", ")}]` : "";
          catEmbed.addFields({
            name: `\`${PREFIX}${cmd.name}\`${aliasesText}`,
            value: desc,
            inline: true
          });
        });

        return message.reply({ embeds: [catEmbed] });
      }

      // Otherwise, assume it's a command name
      const command = client.commands.get(commandArg);
      if (!command) {
        return message.reply(`❌ لم يتم العثور على أمر أو قسم باسم: \`${commandArg}\``);
      }

      // Hide owner commands from non-owners
      if (command.category === "owner" && !isOwner) {
        return message.reply(`❌ ليس لديك الصلاحية لعرض تفاصيل هذا الأمر.`);
      }

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`📖 تفاصيل الأمر: ${command.name}`)
        .setDescription(command.data?.description || command.description || "لا يوجد وصف متوفر.")
        .addFields(
          { name: "🏷️ القسم (Category)", value: categoryMap[command.category]?.name || command.category, inline: true },
          { name: "🔗 الاختصارات (Aliases)", value: command.aliases && command.aliases.length > 0 ? command.aliases.map(a => `\`${a}\``).join(", ") : "لا يوجد", inline: true },
          { name: "⚙️ الاستخدام (Usage)", value: `\`${PREFIX}${command.name}\``, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Requiem Bot`, iconURL: client.user.displayAvatarURL() });

      return message.reply({ embeds: [embed] });
    }

    // 2. Main list of all commands for messages (No dropdown because it requires collectors which can be fragile, instead display categorized commands clearly)
    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle("🥀 قائمة الأوامر والمساعدة | Command Help Menu")
      .setDescription(
        `أهلاً بك في نظام مساعدة **${client.user.username}**.\n` +
        `اكتب \`${PREFIX}help [اسم القسم أو اسم الأمر]\` لعرض تفاصيل أكثر.\n\n` +
        `**الأقسام المتاحة والأوامر المندرجة تحتها:**`
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

    Object.keys(categoryMap).forEach((catKey) => {
      if (catKey === "owner" && !isOwner) return;
      const categoryCommands = uniqueCommands.filter(c => c.category === catKey);
      const cmdsList = categoryCommands.length > 0 ? categoryCommands.map(c => `\`${c.name}\``).join(", ") : "لا يوجد";
      embed.addFields({
        name: `${categoryMap[catKey].name}`,
        value: `${categoryMap[catKey].desc}\n📥 **الأوامر:** ${cmdsList}`,
        inline: false
      });
    });

    await message.reply({ embeds: [embed] });
  }
};
