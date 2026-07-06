import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "id",
  category: "general",
  data: new SlashCommandBuilder().setName("id").setDescription("View your or another user's profile card").addUserOption((option) => option.setName("user").setDescription("The user to view")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "id") {
        const targetUser = interaction.options.getUser("user") || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
          return interaction.reply({ content: "❌ هذا المستخدم غير موجود في السيرفر.", ephemeral: true });
        }
        await interaction.deferReply();
        try {
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const level = userRow?.level || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
          const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
          const width = 800;
          const height = 300;
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");
          const avatarURL = targetUser.displayAvatarURL({ extension: "png", size: 256 });
          const avatar = await loadImage(avatarURL);
          const encoder = new GIFEncoder(width, height);
          encoder.start();
          encoder.setRepeat(0);
          encoder.setDelay(50);
          encoder.setQuality(10);
          const totalFrames = 20;
          const targetProgress = Math.min(xp / nextLevelXp, 1);
          for (let i = 0; i <= totalFrames; i++) {
            const currentProgress = i / totalFrames * targetProgress;
            ctx.clearRect(0, 0, width, height);
            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, "#1a1a2e");
            bgGradient.addColorStop(1, "#16213e");
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = "#5865f2";
            ctx.beginPath();
            ctx.arc(width, 0, 200, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, height, 150, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            ctx.beginPath();
            ctx.roundRect(30, 30, width - 60, height - 60, 25);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#5865f2";
            ctx.beginPath();
            ctx.arc(130, 150, 80, 0, Math.PI * 2);
            ctx.fillStyle = "#5865f2";
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(130, 150, 75, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 55, 75, 150, 150);
            ctx.restore();
            ctx.strokeStyle = "#5865f2";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(130, 150, 75, 0, Math.PI * 2, true);
            ctx.stroke();
            ctx.font = "bold 38px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.fillText(targetUser.username, 240, 95);
            const drawStat = (x, y, label, value, color) => {
              ctx.font = "14px sans-serif";
              ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
              ctx.fillText(label, x, y);
              ctx.font = "bold 24px sans-serif";
              ctx.fillStyle = color;
              ctx.fillText(value, x, y + 30);
            };
            drawStat(240, 130, "LEVEL", level.toString(), "#5865f2");
            drawStat(360, 130, "RANK", `#${rank}`, "#00d2ff");
            drawStat(480, 130, "PROGRESS", `${Math.floor(currentProgress * 100)}%`, "#ff007a");
            const barWidth = 500;
            const barHeight = 30;
            const barX = 240;
            const barY = 195;
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 15);
            ctx.fill();
            if (currentProgress > 0) {
              const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
              barGrad.addColorStop(0, "#5865f2");
              barGrad.addColorStop(1, "#ff007a");
              ctx.fillStyle = barGrad;
              ctx.beginPath();
              ctx.roundRect(barX, barY, barWidth * currentProgress, barHeight, 15);
              ctx.fill();
            }
            ctx.font = "bold 14px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(`${xp} / ${nextLevelXp} XP`, barX + barWidth / 2, barY + 20);
            encoder.addFrame(ctx);
          }
          for (let i = 0; i < 15; i++) encoder.addFrame(ctx);
          encoder.finish();
          const buffer = encoder.out.getData();
          const attachment = new AttachmentBuilder(buffer, { name: "profile-card.gif" });
          await interaction.editReply({ files: [attachment] });
        } catch (err) {
          console.error("Error generating ID image:", err);
          await interaction.editReply("حدث خطأ أثناء إنشاء صورة الهوية المتحركة.");
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
    const commandName = "id";
    if (commandName === "id") {
          const targetUser = message.mentions.users.first() || message.author;
          const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
          if (!targetMember) {
            return message.reply("❌ هذا المستخدم غير موجود في السيرفر.");
          }
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const level = userRow?.level || 0;
          const xb = userRow?.xb || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          const leaderboard = db.prepare("SELECT userId FROM leveling WHERE guildId = ? ORDER BY level DESC, xp DESC").all(guildId);
          const rank = leaderboard.findIndex((u) => u.userId === targetUser.id) + 1;
          const width = 800;
          const height = 300;
          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext("2d");
          const encoder = new GIFEncoder(width, height);
          encoder.start();
          encoder.setRepeat(-1);
          encoder.setDelay(500);
          encoder.setQuality(10);
          const avatarURL = targetUser.displayAvatarURL({ extension: "png", size: 256 });
          const avatar = await loadImage(avatarURL);
          const targetProgress = Math.min(xp / nextLevelXp, 1);
          ctx.clearRect(0, 0, width, height);
          const bgGradient = ctx.createLinearGradient(0, 0, width, height);
          bgGradient.addColorStop(0, "#1a1a2e");
          bgGradient.addColorStop(1, "#16213e");
          ctx.fillStyle = bgGradient;
          ctx.fillRect(0, 0, width, height);
          ctx.save();
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = "#5865f2";
          ctx.beginPath();
          ctx.arc(width, 0, 200, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, height, 150, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.beginPath();
          ctx.roundRect(30, 30, width - 60, height - 60, 25);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = "#5865f2";
          ctx.beginPath();
          ctx.arc(130, 150, 80, 0, Math.PI * 2);
          ctx.fillStyle = "#5865f2";
          ctx.globalAlpha = 0.2;
          ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.beginPath();
          ctx.arc(130, 150, 75, 0, Math.PI * 2, true);
          ctx.clip();
          ctx.drawImage(avatar, 55, 75, 150, 150);
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = "#5865f2";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(130, 150, 77, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 36px Arial";
          ctx.fillText(targetUser.username, 240, 90);
          ctx.font = "24px Arial";
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.fillText(`Rank: #${rank}`, 240, 130);
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = "18px Arial";
          ctx.fillText(`Level ${level}`, 240, 185);
          ctx.fillText(`${xp} / ${nextLevelXp} XP`, width - 180, 185);
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
          ctx.beginPath();
          ctx.roundRect(240, 200, 500, 20, 10);
          ctx.fill();
          const barGradient = ctx.createLinearGradient(240, 0, 740, 0);
          barGradient.addColorStop(0, "#5865f2");
          barGradient.addColorStop(1, "#858df3");
          ctx.fillStyle = barGradient;
          ctx.beginPath();
          ctx.roundRect(240, 200, 500 * targetProgress, 20, 10);
          ctx.fill();
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#5865f2";
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(240 + 500 * targetProgress, 210, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          encoder.addFrame(ctx);
          encoder.finish();
          const buffer = encoder.out.getData();
          const attachment = new AttachmentBuilder(buffer, { name: "id.gif" });
          return message.reply({ files: [attachment] });
        }
  }
};
