import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
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

const formatNumber = (x) => {
  const num = Number(x);
  if (isNaN(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (abs >= 1e12) {
    return sign + (abs / 1e12).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'b';
  }
  if (abs >= 1e9) {
    return sign + (abs / 1e9).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'b';
  }
  if (abs >= 1e6) {
    return sign + (abs / 1e6).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'm';
  }
  if (abs >= 1e3) {
    return sign + (abs / 1e3).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1') + 'k';
  }
  return sign + abs.toLocaleString('en');
};

async function generateProfileImage(user, db, guildId) {
  const userRow = db.prepare("SELECT * FROM leveling WHERE userId = ? AND guildId = ?").get(user.id, guildId);
  const text_xp = userRow?.text_xp || userRow?.xp || 0;
  const voice_xp = userRow?.voice_xp || 0;
  const xb = userRow?.xb || 0;
  const voice_enabled = userRow?.voice_enabled || 0;

  // Flat 650 XP per level to match reference image math exactly
  const text_level = Math.floor(text_xp / 650);
  const current_text_xp = text_xp % 650;
  const remaining_text_xp = 650 - current_text_xp;

  const voice_level = Math.floor(voice_xp / 650);
  const current_voice_xp = voice_xp % 650;
  const remaining_voice_xp = 650 - current_voice_xp;

  const total_xp = text_xp + voice_xp;
  const highest_level = Math.max(text_level, voice_level);

  const canvas = createCanvas(1000, 390);
  const ctx = canvas.getContext("2d");

  // Elegant dark universe starry background
  const bgGrad = ctx.createLinearGradient(0, 0, 1000, 390);
  bgGrad.addColorStop(0, "#07080d");
  bgGrad.addColorStop(0.5, "#0d0e17");
  bgGrad.addColorStop(1, "#121422");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1000, 390);

  // Outer glowing borders
  const outerGrad = ctx.createLinearGradient(0, 0, 1000, 390);
  outerGrad.addColorStop(0, "rgba(88, 101, 242, 0.25)");
  outerGrad.addColorStop(0.5, "rgba(217, 70, 239, 0.25)");
  outerGrad.addColorStop(1, "rgba(244, 63, 94, 0.25)");
  ctx.strokeStyle = outerGrad;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 996, 386);

  // Card helper functions
  const drawPillRow = (x, y, width, height, label, value, valueColor) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    drawRoundRect(ctx, x, y, width, height, 10, true, true);

    // Label on the right
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "right";
    ctx.fillText(label, x + width - 15, y + height / 2 + 5);

    // Value on the left
    ctx.fillStyle = valueColor || "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(value, x + 15, y + height / 2 + 5);
  };

  const drawProgressBarRow = (x, y, width, label, current, total, barColor) => {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(label, x + width - 15, y + 14);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${current}/${total}`, x + 15, y + 14);

    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    drawRoundRect(ctx, x + 15, y + 22, width - 30, 8, 4, true, false);

    const ratio = Math.min(1, Math.max(0, current / total));
    if (ratio > 0) {
      ctx.fillStyle = barColor || "#38bdf8";
      drawRoundRect(ctx, x + 15, y + 22, (width - 30) * ratio, 8, 4, true, false);
    }
  };

  const cardWidth = 300;
  const cardHeight = 350;
  const cardY = 20;

  // CARD 1: نقاط اللفلات (Level Points)
  const x1 = 30;
  const card1Grad = ctx.createLinearGradient(x1, cardY, x1 + cardWidth, cardY + cardHeight);
  card1Grad.addColorStop(0, "rgba(59, 130, 246, 0.12)");
  card1Grad.addColorStop(1, "rgba(99, 102, 241, 0.02)");
  ctx.fillStyle = card1Grad;
  ctx.strokeStyle = "rgba(59, 130, 246, 0.25)";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, x1, cardY, cardWidth, cardHeight, 18, true, true);

  // Title
  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("نقاط اللفلات", x1 + cardWidth / 2, cardY + 32);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath(); ctx.moveTo(x1 + 30, cardY + 44); ctx.lineTo(x1 + cardWidth - 30, cardY + 44); ctx.stroke();

  // Rows
  drawPillRow(x1 + 15, cardY + 60, cardWidth - 30, 32, "الكتابي XP", text_xp.toString(), "#10b981");
  drawPillRow(x1 + 15, cardY + 102, cardWidth - 30, 32, "الصوتي XP", voice_xp.toString(), "#06b6d4");
  drawPillRow(x1 + 15, cardY + 144, cardWidth - 30, 32, "XP إجمالي", total_xp.toString(), "#f43f5e");
  drawPillRow(x1 + 15, cardY + 186, cardWidth - 30, 32, "المتبقي للكتابي", remaining_text_xp.toString(), "#f59e0b");
  drawPillRow(x1 + 15, cardY + 228, cardWidth - 30, 32, "المتبقي للصوتي", remaining_voice_xp.toString(), "#a855f7");

  // CARD 2: المستويات والتقدم (Levels and Progress)
  const x2 = 350;
  const card2Grad = ctx.createLinearGradient(x2, cardY, x2 + cardWidth, cardY + cardHeight);
  card2Grad.addColorStop(0, "rgba(168, 85, 247, 0.12)");
  card2Grad.addColorStop(1, "rgba(236, 72, 153, 0.02)");
  ctx.fillStyle = card2Grad;
  ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, x2, cardY, cardWidth, cardHeight, 18, true, true);

  ctx.fillStyle = "#c084fc";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("المستويات والتقدم", x2 + cardWidth / 2, cardY + 32);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath(); ctx.moveTo(x2 + 30, cardY + 44); ctx.lineTo(x2 + cardWidth - 30, cardY + 44); ctx.stroke();

  drawPillRow(x2 + 15, cardY + 60, cardWidth - 30, 32, "المستوى الكتابي", text_level.toString(), "#ffffff");
  drawPillRow(x2 + 15, cardY + 102, cardWidth - 30, 32, "المستوى الصوتي", voice_level.toString(), "#ffd700");
  drawPillRow(x2 + 15, cardY + 144, cardWidth - 30, 32, "التجميع الصوتي", voice_enabled === 1 ? "مفعل" : "غير مفعل", voice_enabled === 1 ? "#10b981" : "#ef4444");
  
  drawProgressBarRow(x2 + 15, cardY + 192, cardWidth - 30, "التقدم الكتابي", current_text_xp, 650, "#38bdf8");
  drawProgressBarRow(x2 + 15, cardY + 248, cardWidth - 30, "التقدم الصوتي", current_voice_xp, 650, "#a78bfa");

  // CARD 3: البروفايل ورصيد الفلوس (Profile & Balance Card)
  const x3 = 670;
  const card3Grad = ctx.createLinearGradient(x3, cardY, x3 + cardWidth, cardY + cardHeight);
  card3Grad.addColorStop(0, "rgba(236, 72, 153, 0.12)");
  card3Grad.addColorStop(1, "rgba(244, 63, 94, 0.02)");
  ctx.fillStyle = card3Grad;
  ctx.strokeStyle = "rgba(236, 72, 153, 0.25)";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, x3, cardY, cardWidth, cardHeight, 18, true, true);

  // Load Avatar
  let avatarImg;
  try {
    const avatarURL = user.displayAvatarURL({ extension: "png", size: 128 });
    avatarImg = await loadImage(avatarURL);
  } catch (err) {
    avatarImg = await loadImage("https://cdn.discordapp.com/embed/avatars/0.png");
  }

  // Circular Avatar clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(x3 + cardWidth / 2, cardY + 70, 38, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImg, x3 + cardWidth / 2 - 38, cardY + 32, 76, 76);
  ctx.restore();

  // Glowing ring around avatar
  const ringGrad = ctx.createLinearGradient(x3 + cardWidth/2 - 38, cardY + 32, x3 + cardWidth/2 + 38, cardY + 108);
  ringGrad.addColorStop(0, "#00f2fe");
  ringGrad.addColorStop(1, "#4facfe");
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x3 + cardWidth / 2, cardY + 70, 38, 0, Math.PI * 2, true);
  ctx.stroke();

  // Username text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(user.username, x3 + cardWidth / 2, cardY + 124);

  // Rows under avatar
  drawPillRow(x3 + 15, cardY + 144, cardWidth - 30, 32, "XP إجمالي", total_xp.toString(), "#f43f5e");
  drawPillRow(x3 + 15, cardY + 186, cardWidth - 30, 32, "المستوى الأعلى", highest_level.toString(), "#10b981");
  drawPillRow(x3 + 15, cardY + 228, cardWidth - 30, 32, "رصيد الفلوس", `${formatNumber(xb)} رون`, "#ffd700");

  return canvas.toBuffer("image/png");
}

export default {
  name: "p",
  category: "economy",
  data: new SlashCommandBuilder().setName("p").setDescription("عرض بروفايلك ورون الخاص بك").addUserOption((option) => option.setName("user").setDescription("العضو المراد عرض بروفايله")),
  async executeInteraction(interaction, context) {
    const { db } = context;
    let { user, guildId } = interaction;
    const targetUser = interaction.options.getUser("user") || user;
    await interaction.deferReply();
    try {
      const buffer = await generateProfileImage(targetUser, db, guildId);
      const attachment = new AttachmentBuilder(buffer, { name: "profile.png" });
      await interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error("Profile image generation failed:", err);
      await interaction.editReply({ content: "❌ فشل في إنشاء صورة البروفايل.", ephemeral: true });
    }
  },
  async executeMessage(message, args, context) {
    const { db } = context;
    const guildId = message.guild.id;
    const targetUser = message.mentions.users.first() || message.author;
    try {
      const buffer = await generateProfileImage(targetUser, db, guildId);
      const attachment = new AttachmentBuilder(buffer, { name: "profile.png" });
      return message.reply({ files: [attachment] });
    } catch (err) {
      console.error("Profile image generation failed:", err);
      return message.reply("❌ فشل في إنشاء صورة البروفايل.");
    }
  }
};
