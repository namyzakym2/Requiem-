import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "math",
  category: "utility",
  data: new SlashCommandBuilder()
    .setName("math")
    .setDescription("حساب مسألة رياضية")
    .addStringOption(o => o.setName("expression").setDescription("المسألة الرياضية المراد حسابها").setRequired(true)),

  async executeInteraction(interaction) {
    const expr = interaction.options.getString("expression");
    const result = evaluateExpression(expr);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🧮 حاسبة ريكويم")
      .addFields(
        { name: "📥 المسألة:", value: `\`\`\`\n${expr}\n\`\`\`` },
        { name: "📤 الناتج:", value: `\`\`\`\n${result}\n\`\`\`` }
      )
      .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args) {
    const expr = args.join(" ");
    if (!expr) {
      return message.reply("❌ يرجى كتابة المسألة الرياضية المراد حسابها. مثال: `'math 5 * (10 + 2)`");
    }

    const result = evaluateExpression(expr);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🧮 حاسبة ريكويم")
      .addFields(
        { name: "📥 المسألة:", value: `\`\`\`\n${expr}\n\`\`\`` },
        { name: "📤 الناتج:", value: `\`\`\`\n${result}\n\`\`\`` }
      )
      .setFooter({ text: `طلب بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};

function evaluateExpression(expr) {
  try {
    // Sanitize the expression to prevent execution of malicious code
    // Allow numbers, spaces, parentheses, math operators: +, -, *, /, %, ., and ^ for power
    let sanitized = expr.replace(/\s+/g, "").replace(/\^/g, "**");
    
    // Validate expression character whitelist
    const whitelist = /^[0-9+\-*/().%]+$/;
    if (!whitelist.test(sanitized)) {
      return "❌ مسألة غير صالحة. الرجاء استخدام الأرقام والعمليات الرياضية البسيطة فقط (+, -, *, /, %, ^, ()).";
    }

    // Evaluate using a safe Function constructor
    const fn = new Function(`return (${sanitized});`);
    const val = fn();

    if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
      return "❌ ناتج غير معرف أو غير صالح.";
    }

    return String(val);
  } catch (err) {
    return "❌ حدث خطأ أثناء حساب المسألة. تأكد من صحة الصيغة.";
  }
}
