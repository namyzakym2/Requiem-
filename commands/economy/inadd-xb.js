import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "inadd-xb",
  category: "economy",
  data: new SlashCommandBuilder().setName("inadd-xb").setDescription("سحب عملات XB من عضو (Authorized Only)").addUserOption((option) => option.setName("user").setDescription("العضو").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "inadd-xb") {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "❌ هذا الأمر خاص بالأشخاص المصرح لهم فقط.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        await deductXB(guildId, targetUser.id, amount, `Admin remove by ${user.username}`);
        await interaction.reply(`✅ تم سحب **${amount}** XB من رصيد ${targetUser}.`);
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
    const commandName = "inadd-xb";
    if (commandName === "inadd-xb") {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const amount = parseInt(args[1]);
          if (!targetUser || isNaN(amount)) return message.reply(`Usage: ${currentPrefix}inadd-xb @user <amount>`);
          await deductXB(guildId, targetUser.id, amount, "Admin remove");
          return message.reply(`✅ تم سحب **${amount}** XB من رصيد ${targetUser}.`);
        }
  }
};
