import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "blox-level",
  category: "bloxfruits",
  data: new SlashCommandBuilder().setName("blox-level").setDescription("طلب خدمة تلفيل بلوكس فروت (Blox Fruits Leveling)").addStringOption((option) => option.setName("username").setDescription("اسم المستخدم في روبلوكس (Roblox Username)").setRequired(true)).addStringOption((option) => option.setName("password").setDescription("كلمة المرور في روبلوكس (Roblox Password)").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "blox-level") {
        const username = interaction.options.getString("username", true);
        const password = interaction.options.getString("password", true);
        await interaction.deferReply({ ephemeral: true });
        try {
          const robloxId = await nblox.getIdFromUsername(username).catch(() => null);
          if (!robloxId) {
            return interaction.editReply({ content: `❌ لم يتم العثور على حساب روبلوكس باسم: \`${username}\`. يرجى التأكد من الاسم.` });
          }
          const playerInfo = await nblox.getPlayerInfo(robloxId);
          const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=420&height=420&format=png`;
          db.prepare("INSERT INTO blox_fruits_requests (userId, guildId, robloxUsername, robloxPassword, robloxId, status) VALUES (?, ?, ?, ?, ?, ?)").run(interaction.user.id, interaction.guildId, username, password, String(robloxId), "processing");
          const embed = new EmbedBuilder().setTitle("✅ تم استلام طلبك وبدأ التلفيل").setThumbnail(avatarUrl).setDescription(`تم تسجيل طلب تلفيل حسابك بنجاح وبدأت العملية فوراً.

**المستخدم:** [${username}](https://www.roblox.com/users/${robloxId}/profile)
**ID:** \`${robloxId}\`
**الحالة:** \`جاري التلفيل (Processing)\`

يمكنك متابعة التقدم عبر أمر \`/blox-status\`.`).setColor(65280).setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          const lastId = db.prepare("SELECT last_insert_rowid() as id").get().id;
          db.prepare("INSERT INTO blox_logs (requestId, message) VALUES (?, ?)").run(lastId, `🚀 بدأ التلفيل التلقائي لحساب: ${username}`);
        } catch (err) {
          console.error("Error saving blox-level request:", err);
          await interaction.editReply({ content: "❌ حدث خطأ أثناء حفظ طلبك. يرجى المحاولة لاحقاً." });
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
    const commandName = "blox-level";
    if (commandName === "blox-level") {
          const username = args[0];
          const password = args[1];
          if (!username || !password) return message.reply(`❌ الاستخدام الصحيح: \`${currentPrefix}blox-level <username> <password>\``);
          try {
            db.prepare("INSERT INTO blox_fruits_requests (userId, guildId, robloxUsername, robloxPassword, status) VALUES (?, ?, ?, ?, ?)").run(message.author.id, guildId, username, password, "pending");
            return message.reply("✅ تم استلام طلب تلفيل حسابك بنجاح! سيتم مراجعته والبدء فيه قريباً.");
          } catch (err) {
            console.error("Error saving blox-level request:", err);
            return message.reply("❌ حدث خطأ أثناء حفظ طلبك.");
          }
        }
  }
};
