import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "reset-xb",
  category: "economy",
  data: new SlashCommandBuilder().setName("reset-xb").setDescription("تصفير رون لعضو أو للكل (Authorized Only)").addUserOption((option) => option.setName("user").setDescription("العضو المراد تصفيره")).addBooleanOption((option) => option.setName("all").setDescription("تصفير رصيد الجميع؟")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "reset-xb") {
        if (!AUTHORIZED_CURRENCY_IDS.includes(user.id)) {
          return interaction.reply({ content: "❌ هذا الأمر خاص بالأشخاص المصرح لهم فقط.", ephemeral: true });
        }
        const targetUser = interaction.options.getUser("user");
        const resetAll = interaction.options.getBoolean("all") || false;
        if (resetAll) {
          db.prepare("UPDATE leveling SET xb = 0 WHERE guildId = ?").run(guildId);
          await interaction.reply("✅ تم تصفير رون جميع الأعضاء في السيرفر.");
        } else if (targetUser) {
          const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const currentBalance = targetRow?.xb || 0;
          await deductXB(guildId, targetUser.id, currentBalance, `Admin reset by ${user.username}`);
          await interaction.reply(`✅ تم تصفير رون العضو ${targetUser}.`);
        } else {
          await interaction.reply({ content: "❌ يرجى تحديد عضو أو اختيار تصفير الكل.", ephemeral: true });
        }
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
    const commandName = "reset-xb";
    if (commandName === "reset-xb") {
          if (!AUTHORIZED_CURRENCY_IDS.includes(message.author.id)) return;
          const targetUser = message.mentions.users.first();
          const resetAll = args[0] === "all" || args[0] === "الكل";
          if (resetAll) {
            const allUsers = db.prepare("SELECT userId, xb FROM leveling WHERE guildId = ?").all(guildId);
            for (const u of allUsers) {
              await deductXB(guildId, u.userId, u.xb, "Admin reset all");
            }
            return message.reply("✅ تم تصفير رون جميع الأعضاء في السيرفر.");
          } else if (targetUser) {
            const targetRow = db.prepare("SELECT xb FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
            const currentBalance = targetRow?.xb || 0;
            await deductXB(guildId, targetUser.id, currentBalance, "Admin reset");
            return message.reply(`✅ تم تصفير رون العضو ${targetUser}.`);
          } else {
            return message.reply(`Usage: ${currentPrefix}reset-xb @user OR ${currentPrefix}reset-xb all`);
          }
        }
  }
};
