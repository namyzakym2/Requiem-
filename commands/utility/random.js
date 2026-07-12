import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "random",
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("random")
    .setDescription("أداة الاختيارات العشوائية والقرعة")
    .addSubcommand(sub => sub
      .setName("coin")
      .setDescription("رمي قطعة نقدية (ملك أو كتابة)")
    )
    .addSubcommand(sub => sub
      .setName("roll")
      .setDescription("رمي نرد عشوائي")
      .addIntegerOption(o => o.setName("sides").setDescription("عدد أوجه النرد (افتراضي 6)").setRequired(false).setMinValue(2))
    )
    .addSubcommand(sub => sub
      .setName("pick")
      .setDescription("اختيار عشوائي من قائمة خيارات تفصل بينها فاصلة")
      .addStringOption(o => o.setName("choices").setDescription("الخيارات تفصل بينها فاصلة (مثال: أزرق, أحمر, أخضر)").setRequired(true))
    ),

  async executeInteraction(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "coin") {
      const result = Math.random() < 0.5 ? "👑 ملك (Heads)" : "🦅 كتابة (Tails)";
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🪙 رمي عملة نقدية")
        .setDescription(`النتيجة هي: **${result}**`)
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "roll") {
      const sides = interaction.options.getInteger("sides") || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle("🎲 رمي نرد")
        .setDescription(`رميت نرد ذو **${sides}** أوجه، والنتيجة هي: **${result}**`)
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === "pick") {
      const choicesStr = interaction.options.getString("choices");
      const choices = choicesStr.split(",").map(c => c.trim()).filter(c => c.length > 0);

      if (choices.length < 2) {
        return interaction.reply({ content: "❌ يرجى كتابة خيارين على الأقل مفصولين بفاصلة لكي أستطيع الاختيار بينهما.", ephemeral: true });
      }

      const picked = choices[Math.floor(Math.random() * choices.length)];
      const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle("🎯 قرعة عشوائية")
        .addFields(
          { name: "📋 الخيارات المتاحة:", value: choices.map((c, i) => `${i + 1}. ${c}`).join("\n") },
          { name: "🏆 الاختيار الفائز:", value: `**${picked}**` }
        )
        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },

  async executeMessage(message, args) {
    if (args.length === 0) {
      return message.reply("❌ يرجى كتابة نوع القرعة: `coin` أو `roll [أوجه]` أو `pick [خيار1, خيار2, ...]`");
    }

    const type = args[0].toLowerCase();

    if (type === "coin") {
      const result = Math.random() < 0.5 ? "👑 ملك (Heads)" : "🦅 كتابة (Tails)";
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🪙 رمي عملة نقدية")
        .setDescription(`النتيجة هي: **${result}**`)
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (type === "roll") {
      const sides = parseInt(args[1]) || 6;
      if (sides < 2) return message.reply("❌ يجب أن يكون للنرد وجهان على الأقل.");

      const result = Math.floor(Math.random() * sides) + 1;
      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle("🎲 رمي نرد")
        .setDescription(`رميت نرد ذو **${sides}** أوجه، والنتيجة هي: **${result}**`)
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (type === "pick") {
      const choicesStr = args.slice(1).join(" ");
      if (!choicesStr) return message.reply("❌ يرجى كتابة الخيارات مفصولة بفاصلة. مثال: `'random pick شاورما, برجر, بيتزا`.");

      const choices = choicesStr.split(",").map(c => c.trim()).filter(c => c.length > 0);
      if (choices.length < 2) {
        return message.reply("❌ يرجى كتابة خيارين على الأقل مفصولين بفاصلة لكي أستطيع الاختيار بينهما.");
      }

      const picked = choices[Math.floor(Math.random() * choices.length)];
      const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle("🎯 قرعة عشوائية")
        .addFields(
          { name: "📋 الخيارات المتاحة:", value: choices.map((c, i) => `${i + 1}. ${c}`).join("\n") },
          { name: "🏆 الاختيار الفائز:", value: `**${picked}**` }
        )
        .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    return message.reply("❌ نوع قرعة غير معروف. المتاح: `coin` أو `roll` أو `pick`.");
  }
};
