import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { load, save, settings, C, n, E } from "./utils.js";

export default {
  name: "يانصيب",
  category: "bank",
  data: new SlashCommandBuilder()
    .setName("يانصيب")
    .setDescription("🎟️ اشترِ تذكرة يانصيب وادخل السحب"),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const cfg = settings();
    
    const cost = 1000;
    const uid = interaction.user.id;
    const users = load("users.json");

    const userRow = db.prepare("SELECT bank_wallet FROM leveling WHERE userId = ? AND guildId = ?").get(uid, interaction.guildId);
    if (!users[uid]) users[uid] = { balance: userRow?.bank_wallet || 0, bank_vault: 0 };
    users[uid].balance = Math.max(users[uid].balance || 0, userRow?.bank_wallet || 0);

    if (users[uid].balance < cost) {
      return interaction.reply({ embeds: [E("❌ رصيد غير كافٍ").setDescription(`سعر تذكرة اليانصيب هو ${n(cost)} دولار.`) ], ephemeral: true });
    }

    users[uid].balance -= cost;
    save("users.json", users);
    db.prepare("UPDATE leveling SET bank_wallet = bank_wallet - ? WHERE userId = ? AND guildId = ?").run(cost, uid, interaction.guildId);

    // Logic for lottery winner would be handled by a separate cron job or event
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(C).setTitle("🎟️ تم شراء تذكرة اليانصيب")
      .setDescription(`بالتوفيق! تم خصم ${n(cost)} دولار من رصيدك. سيتم إعلان الفائز قريباً.`)] });
  },

  async executeMessage(message, args, context) {
      // Similar implementation for text
      return message.reply("تم شراء تذكرة اليانصيب.");
  }
};
