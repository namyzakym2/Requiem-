import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const QUESTIONS = [
  "شخص تحب ابتسامته؟",
  "كم لك فـ الديسكورد؟",
  "حاجة دايم تضيع منك؟",
  "اكثر شيء تكره تنتظره؟",
  "بالغالب وش تسوي فـ الويكند؟",
  "تتحمل المزح الثقيل؟",
  "وش اكثر فاكهة تحبها؟",
  "كم من 10 البرود فيك؟",
  "اصعب وظيفة في نظرك؟",
  "رائحة عطر مدمن عليها؟",
  "ترتيبك بالعائلة؟",
  "اخر شخص قالك كلمة حلوة؟",
  "دائما قوة الصداقة بـ ...؟",
  "شاي ولا قهوة؟",
  "شيء تبيه يصير الحين؟",
  "اكلة ادمنتها الفترة ذي؟",
  "عمرك طحت بمكان عام؟",
  "ماركتك المفضلة؟",
  "منشن اكثر شخص تثق فيه؟",
  "تعطي الناس فرصة تتقرب منك؟",
  "متى اخر مره نمت اكثر من 12 ساعة؟",
  "وش تحس انك تحتاج الفترة هاذي؟",
  "تجامل ولا صريح؟",
  "تفضل المواد الي تعتمد على الحفظ ولا الفهم؟",
  "صفة تخليك تكره الشخص مهما كان قربه منك؟"
];

export default {
  name: "cut",
  aliases: ["كت"],
  category: "games",
  data: new SlashCommandBuilder()
    .setName("cut")
    .setDescription("إرسال سؤال كت عشوائي للفعاليات والتسلية"),

  async executeInteraction(interaction, context) {
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const embed = new EmbedBuilder()
      .setTitle("✂️ سؤال كت (Cut)")
      .setColor("#8B5CF6")
      .setDescription(`**${question}**`)
      .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}` });

    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const embed = new EmbedBuilder()
      .setTitle("✂️ سؤال كت (Cut)")
      .setColor("#8B5CF6")
      .setDescription(`**${question}**`)
      .setFooter({ text: `طلب بواسطة: ${message.author.tag}` });

    return message.reply({ embeds: [embed] });
  }
};
