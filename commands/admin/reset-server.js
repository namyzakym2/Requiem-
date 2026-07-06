import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "reset-server",
  category: "admin",
  data: new SlashCommandBuilder().setName("reset-server").setDescription("Reset the server (Owner Only)"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "reset-server") {
        if (user.id !== OWNER_ID && user.username !== OWNER_USERNAME) return interaction.reply({ content: "❌ هذا الأمر خاص بالمطور فقط.", ephemeral: true });
        const botMember = guild.members.me;
        if (!botMember?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
          return interaction.reply({ content: "❌ البوت يفتقر إلى الصلاحيات اللازمة (إدارة القنوات، إدارة الرتب).", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply("⚠️ جاري البدء في إعادة تعيين السيرفر (الرومات، والرتب)...");
        try {
          const channels = await guild.channels.fetch();
          console.log(`[RESET] Deleting ${channels.size} channels...`);
          for (const ch of channels.values()) {
            if (ch && ch.deletable) {
              ch.delete("Server Reset").catch((err) => {
                if (err.code === 50013) console.warn(`[RESET] Missing Permissions to delete channel ${ch.name}`);
                else console.error(`Failed to delete channel ${ch.name}:`, err.message);
              });
            }
          }
        } catch (err) {
          console.error("Error fetching channels for reset:", err);
        }
        try {
          const roles = await guild.roles.fetch();
          console.log(`[RESET] Deleting ${roles.size} roles...`);
          for (const role of roles.values()) {
            if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== guild.id) {
              role.delete("Server Reset").catch((err) => {
                if (err.code === 50013) console.warn(`[RESET] Missing Permissions to delete role ${role.name}`);
                else console.error(`Failed to delete role ${role.name}:`, err.message);
              });
            }
          }
        } catch (err) {
          console.error("Error fetching roles for reset:", err);
        }
        setTimeout(async () => {
          try {
            if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
              const newChannel = await guild.channels.create({
                name: "welcome",
                type: ChannelType.GuildText,
                topic: "Server has been reset."
              });
              await newChannel.send("✅ تم تصفير السيرفر بنجاح (الرومات، والرتب).");
            }
          } catch (e) {
            console.error("Failed to create welcome channel after reset:", e);
          }
        }, 8e3);
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
    const commandName = "reset-server";
    if (commandName === "resetserver" || commandName === "reset-server") {
          if (message.author.id !== OWNER_ID && message.author.username !== OWNER_USERNAME) return;
          const botMember = message.guild?.members.me;
          if (!botMember?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
            return message.reply("❌ البوت يفتقر إلى الصلاحيات اللازمة (إدارة القنوات، إدارة الرتب).");
          }
          await message.reply("⚠️ جاري البدء في إعادة تعيين السيرفر (الرومات، والرتب)...");
          try {
            const channels = await message.guild?.channels.fetch();
            if (channels) {
              for (const ch of channels.values()) {
                if (ch && ch.deletable) {
                  ch.delete("Server Reset").catch(() => {
                  });
                }
              }
            }
          } catch (err) {
            console.error("Error fetching channels for reset:", err);
          }
          try {
            const roles = await message.guild?.roles.fetch();
            if (roles) {
              for (const role of roles.values()) {
                if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== message.guild?.id) {
                  role.delete("Server Reset").catch(() => {
                  });
                }
              }
            }
          } catch (err) {
            console.error("Error fetching roles for reset:", err);
          }
          setTimeout(async () => {
            try {
              if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const newChannel = await message.guild?.channels.create({
                  name: "welcome",
                  type: ChannelType.GuildText,
                  topic: "Server has been reset."
                });
                await newChannel?.send("✅ تم تصفير السيرفر بنجاح (الرومات، والرتب).");
              }
            } catch (e) {
              console.error("Failed to create welcome channel after reset:", e);
            }
          }, 8e3);
          return;
        }
  }
};
