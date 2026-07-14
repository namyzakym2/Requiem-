import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";

const economyCategories = {
  core: {
    label: "🏦 الأساسية",
    title: "🏦 معاملات البنك والمحفظة الأساسية",
    desc: "• `'رصيد` (أو `bal`): لعرض رصيدك بالبنك والمحفظة.\n" +
          "• `'إيداع` (أو `deposit`): إيداع كاش من محفظتك إلى حسابك بالبنك.\n" +
          "• `'سحب` (أو `withdraw`): سحب كاش من حساب البنك إلى محفظتك.\n" +
          "• `'تحويل`: تحويل مبلغ مالي لشخص آخر بالسيرفر.\n" +
          "• `'راتب`: استلام راتبك الدوري.\n" +
          "• `'هدية`: إرسال هدية مالية أو عينية لصديقك."
  },
  invest: {
    label: "📈 الاستثمار",
    title: "📈 القروض والاستثمارات والتداول",
    desc: "• `'قرض`: طلب قرض مالي بفوائد محددة من البنك.\n" +
          "• `'سداد`: سداد الديون أو القروض المستحقة عليك.\n" +
          "• `'ديون`: عرض كشف تفصيلي بالديون المتبقية عليك.\n" +
          "• `'سوق`: عرض قائمة الأسهم والسلع المتاحة للتداول.\n" +
          "• `'شراء`: شراء سهم أو سلعة استثمارية من السوق.\n" +
          "• `'بيع`: بيع سلعة أو أسهم من محفظتك الاستثمارية.\n" +
          "• `'استثمار`: استثمار مبلغ من المال في صناديق استثمارية.\n" +
          "• `'بيع_سهم`: سحب وتسييل الأسهم المستثمر بها."
  },
  gambling: {
    label: "🎲 ألعاب الحظ",
    title: "🎲 ألعاب الحظ والتسلية والمقامرة",
    desc: "• `'مقامرة`: المراهنة بمبلغ معين ومضاعفته.\n" +
          "• `'slots` (أو `'حظ`): تجربة لعبة الحظ السلوتس الكلاسيكية.\n" +
          "• `'dice`: لعبة نرد الحظ.\n" +
          "• `'flip`: لعبة رمي العملة ملك أو كتابة.\n" +
          "• `'yanasib` (أو `'يانصيب`): شراء وتجربة تذاكر يانصيب البنك اليومية."
  },
  work: {
    label: "⚔️ العمل والجرائم",
    title: "⚔️ العمل، كسب الرزق والجرائم",
    desc: "• `'عمل` (أو `work`): العمل بوظيفة لكسب المال بشكل قانوني.\n" +
          "• `'sariqa` (أو `'سرقة`): محاولة سرقة كاش من محفظة عضو آخر.\n" +
          "• `'crime`: ارتكاب جريمة خطرة لكسب مكافأة ضخمة أو مواجهة عقوبة.\n" +
          "• `'beg` (أو `'شحاذة`): طلب مساعدة مالية بسيطة."
  },
  inventory: {
    label: "🛡️ الحقيبة والحماية",
    title: "🛡️ المخزن، الحقيبة والحماية",
    desc: "• `'محفظة`: عرض أصولك وحقيبتك الاستثمارية.\n" +
          "• `'مخزن`: فحص سلعك المخزنة والمتاحة للبيع.\n" +
          "• `'حماية`: شراء حماية لحسابك ضد محاولات السرقة والنهب."
  },
  stats: {
    label: "🏆 الإحصائيات",
    title: "🏆 الإحصائيات والمتصدرين والبريميوم",
    desc: "• `'توب_اغنياء`: عرض قائمة أغنى أعضاء السيرفر بالبنك.\n" +
          "• `'premium` (أو `'بريميوم`): شراء أو فحص اشتراك البريميوم الفاخر والميزات الخاصة لبوت Requiem.\n" +
          "• `'مساعدة_بنك`: قائمة مساعدة مخصصة لاقتصاد البنك."
  }
};

