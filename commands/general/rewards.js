import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "rewards",
  category: "general",
  data: new SlashCommandBuilder().setName("rewards").setDescription("View level role rewards"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "rewards") {
        const embed = new EmbedBuilder().setTitle("Level Role Rewards").setDescription("Reach these levels to unlock exclusive roles!").setColor(5793266);
        const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
        const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
        const allLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()])).sort((a, b) => a - b);
        const rewardList = allLevels.map((lvl) => {
          const roleId = dynamicRewardMap.get(lvl) || LEVEL_ROLES[lvl];
          return `Level **${lvl}**: <@&${roleId}>`;
        }).join("\n") || "No rewards configured yet.";
        embed.addFields({ name: "Available Rewards", value: rewardList });
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
    const commandName = "rewards";
    if (commandName === "rewards") {
          const embed = new EmbedBuilder().setTitle("Level Role Rewards").setDescription("Reach these levels to unlock exclusive roles!").setColor(5793266);
          const dynamicRewards = db.prepare("SELECT level, roleId FROM rewards WHERE guildId = ?").all(guildId);
          const dynamicRewardMap = new Map(dynamicRewards.map((r) => [r.level, r.roleId]));
          const allLevels = Array.from(/* @__PURE__ */ new Set([...Object.keys(LEVEL_ROLES).map(Number), ...dynamicRewardMap.keys()])).sort((a, b) => a - b);
          const rewardList = allLevels.map((lvl) => {
            const roleId = dynamicRewardMap.get(lvl) || LEVEL_ROLES[lvl];
            return `Level **${lvl}**: <@&${roleId}>`;
          }).join("\n") || "No rewards configured yet.";
          embed.addFields({ name: "Available Rewards", value: rewardList });
          return message.reply({ embeds: [embed] });
        }
  }
};
