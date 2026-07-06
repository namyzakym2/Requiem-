import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "rank",
  category: "general",
  data: new SlashCommandBuilder().setName("rank").setDescription("Check your current level and XP"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "rank") {
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
        if (!userRow) return interaction.reply({ content: "You don't have a rank yet. Start chatting!", ephemeral: true });
        const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
        const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
        const allRewardLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()]));
        const nextRewardLevel = allRewardLevels.filter((lvl) => lvl > userRow.level).sort((a, b) => a - b)[0];
        const embed = new EmbedBuilder().setTitle(`${user.username}'s Rank`).addFields(
          { name: "Level", value: userRow.level.toString(), inline: true },
          { name: "XP", value: `${userRow.xp} / ${(userRow.level + 1) * 300}`, inline: true },
          { name: "Bonus", value: (userRow.bonus || 0).toString(), inline: true }
        ).setColor(44678);
        if (nextRewardLevel) {
          const roleId = dynamicRewardMap.get(nextRewardLevel) || LEVEL_ROLES[nextRewardLevel];
          embed.addFields({ name: "Next Reward", value: `Level **${nextRewardLevel}**: <@&${roleId}>`, inline: false });
        }
        await interaction.reply({ embeds: [embed] });
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
    const commandName = "rank";
    if (commandName === "rank") {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(userId, guildId);
          if (!userRow) return message.reply("You don't have a rank yet. Start chatting!");
          const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
          const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
          const allRewardLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()]));
          const nextRewardLevel = allRewardLevels.filter((lvl) => lvl > userRow.level).sort((a, b) => a - b)[0];
          const embed = new EmbedBuilder().setTitle(`${message.author.username}'s Rank`).addFields(
            { name: "Level", value: userRow.level.toString(), inline: true },
            { name: "XP", value: `${userRow.xp} / ${(userRow.level + 1) * 300}`, inline: true }
          ).setColor(44678);
          if (nextRewardLevel) {
            const roleId = dynamicRewardMap.get(nextRewardLevel) || LEVEL_ROLES[nextRewardLevel];
            embed.addFields({ name: "Next Reward", value: `Level **${nextRewardLevel}**: <@&${roleId}>`, inline: false });
          }
          return message.reply({ embeds: [embed] });
        }
  }
};