export default {
  name: "اوامر",
  aliases: ["commands", "الاوامر", "أوامر"],
  category: "general",
  data: new SlashCommandBuilder()
    .setName("commands")
    .setDescription("عرض جميع أوامر البنك والاقتصاد والمقامرة مرتبة في أقسام"),
  
  async executeInteraction(interaction) {
    const { user, guild } = interaction;

    const getMainEmbed = () => {
      return new EmbedBuilder()
        .setColor(0x27272f)
        .setTitle("🏦 قائمة أوامر البنك والاقتصاد Requiem")
        .setDescription(
          "استخدم البادئة (`'`) قبل أي أمر، أو اضغط على الأزرار أدناه للتنقل المباشر بين أقسام الاقتصاد المتاحة:\n\n" +
          "• **🏦 الأساسية**: معاملات المحفظة والتحويل والراتب\n" +
          "• **📈 الاستثمار**: القروض والأسهم وسوق التداول\n" +
          "• **🎲 ألعاب الحظ**: السلوتس والمقامرة والنرد واليانصيب\n" +
          "• **⚔️ العمل والجرائم**: الوظائف والسرقات والمخاطرة\n" +
          "• **🛡️ الحقيبة والحماية**: الأصول والحقيبة ودرع الحماية\n" +
          "• **🏆 الإحصائيات**: التوب والبريميوم ومساعد الاقتصاد"
        )
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter({ text: "سيرفر دعم ريكومريم - Requiem Support Server", iconURL: interaction.client.user.displayAvatarURL() });
    };

    const getActionRows = (activeKey = null) => {
      const buttons = [];

      // Main Menu Button
      buttons.push(
        new ButtonBuilder()
          .setCustomId("eco_main")
          .setLabel("🏠 الرئيسية")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(activeKey === null)
      );

      Object.keys(economyCategories).forEach((key) => {
        const info = economyCategories[key];
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`eco_${key}`)
            .setLabel(info.label)
            .setStyle(activeKey === key ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }
      return rows;
    };

    const response = await interaction.reply({ embeds: [getMainEmbed()], components: getActionRows() });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== user.id) {
        return i.reply({ content: "❌ هذه القائمة ليست لك.", ephemeral: true });
      }

      const customId = i.customId;

      if (customId === "eco_main") {
        await i.update({ embeds: [getMainEmbed()], components: getActionRows(null) });
      } else {
        const key = customId.replace("eco_", "");
        const info = economyCategories[key];

        const embed = new EmbedBuilder()
          .setColor(0x27272f)
          .setTitle(info.title)
          .setDescription(`استخدم البادئة (\`'\`) لتشغيل الأوامر التالية:\n\n${info.desc}`)
          .setThumbnail(interaction.client.user.displayAvatarURL())
          .setFooter({ text: "سيرفر دعم ريكومريم - Requiem Support Server", iconURL: interaction.client.user.displayAvatarURL() });

        await i.update({ embeds: [embed], components: getActionRows(key) });
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

  async executeMessage(message) {
    const { author } = message;

    const getMainEmbed = () => {
      return new EmbedBuilder()
        .setColor(0x27272f)
        .setTitle("🏦 قائمة أوامر البنك والاقتصاد Requiem")
        .setDescription(
          "استخدم البادئة (`'`) قبل أي أمر، أو اضغط على الأزرار أدناه للتنقل المباشر بين أقسام الاقتصاد المتاحة:\n\n" +
          "• **🏦 الأساسية**: معاملات المحفظة والتحويل والراتب\n" +
          "• **📈 الاستثمار**: القروض والأسهم وسوق التداول\n" +
          "• **🎲 ألعاب الحظ**: السلوتس والمقامرة والنرد واليانصيب\n" +
          "• **⚔️ العمل والجرائم**: الوظائف والسرقات والمخاطرة\n" +
          "• **🛡️ الحقيبة والحماية**: الأصول والحقيبة ودرع الحماية\n" +
          "• **🏆 الإحصائيات**: التوب والبريميوم ومساعد الاقتصاد"
        )
        .setThumbnail(message.client.user.displayAvatarURL())
        .setFooter({ text: "سيرفر دعم ريكومريم - Requiem Support Server", iconURL: message.client.user.displayAvatarURL() });
    };

    const getActionRows = (activeKey = null) => {
      const buttons = [];

      // Main Menu Button
      buttons.push(
        new ButtonBuilder()
          .setCustomId("eco_main")
          .setLabel("🏠 الرئيسية")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(activeKey === null)
      );

      Object.keys(economyCategories).forEach((key) => {
        const info = economyCategories[key];
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`eco_${key}`)
            .setLabel(info.label)
            .setStyle(activeKey === key ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }
      return rows;
    };

    const response = await message.reply({ embeds: [getMainEmbed()], components: getActionRows() });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== author.id) {
        return i.reply({ content: "❌ هذه القائمة ليست لك.", ephemeral: true });
      }

      const customId = i.customId;

      if (customId === "eco_main") {
        await i.update({ embeds: [getMainEmbed()], components: getActionRows(null) });
      } else {
        const key = customId.replace("eco_", "");
        const info = economyCategories[key];

        const embed = new EmbedBuilder()
          .setColor(0x27272f)
          .setTitle(info.title)
          .setDescription(`استخدم البادئة (\`'\`) لتشغيل الأوامر التالية:\n\n${info.desc}`)
          .setThumbnail(message.client.user.displayAvatarURL())
          .setFooter({ text: "سيرفر دعم ريكومريم - Requiem Support Server", iconURL: message.client.user.displayAvatarURL() });

        await i.update({ embeds: [embed], components: getActionRows(key) });
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
