import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

async function handleBalance(ctx, user, db, isSlash) {
  const row = db.prepare("SELECT amount FROM credits WHERE userId = ?").get(user.id);
  const balance = row?.amount || 0;

  const responseText = user.id === (ctx.user?.id || ctx.author?.id)
    ? `💳 | **رصيدك الحالي هو: \`${balance.toLocaleString()}\` كريدت.**`
    : `💳 | **رصيد ${user.username} الحالي هو: \`${balance.toLocaleString()}\` كريدت.**`;

  return isSlash 
    ? ctx.reply({ content: responseText }) 
    : ctx.reply({ content: responseText });
}

async function handleDaily(ctx, user, db, isSlash) {
  const row = db.prepare("SELECT lastDaily, amount FROM credits WHERE userId = ?").get(user.id);
  const now = new Date();
  
  if (row && row.lastDaily) {
    const lastDailyDate = new Date(row.lastDaily);
    const diffMs = now.getTime() - lastDailyDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      const remainingMs = (24 * 60 * 60 * 1000) - diffMs;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const errorText = `❌ | **يمكنك الحصول على مكافأتك اليومية بعد: \`${hours} ساعة و ${minutes} دقيقة و ${seconds} ثانية\`**`;
      return isSlash 
        ? ctx.reply({ content: errorText, ephemeral: true }) 
        : ctx.reply({ content: errorText });
    }
  }

  // Generate random daily reward between 1000 and 5000
  const reward = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;

  db.prepare("INSERT INTO credits (userId, amount, lastDaily) VALUES (?, ?, ?) ON CONFLICT(userId) DO UPDATE SET amount = amount + ?, lastDaily = ?")
    .run(user.id, reward, now.toISOString(), reward, now.toISOString());

  const successText = `🎉 | **لقد حصلت على مكافأتك اليومية: \`+${reward.toLocaleString()}\` كريدت!**`;
  return isSlash 
    ? ctx.reply({ content: successText }) 
    : ctx.reply({ content: successText });
}

async function handleTransfer(ctx, sender, recipient, amount, db, isSlash) {
  if (sender.id === recipient.id) {
    const errorText = "❌ | **لا يمكنك تحويل الكريدت لنفسك.**";
    return isSlash ? ctx.reply({ content: errorText, ephemeral: true }) : ctx.reply({ content: errorText });
  }

  if (recipient.bot) {
    const errorText = "❌ | **لا يمكنك تحويل الكريدت إلى بوت.**";
    return isSlash ? ctx.reply({ content: errorText, ephemeral: true }) : ctx.reply({ content: errorText });
  }

  const senderRow = db.prepare("SELECT amount FROM credits WHERE userId = ?").get(sender.id);
  const senderBalance = senderRow?.amount || 0;

  if (senderBalance < amount) {
    const errorText = `❌ | **رصيدك الحالي هو \`${senderBalance.toLocaleString()}\` كريدت فقط. لا يمكنك تحويل \`${amount.toLocaleString()}\` كريدت.**`;
    return isSlash ? ctx.reply({ content: errorText, ephemeral: true }) : ctx.reply({ content: errorText });
  }

  // Generate a random 4-digit verification code
  const code = Math.floor(1000 + Math.random() * 9000);
  const fee = Math.floor(amount * 0.05);
  const netAmount = amount - fee;

  const promptText = `💵 | **يرجى كتابة رمز التأكيد التالي لإتمام عملية التحويل: \`${code}\`**\n` +
                     `👥 **المستلم:** ${recipient}\n` +
                     `💰 **المبلغ المطلوب:** \`${amount.toLocaleString()}\`\n` +
                     `🧾 **الرسوم (5%):** \`${fee.toLocaleString()}\`\n` +
                     `🎁 **المبلغ النهائي المستلم:** \`${netAmount.toLocaleString()}\``;

  const reply = isSlash 
    ? await ctx.reply({ content: promptText, fetchReply: true }) 
    : await ctx.reply({ content: promptText });

  const channel = ctx.channel;
  const filter = m => m.author.id === sender.id && m.content.trim() === String(code);
  const collector = channel.createMessageCollector({ filter, time: 15000, max: 1 });

  collector.on("collect", async (m) => {
    // Delete the confirmation message typed by user if possible
    await m.delete().catch(() => {});

    // Re-verify balance in case they spent it in the last 15 seconds
    const currentSenderRow = db.prepare("SELECT amount FROM credits WHERE userId = ?").get(sender.id);
    const currentSenderBalance = currentSenderRow?.amount || 0;
    if (currentSenderBalance < amount) {
      const errorMsg = "❌ | **فشلت العملية: لم يعد لديك رصيد كافٍ.**";
      if (isSlash) {
        await ctx.editReply({ content: errorMsg }).catch(() => {});
      } else {
        await reply.edit({ content: errorMsg }).catch(() => {});
      }
      return;
    }

    // Process DB changes
    db.prepare("INSERT INTO credits (userId, amount) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET amount = amount - ?").run(sender.id, -amount, amount);
    db.prepare("INSERT INTO credits (userId, amount) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET amount = amount + ?").run(recipient.id, netAmount, netAmount);

    const successMsg = `✅ | **تم تحويل \`${netAmount.toLocaleString()}\` كريدت إلى ${recipient} بنجاح (بعد خصم 5% رسوم).**`;
    if (isSlash) {
      await ctx.editReply({ content: successMsg }).catch(() => {});
    } else {
      await reply.edit({ content: successMsg }).catch(() => {});
    }
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      const timeoutMsg = "❌ | **تم إلغاء عملية التحويل لعدم إدخال رمز التأكيد في الوقت المناسب.**";
      if (isSlash) {
        await ctx.editReply({ content: timeoutMsg }).catch(() => {});
      } else {
        await reply.edit({ content: timeoutMsg }).catch(() => {});
      }
    }
  });
}

