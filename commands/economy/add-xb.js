import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "add-xb",
  category: "economy",
  data: new SlashCommandBuilder().setName("add-xb").setDescription("إضافة عملات XB لعضو (Authorized Only)").addUserOption((option) => option.setName("user").setDescription("العضو").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "add-xb") {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "❌ هذا الأمر خاص بالأشخاص المصرح لهم فقط.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        db.prepare("INSERT INTO leveling (userId, guildId, xb) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET xb = xb + ?").run(targetUser.id, guildId, amount, amount);
        await awardXB(guildId, targetUser.id, amount, `Admin add by ${user.username}`);
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
    const commandName = "add-xb";
    if (commandName === "add-xb") {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!targetUser || isNaN(amount)) return message.reply(`Usage: ${currentPrefix}add-xb @user <amount>`);
          await awardXB(guildId, targetUser.id, amount, "Admin add");
          return message.reply(`✅ تم إضافة **${amount}** XB إلى رصيد ${targetUser}.`);
        }
  }
};
