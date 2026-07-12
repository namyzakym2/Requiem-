import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "box",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("box")
    .setDescription("📦 إنشاء صندوق هدايا سريع الفتح (First to click wins!)")
    .addStringOption((option) =>
      option.setName("prize")
        .setDescription("الجائزة الموجودة داخل الصندوق")
        .setRequired(true)
    ),

  async executeInteraction(interaction, context) {
    const { user, channel } = interaction;
    const prize = interaction.options.getString("prize");

    const embed = new EmbedBuilder()
      .setDescription(
        `🔘 **${prize}**\n` +
        `🔒 **Hosted By** ${user}\n\n` +
        `.mm.8`
      )
      .setColor("#6d28d9");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_lucky_box")
        .setLabel("🎉 0/1")
        .setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = (i) => i.customId === "claim_lucky_box" && !i.user.bot;
    const collector = msg.createMessageComponentCollector({ filter, time: 86400000, max: 1 });

    collector.on("collect", async (i) => {
      const winner = i.user;

      const claimEmbed = new EmbedBuilder()
        .setDescription(
          `🔘 **${prize}**\n` +
          `🔒 **Hosted By** ${user}\n` +
          `🏆 **Winner:** ${winner}\n\n` +
          `.mm.8`
        )
        .setColor("#10b981");

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("claim_lucky_box")
          .setLabel("🎉 1/1")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await i.update({ embeds: [claimEmbed], components: [disabledRow] }).catch(console.error);
      
      const successMsg = `🎉 مبارك ${winner}! لقد فتحت الصندوق أولاً وفزت بـ **${prize}**!`;
        
      await channel.send(successMsg).catch(console.error);
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        const expiredEmbed = new EmbedBuilder()
          .setDescription(
            `🔘 **${prize}**\n` +
            `🔒 **Hosted By** ${user}\n` +
            `❌ **Expired**\n\n` +
            `.mm.8`
          )
          .setColor("#ef4444");

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("claim_lucky_box")
            .setLabel("🔒 منتهي | Expired")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await interaction.editReply({ embeds: [expiredEmbed], components: [disabledRow] }).catch(() => {});
      }
    });
  },

  async executeMessage(message, args, context) {
    const { PREFIX } = context;

    if (args.length === 0) {
      const usageEmbed = new EmbedBuilder()
        .setTitle("❌ استخدام خاطئ للأمر")
        .setDescription(
          `**الاستخدام الصحيح:**\n` +
          `\`${PREFIX}box <الجائزة>\`\n\n` +
          `**مثال:**\n` +
          `\`${PREFIX}box نيترو قيمنق شهر\`\n` +
          `\`${PREFIX}box 50k\`\n` +
          `\`${PREFIX}box 2m\``
        )
        .setColor("#ef4444");
      return message.reply({ embeds: [usageEmbed] });
    }

    const prize = args.join(" ");

    const embed = new EmbedBuilder()
      .setDescription(
        `🔘 **${prize}**\n` +
        `🔒 **Hosted By** ${message.author}\n\n` +
        `.mm.8`
      )
      .setColor("#6d28d9");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_lucky_box")
        .setLabel("🎉 0/1")
        .setStyle(ButtonStyle.Secondary)
    );

    // Try to delete original message
    await message.delete().catch(() => {});

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const filter = (i) => i.customId === "claim_lucky_box" && !i.user.bot;
    const collector = msg.createMessageComponentCollector({ filter, time: 86400000, max: 1 });

    collector.on("collect", async (i) => {
      const winner = i.user;

      const claimEmbed = new EmbedBuilder()
        .setDescription(
          `🔘 **${prize}**\n` +
          `🔒 **Hosted By** ${message.author}\n` +
          `🏆 **Winner:** ${winner}\n\n` +
          `.mm.8`
        )
        .setColor("#10b981");

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("claim_lucky_box")
          .setLabel("🎉 1/1")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await i.update({ embeds: [claimEmbed], components: [disabledRow] }).catch(console.error);
      
      const successMsg = `🎉 مبارك ${winner}! لقد فتحت الصندوق أولاً وفزت بـ **${prize}**!`;

      await message.channel.send(successMsg).catch(console.error);
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        const expiredEmbed = new EmbedBuilder()
          .setDescription(
            `🔘 **${prize}**\n` +
            `🔒 **Hosted By** ${message.author}\n` +
            `❌ **Expired**\n\n` +
            `.mm.8`
          )
          .setColor("#ef4444");

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("claim_lucky_box")
            .setLabel("🔒 منتهي | Expired")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await msg.edit({ embeds: [expiredEmbed], components: [disabledRow] }).catch(() => {});
      }
    });
  }
};
