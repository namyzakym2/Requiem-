import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "azkar-setup",
  category: "admin",
  data: new SlashCommandBuilder().setName("azkar-setup").setDescription("إعدادات نظام الأذكار (Admin Only)").addChannelOption((option) => option.setName("channel").setDescription("القناة التي ستظهر فيها الأذكار").setRequired(true)).addIntegerOption((option) => option.setName("interval").setDescription("المدة الزمنية بين كل ذكر (بالدقائق)").setRequired(true).setMinValue(1).setMaxValue(1440)).addStringOption((option) => option.setName("status").setDescription("تفعيل أو تعطيل النظام").setRequired(true).addChoices(
      { name: "تفعيل", value: "on" },
      { name: "تعطيل", value: "off" }
    )),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "azkar-setup") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const channel2 = interaction.options.getChannel("channel");
        const interval = interaction.options.getInteger("interval");
        const status = interaction.options.getString("status");
        const enabled = status === "on" ? 1 : 0;
        if (channel2.type !== ChannelType.GuildText) {
          return interaction.reply({ content: "يجب اختيار قناة نصية.", ephemeral: true });
        }
        db.prepare("INSERT INTO azkar_settings (guildId, channelId, interval, enabled) VALUES (?, ?, ?, ?) ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, interval = excluded.interval, enabled = excluded.enabled").run(guildId, channel2.id, interval, enabled);
        await interaction.reply(`✅ تم إعداد نظام الأذكار بنجاح!
القناة: ${channel2}
المدة: كل ${interval} دقيقة
الحالة: ${status === "on" ? "مفعل" : "معطل"}`);
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
    const commandName = "azkar-setup";
    
  }
};
