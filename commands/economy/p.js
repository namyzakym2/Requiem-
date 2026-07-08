import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    const defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (const side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

async function generateProfileImage(user, level, xb, xp, nextLevelXp) {
  const canvas = createCanvas(800, 250);
  const ctx = canvas.getContext("2d");

  // Elegant luxury dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 800, 250);
  gradient.addColorStop(0, "#08090c");
  gradient.addColorStop(1, "#121420");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 250);

  // Decorative sleek neon/gold border lines
  ctx.strokeStyle = "rgba(225, 29, 72, 0.35)"; // Ruby rose subtle glow
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 794, 244);

  ctx.strokeStyle = "rgba(255, 215, 0, 0.8)"; // Gold fine inner borders
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 8, 784, 234);

  // Draw Avatar
  let avatarImg;
  try {
    const avatarURL = user.displayAvatarURL({ extension: "png", size: 256 });
    avatarImg = await loadImage(avatarURL);
  } catch (err) {
    avatarImg = await loadImage("https://cdn.discordapp.com/embed/avatars/0.png");
  }

  // Draw circular cropped avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(115, 125, 75, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImg, 40, 50, 150, 150);
  ctx.restore();

  // Draw nice Gold border ring around avatar
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(115, 125, 75, 0, Math.PI * 2, true);
  ctx.stroke();

  // Username
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Arial";
  ctx.fillText(user.username, 220, 80);

  // Level info label
  ctx.fillStyle = "#e11d48"; // Ruby rose color
  ctx.font = "bold 20px Arial";
  ctx.fillText(`المستوى: ${level}`, 220, 120);

  // XP Info
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "18px Arial";
  const xpText = `${xp} / ${nextLevelXp} XP`;
  ctx.fillText(xpText, 740 - ctx.measureText(xpText).width, 120);

  // Progress bar container
  ctx.fillStyle = "#1e293b";
  drawRoundRect(ctx, 220, 135, 520, 20, 10, true, false);

  // Progress bar fill (Gradient)
  const progressRatio = Math.min(1, Math.max(0, xp / nextLevelXp));
  const fillWidth = progressRatio * 520;
  if (fillWidth > 10) {
    const barGrad = ctx.createLinearGradient(220, 135, 740, 135);
    barGrad.addColorStop(0, "#be123c");
    barGrad.addColorStop(1, "#f43f5e");
    ctx.fillStyle = barGrad;
    drawRoundRect(ctx, 220, 135, fillWidth, 20, 10, true, false);
  }

  // Elegant Currency Display
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 22px Arial";
  ctx.fillText(`💎 الرصيد: ${xb.toLocaleString()} رون`, 220, 200);

  return canvas.toBuffer("image/png");
}

export default {
  name: "p",
  category: "economy",
  data: new SlashCommandBuilder().setName("p").setDescription("عرض بروفايلك ورون الخاص بك").addUserOption((option) => option.setName("user").setDescription("العضو المراد عرض بروفايله")),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "p" || commandName === "xbp") {
        const targetUser = interaction.options.getUser("user") || user;
        const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
        const level = userRow?.level || 0;
        const xb = userRow?.xb || 0;
        const xp = userRow?.xp || 0;
        const nextLevelXp = (level + 1) * 300;
        try {
          const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
          const attachment = new AttachmentBuilder(buffer, { name: "profile.gif" });
          await interaction.reply({ files: [attachment] });
        } catch (err) {
          console.error("Profile image generation failed:", err);
          await interaction.reply({ content: "❌ فشل في إنشاء صورة البروفايل.", ephemeral: true });
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
    const commandName = "p";
    if (commandName === "p" || commandName === "xbp") {
          const targetUser = message.mentions.users.first() || message.author;
          const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(targetUser.id, guildId);
          const level = userRow?.level || 0;
          const xb = userRow?.xb || 0;
          const xp = userRow?.xp || 0;
          const nextLevelXp = (level + 1) * 300;
          try {
            const buffer = await generateProfileImage(targetUser, level, xb, xp, nextLevelXp);
            const attachment = new AttachmentBuilder(buffer, { name: "profile.gif" });
            return message.reply({ files: [attachment] });
          } catch (err) {
            console.error("Profile image generation failed:", err);
            return message.reply("❌ فشل في إنشاء صورة البروفايل.");
          }
        }
  }
};
