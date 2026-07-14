import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";

const categoryMap = {
  admin: { name: "🛡️ الإدارة", label: "الإدارة (Admin)", desc: "أوامر مخصصة لإدارة السيرفر، الإعدادات، والتحكم بالبث" },
  moderation: { name: "🔨 الإشراف", label: "الإشراف (Mod)", desc: "أوامر الطرد، الحظر، الكتم، التحذيرات، والتحكم بالقنوات" },
  economy: { name: "💰 الاقتصاد", label: "الاقتصاد (Eco)", desc: "أوامر العملات، المكافآت، التحويلات المالية، والترتيب" },
  general: { name: "✨ العامة", label: "العامة (General)", desc: "أوامر معلوماتية وتفاعلية لجميع الأعضاء" },
  games: { name: "🎮 الألعاب", label: "الألعاب (Games)", desc: "ألعاب تفاعلية ومسلية للأعضاء" },
  bloxfruits: { name: "🏴‍☠️ بلوكس فروت", label: "بلوكس فروت", desc: "معلومات وأوامر متعلقة بلعبة Blox Fruits" },
  owner: { name: "👑 المطور", label: "المطور (Owner)", desc: "أوامر خاصة بمالك البوت فقط" }
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

    // 2. Main Help Menu Embed Builder
    const getMainEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("🥀 قائمة الأوامر والمساعدة | Command Help Menu")
        .setDescription(
          `أهلاً بك في نظام مساعدة **${client.user.username}**.\n` +
          `اضغط على الأزرار أدناه للتنقل المباشر والسلس بين أقسام الأوامر المختلفة، أو اكتب \`/help [اسم الأمر]\` للحصول على تفاصيل دقيقة.\n\n` +
          `**📂 الأقسام المتاحة والوصف:**`
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      Object.keys(categoryMap).forEach((catKey) => {
        if (catKey === "owner" && !isOwner) return;
        embed.addFields({
          name: categoryMap[catKey].name,
          value: categoryMap[catKey].desc,
          inline: true
        });
      });

      return embed;
    };

    // Create buttons for categories
    const getActionRows = (activeCategory = null) => {
      const buttons = [];
      
      // Add Main Menu Button if in a subcategory
      buttons.push(
        new ButtonBuilder()
          .setCustomId("help_main")
          .setLabel("🏠 الرئيسية")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(activeCategory === null)
      );

      Object.keys(categoryMap).forEach((catKey) => {
        if (catKey === "owner" && !isOwner) return;
        const info = categoryMap[catKey];
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`help_${catKey}`)
            .setLabel(info.label)
            .setStyle(activeCategory === catKey ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }
      return rows;
    };

    const mainEmbed = getMainEmbed();
    const mainRows = getActionRows();

    const response = await interaction.reply({ embeds: [mainEmbed], components: mainRows });

    // Interactive collector for the buttons
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ هذه القائمة ليست لك.", ephemeral: true });
      }

      const customId = i.customId;

      if (customId === "help_main") {
        await i.update({ embeds: [getMainEmbed()], components: getActionRows(null) });
      } else {
        const selectedCategory = customId.replace("help_", "");
        const categoryCommands = uniqueCommands.filter(c => c.category === selectedCategory);
        const catInfo = categoryMap[selectedCategory] || { name: selectedCategory, desc: "" };

        const catEmbed = new EmbedBuilder()
          .setColor("#8B0000")
          .setTitle(`${catInfo.name}`)
          .setDescription(`${catInfo.desc}\n\n**قائمة الأوامر المسجلة في هذا القسم:**`)
          .setTimestamp()
          .setThumbnail(client.user.displayAvatarURL())
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

        await i.update({ embeds: [catEmbed], components: getActionRows(selectedCategory) });
      }
    });

    collector.on("end", async () => {
      try {
        const disabledRows = getActionRows().map(row => 
          new ActionRowBuilder().addComponents(
            row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
          )
        );
        await interaction.editReply({ components: disabledRows }).catch(() => {});
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

    // 2. Interactive Prefix command helper
    const getMainEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("🥀 قائمة الأوامر والمساعدة | Command Help Menu")
        .setDescription(
          `أهلاً بك في نظام مساعدة **${client.user.username}**.\n` +
          `اضغط على الأزرار أدناه للتنقل المباشر والسلس بين أقسام الأوامر المختلفة، أو اكتب \`${PREFIX}help [الأمر]\` للحصول على تفاصيل دقيقة.\n\n` +
          `**📂 الأقسام المتاحة والوصف:**`
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

      Object.keys(categoryMap).forEach((catKey) => {
        if (catKey === "owner" && !isOwner) return;
        embed.addFields({
          name: categoryMap[catKey].name,
          value: categoryMap[catKey].desc,
          inline: true
        });
      });

      return embed;
    };

    const getActionRows = (activeCategory = null) => {
      const buttons = [];
      
      // Add Main Menu Button
      buttons.push(
        new ButtonBuilder()
          .setCustomId("help_main")
          .setLabel("🏠 الرئيسية")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(activeCategory === null)
      );

      Object.keys(categoryMap).forEach((catKey) => {
        if (catKey === "owner" && !isOwner) return;
        const info = categoryMap[catKey];
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`help_${catKey}`)
            .setLabel(info.label)
            .setStyle(activeCategory === catKey ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }
      return rows;
    };

    const mainEmbed = getMainEmbed();
    const mainRows = getActionRows();

    const response = await message.reply({ embeds: [mainEmbed], components: mainRows });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "❌ هذه القائمة ليست لك.", ephemeral: true });
      }

      const customId = i.customId;

      if (customId === "help_main") {
        await i.update({ embeds: [getMainEmbed()], components: getActionRows(null) });
      } else {
        const selectedCategory = customId.replace("help_", "");
        const categoryCommands = uniqueCommands.filter(c => c.category === selectedCategory);
        const catInfo = categoryMap[selectedCategory] || { name: selectedCategory, desc: "" };

        const catEmbed = new EmbedBuilder()
          .setColor("#8B0000")
          .setTitle(`${catInfo.name}`)
          .setDescription(`${catInfo.desc}\n\n**قائمة الأوامر المسجلة في هذا القسم:**`)
          .setTimestamp()
          .setThumbnail(client.user.displayAvatarURL())
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

        await i.update({ embeds: [catEmbed], components: getActionRows(selectedCategory) });
      }
    });

    collector.on("end", async () => {
      try {
        const disabledRows = getActionRows().map(row => 
          new ActionRowBuilder().addComponents(
            row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
          )
        );
        await response.edit({ components: disabledRows }).catch(() => {});
      } catch (e) {}
    });
  }
};
