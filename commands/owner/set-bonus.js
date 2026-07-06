import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "set-bonus",
  category: "owner",
  data: new SlashCommandBuilder().setName("set-bonus").setDescription("تحديد بونيس لعضو (Authorized Role Only)").addUserOption((option) => option.setName("user").setDescription("العضو").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("الكمية").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "set-bonus") {
        const authorizedRole = "1484100584054325269";
        const member = interaction.member;
        if (!member.roles.cache.has(authorizedRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "❌ عذراً، هذا الأمر مخصص لأصحاب الرتبة المحددة فقط.", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        if (amount < 0) return interaction.reply({ content: "❌ يجب أن تكون الكمية صفر أو أكثر.", ephemeral: true });
        db.prepare("INSERT INTO leveling (userId, guildId, bonus) VALUES (?, ?, ?) ON CONFLICT(userId, guildId) DO UPDATE SET bonus = ?").run(target.id, guildId, amount, amount);
        await interaction.reply(`✅ تم تحديد بونيس ${target} بـ **${amount}**.`);
        await checkBonusRoles(guildId, target.id);
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
    const commandName = "set-bonus";
    
  }
};
