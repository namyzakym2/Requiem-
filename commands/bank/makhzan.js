import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, settings, C, n, E, noRoom } from "./utils.js";

export default {
  name: "مخزن",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("مخزن")
    .setDescription("🎒 عرض مخزن الممتلكات والأصول التي تمتلكها")
    .addUserOption(o => o.setName("اللاعب").setDescription("اللاعب المراد عرض ممتلكاته").setRequired(false)),

  async executeInteraction(interaction, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && interaction.channelId !== cfg.bankRoom) return noRoom(interaction);

    const target = interaction.options.getUser("اللاعب") || interaction.user;
    const users = load("users.json");
    const market = load("market.json");

    if (!users[target.id] || !users[target.id].inventory || Object.keys(users[target.id].inventory).length === 0) {
      return interaction.reply({ embeds: [E("🎒 المخزن فارغ").setDescription(`${target.username} لا يمتلك أي ممتلكات في المخزن حالياً. استخدم \`/شراء\` للبدء في التسوق.`)], ephemeral: true });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle(`🎒 مخزن ممتلكات ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    let totalVal = 0;
    const items = [];

    for (const [name, qty] of Object.entries(users[target.id].inventory)) {
      if (qty <= 0) continue;
      const prop = market.properties[name];
      const pPrice = prop ? Math.round(prop.price) : 0;
      const total = pPrice * qty;
      totalVal += total;
      
      const catEmoji = prop?.category?.split(" ")?.[0] || "📦";
      items.push(`• **${catEmoji} ${name}**: الكمية **${qty}** (القيمة المقدرة: ${n(total)} دولار)`);
    }

    embed.setDescription(items.join("\n") + `\n\n📊 **القيمة الإجمالية للممتلكات:** **${n(totalVal)} دولار**`);
    return interaction.reply({ embeds: [embed] });
  },

  async executeMessage(message, args, context) {
    const cfg = settings();
    if (cfg.bankRoom !== "" && message.channelId !== cfg.bankRoom) return;

    const target = message.mentions.users.first() || message.author;
    const users = load("users.json");
    const market = load("market.json");

    if (!users[target.id] || !users[target.id].inventory || Object.keys(users[target.id].inventory).length === 0) {
      return message.reply({ embeds: [E("🎒 المخزن فارغ").setDescription(`${target.username} لا يمتلك أي ممتلكات في المخزن حالياً. استخدم \`!شراء\` للبدء في التسوق.`)] });
    }

    const embed = new EmbedBuilder().setColor(C)
      .setTitle(`🎒 مخزن ممتلكات ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    let totalVal = 0;
    const items = [];

    for (const [name, qty] of Object.entries(users[target.id].inventory)) {
      if (qty <= 0) continue;
      const prop = market.properties[name];
      const pPrice = prop ? Math.round(prop.price) : 0;
      const total = pPrice * qty;
      totalVal += total;
      
      const catEmoji = prop?.category?.split(" ")?.[0] || "📦";
      items.push(`• **${catEmoji} ${name}**: الكمية **${qty}** (القيمة المقدرة: ${n(total)} دولار)`);
    }

    embed.setDescription(items.join("\n") + `\n\n📊 **القيمة الإجمالية للممتلكات:** **${n(totalVal)} دولار**`);
    return message.reply({ embeds: [embed] });
  }
};
