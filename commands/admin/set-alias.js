import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "set-alias",
  category: "admin",
  data: new SlashCommandBuilder().setName("set-alias").setDescription("Create a shortcut for another command (Admin Only)").addStringOption((option) => option.setName("alias").setDescription("The new shortcut name (e.g., r)").setRequired(true)).addStringOption((option) => option.setName("command").setDescription("The original command name (e.g., rank)").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "set-alias") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "Admin only.", ephemeral: true });
        }
        const aliasName = interaction.options.getString("alias").toLowerCase();
        const originalCommand = interaction.options.getString("command").toLowerCase();
        await interaction.deferReply({ ephemeral: true }).catch(() => {
        });
        db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
        try {
          const commands = await client.application?.commands.fetch();
          const original = commands?.find((c) => c.name === originalCommand);
          if (original) {
            await guild.commands.create({
              name: aliasName,
              description: `Shortcut for /${originalCommand}`,
              options: original.options
            });
            await interaction.editReply(`✅ Alias created: **${aliasName}** now triggers **${originalCommand}**.`);
          } else {
            await interaction.editReply({ content: `❌ Original command **${originalCommand}** not found.` });
          }
        } catch (err) {
          console.error("Failed to register alias command:", err);
          await interaction.editReply({ content: "✅ Alias saved to DB, but failed to register slash command locally." });
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
    const commandName = "set-alias";
    if (commandName === "set-alias") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          const aliasName = args[0]?.toLowerCase();
          const originalCommand = args[1]?.toLowerCase();
          if (!aliasName || !originalCommand) return message.reply("Usage: set-alias <alias> <command>");
          db.prepare("INSERT OR REPLACE INTO aliases (guildId, aliasName, originalCommand) VALUES (?, ?, ?)").run(guildId, aliasName, originalCommand);
          return message.reply(`✅ Alias created: **${aliasName}** now triggers **${originalCommand}**.`);
        }
  }
};