export default {
  name: "credits",
  aliases: ["credit", "كريدت", "كريديت", "كردت"],
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("credits")
    .setDescription("💳 عرض رصيدك من الكريدت، تحويل كريدت، أو المطالبة بالمكافأة اليومية")
    .addUserOption((option) =>
      option.setName("user")
        .setDescription("المستخدم المراد التحقق من رصيده أو تحويل الكريدت إليه")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName("amount")
        .setDescription("المبلغ المراد تحويله (اترك فارغاً لعرض الرصيد فقط)")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option.setName("daily")
        .setDescription("تحديد true للمطالبة بالمكافأة اليومية من الكريدت")
        .setRequired(false)
    ),

  async executeInteraction(interaction, context) {
    const { db } = context;
    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const isDaily = interaction.options.getBoolean("daily");

    if (isDaily) {
      return await handleDaily(interaction, interaction.user, db, true);
    }

    if (targetUser && amount) {
      return await handleTransfer(interaction, interaction.user, targetUser, amount, db, true);
    }

    // Default: View balance
    const userToView = targetUser || interaction.user;
    return await handleBalance(interaction, userToView, db, true);
  },

  async executeMessage(message, args, context) {
    const { db } = context;

    if (args.length > 0 && args[0].toLowerCase() === "daily") {
      return await handleDaily(message, message.author, db, false);
    }

    if (args.length > 0) {
      // Check if first arg is a mention or ID
      const targetUser = message.mentions.users.first();
      if (targetUser) {
        const amountStr = args[1];
        if (amountStr) {
          const amount = parseInt(amountStr);
          if (isNaN(amount) || amount <= 0) {
            return message.reply("❌ يرجى إدخال مبلغ تحويل صحيح وصالح.");
          }
          return await handleTransfer(message, message.author, targetUser, amount, db, false);
        } else {
          return await handleBalance(message, targetUser, db, false);
        }
      } else {
        // Check if first arg is user ID
        const userId = args[0];
        const userFetch = await message.client.users.fetch(userId).catch(() => null);
        if (userFetch) {
          const amountStr = args[1];
          if (amountStr) {
            const amount = parseInt(amountStr);
            if (isNaN(amount) || amount <= 0) {
              return message.reply("❌ يرجى إدخال مبلغ تحويل صحيح وصالح.");
            }
            return await handleTransfer(message, message.author, userFetch, amount, db, false);
          } else {
            return await handleBalance(message, userFetch, db, false);
          }
        }
      }
    }

    // Default: View balance
    return await handleBalance(message, message.author, db, false);
  }
};
