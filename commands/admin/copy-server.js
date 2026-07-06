import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "copy-server",
  category: "admin",
  data: new SlashCommandBuilder().setName("copy-server").setDescription("نسخ هيكل سيرفر آخر (رتب وقنوات)").addStringOption((option) => option.setName("source_id").setDescription("ID السيرفر المراد النسخ منه").setRequired(true)),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "copy-server") {
        if (interaction.user.id !== guild.ownerId && interaction.user.id !== OWNER_ID && interaction.user.username !== OWNER_USERNAME) {
          return interaction.reply({ content: "❌ هذا الأمر مخصص لصاحب السيرفر فقط.", ephemeral: true });
        }
        const sourceId = interaction.options.getString("source_id");
        const sourceGuild = client.guilds.cache.get(sourceId);
        if (!sourceGuild) {
          return interaction.reply({ content: "❌ البوت ليس عضواً في السيرفر المصدري.", ephemeral: true });
        }
        await interaction.deferReply();
        await interaction.editReply("⏳ جاري البدء في نسخ السيرفر... (0%)");
        try {
          await interaction.editReply("⏳ جاري نسخ إعدادات السيرفر... (10%)").catch(() => null);
          const iconUrl = sourceGuild.iconURL({ extension: "png", size: 1024 });
          const bannerUrl = sourceGuild.bannerURL({ extension: "png", size: 1024 });
          let iconBuffer = null;
          let bannerBuffer = null;
          if (iconUrl) {
            try {
              const response = await axios.get(iconUrl, { responseType: "arraybuffer" });
              iconBuffer = Buffer.from(response.data);
            } catch (e) {
              console.error("Failed to fetch icon:", e);
            }
          }
          if (bannerUrl) {
            try {
              const response = await axios.get(bannerUrl, { responseType: "arraybuffer" });
              bannerBuffer = Buffer.from(response.data);
            } catch (e) {
              console.error("Failed to fetch banner:", e);
            }
          }
          await guild.edit({
            name: sourceGuild.name,
            verificationLevel: sourceGuild.verificationLevel,
            defaultMessageNotifications: sourceGuild.defaultMessageNotifications,
            explicitContentFilter: sourceGuild.explicitContentFilter,
            afkChannel: sourceGuild.afkChannelId ? guild.channels.cache.get(sourceGuild.afkChannelId) : null,
            afkTimeout: sourceGuild.afkTimeout,
            systemChannel: sourceGuild.systemChannelId ? guild.channels.cache.get(sourceGuild.systemChannelId) : null,
            icon: iconBuffer,
            banner: bannerBuffer
          }).catch((err) => console.error("Failed to copy server settings:", err));
          await interaction.editReply("🧹 جاري تنظيف الرتب القديمة... (20%)").catch(() => null);
          const currentRoles = await guild.roles.fetch();
          for (const role of currentRoles.values()) {
            if (role.name !== "@everyone" && !role.managed && role.editable && role.id !== guild.id) {
              await role.delete().catch(() => null);
            }
          }
          await interaction.editReply("🧹 جاري تنظيف القنوات القديمة... (30%)").catch(() => null);
          const currentChannels = await guild.channels.fetch();
          for (const channel2 of currentChannels.values()) {
            if (channel2 && channel2.deletable && channel2.id !== interaction.channelId) {
              await channel2.delete().catch(() => null);
            }
          }
          await interaction.editReply("🛡️ جاري نسخ الرتب... (50%)").catch(() => null);
          const sourceRoles = (await sourceGuild.roles.fetch()).sort((a, b) => b.position - a.position);
          const roleMap = /* @__PURE__ */ new Map();
          const createdRoles = [];
          for (const role of sourceRoles.values()) {
            if (role.name !== "@everyone" && !role.managed) {
              const roleData = {
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions,
                mentionable: role.mentionable,
                reason: "Server Copy"
              };
              if (role.icon) {
                try {
                  const iconUrl = role.iconURL({ extension: "png" });
                  if (iconUrl) {
                    const response = await axios.get(iconUrl, { responseType: "arraybuffer" });
                    roleData.icon = Buffer.from(response.data);
                  }
                } catch (e) {
                  console.error(`Failed to fetch role icon for ${role.name}:`, e);
                }
              } else if (role.unicodeEmoji) {
                roleData.unicodeEmoji = role.unicodeEmoji;
              }
              const newRole = await guild.roles.create(roleData).catch((err) => {
                console.error(`Failed to create role ${role.name}:`, err);
                return null;
              });
              if (newRole) {
                roleMap.set(role.id, newRole.id);
                createdRoles.push(newRole);
              }
            }
          }
          if (createdRoles.length > 0) {
            const sortedCreatedRoles = [...createdRoles].sort((a, b) => {
              const posA = sourceRoles.get([...roleMap.entries()].find(([oldId, newId]) => newId === a.id)?.[0])?.position || 0;
              const posB = sourceRoles.get([...roleMap.entries()].find(([oldId, newId]) => newId === b.id)?.[0])?.position || 0;
              return posA - posB;
            });
            const positions = sortedCreatedRoles.map((role, index) => ({
              role: role.id,
              position: index + 1
            }));
            await guild.roles.setPositions(positions).catch((err) => console.error("Failed to set role positions:", err));
          }
          await interaction.editReply("📂 جاري نسخ القنوات والفئات... (70%)").catch(() => null);
          const sourceChannels = await sourceGuild.channels.fetch();
          const categoryMap = /* @__PURE__ */ new Map();
          const channelMap = /* @__PURE__ */ new Map();
          const categories = sourceChannels.filter((c) => c?.type === ChannelType.GuildCategory).sort((a, b) => (a?.position || 0) - (b?.position || 0));
          for (const cat of categories.values()) {
            if (!cat) continue;
            const newCat = await guild.channels.create({
              name: cat.name,
              type: ChannelType.GuildCategory,
              position: cat.position,
              permissionOverwrites: cat.permissionOverwrites.cache.map((po) => ({
                id: roleMap.get(po.id) || po.id,
                allow: po.allow,
                deny: po.deny,
                type: po.type
              }))
            }).catch(() => null);
            if (newCat) {
              categoryMap.set(cat.id, newCat.id);
              channelMap.set(cat.id, newCat.id);
            }
          }
          const otherChannels = sourceChannels.filter((c) => c?.type !== ChannelType.GuildCategory).sort((a, b) => (a?.position || 0) - (b?.position || 0));
          for (const ch of otherChannels.values()) {
            if (!ch) continue;
            const channelData = {
              name: ch.name,
              type: ch.type,
              parent: ch.parentId ? categoryMap.get(ch.parentId) : null,
              position: ch.position,
              permissionOverwrites: ch.permissionOverwrites.cache.map((po) => ({
                id: roleMap.get(po.id) || po.id,
                allow: po.allow,
                deny: po.deny,
                type: po.type
              }))
            };
            if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
              channelData.topic = ch.topic || null;
              channelData.nsfw = ch.nsfw || false;
              channelData.rateLimitPerUser = ch.rateLimitPerUser || 0;
              channelData.defaultAutoArchiveDuration = ch.defaultAutoArchiveDuration || null;
            } else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
              channelData.bitrate = ch.bitrate || 64e3;
              channelData.userLimit = ch.userLimit || 0;
              channelData.rtcRegion = ch.rtcRegion || null;
              channelData.videoQualityMode = ch.videoQualityMode || null;
            } else if (ch.type === ChannelType.GuildForum) {
              channelData.topic = ch.topic || null;
              channelData.nsfw = ch.nsfw || false;
              channelData.rateLimitPerUser = ch.rateLimitPerUser || 0;
              channelData.defaultThreadRateLimitPerUser = ch.defaultThreadRateLimitPerUser || 0;
            }
            const newCh = await guild.channels.create(channelData).catch(() => null);
            if (newCh) channelMap.set(ch.id, newCh.id);
          }
          await interaction.editReply("🎫 جاري نسخ الاستكرات... (80%)").catch(() => null);
          const sourceStickers = await sourceGuild.stickers.fetch().catch(() => /* @__PURE__ */ new Map());
          for (const sticker of sourceStickers.values()) {
            await guild.stickers.create({ file: sticker.url, name: sticker.name, tags: sticker.tags || "sticker" }).catch(() => null);
          }
          await interaction.editReply("⚙️ جاري نسخ إعدادات البوت... (90%)").catch(() => null);
          const settingTables = [
            { name: "protection_settings", pkey: "guildId", roleCols: ["verifiedRoleId"], chanCols: ["logChannel"] },
            { name: "welcome_settings", pkey: "guildId", chanCols: ["channelId"] },
            { name: "leveling_settings", pkey: "guildId", chanCols: ["channelId"] },
            { name: "auto_roles", pkey: "guildId", roleCols: ["roleId"] },
            { name: "badwords", pkey: "guildId" },
            { name: "auto_responses", pkey: "guildId" },
            { name: "apply_settings", pkey: "guildId", chanCols: ["channelId"], roleCols: ["roleId", "staffRoleId"] },
            { name: "suggestion_settings", pkey: "guildId", chanCols: ["channelId"] },
            { name: "evaluation_settings", pkey: "guildId", chanCols: ["channelId"] },
            { name: "azkar_settings", pkey: "guildId", chanCols: ["channelId"] },
            { name: "custom_azkar", pkey: "guildId" },
            { name: "currency_log_settings", pkey: "guildId", chanCols: ["channelId"] },
            { name: "bonus_role_settings", pkey: "guildId", roleCols: ["maxRoleId", "baseRoleId"] },
            { name: "bonus_roles", pkey: "guildId", roleCols: ["roleId"] },
            { name: "logging_settings", pkey: "guildId", chanCols: ["channelId"] },
            { name: "whitelisted_bots", pkey: "guildId" },
            { name: "ticket_categories", pkey: "guildId", roleCols: ["roleId"] },
            { name: "command_permissions", pkey: "guildId", chanCols: ["channelId"] },
            { name: "aliases", pkey: "guildId" }
          ];
          for (const table of settingTables) {
            const rows = db.prepare(`SELECT * FROM ${table.name} WHERE guildId = ?`).all(sourceGuild.id);
            if (rows.length > 0) {
              db.prepare(`DELETE FROM ${table.name} WHERE guildId = ?`).run(guild.id);
              for (const row of rows) {
                const newRow = { ...row, guildId: guild.id };
                if (table.roleCols) {
                  for (const col of table.roleCols) {
                    if (newRow[col]) newRow[col] = roleMap.get(newRow[col]) || newRow[col];
                  }
                }
                if (table.chanCols) {
                  for (const col of table.chanCols) {
                    if (newRow[col]) newRow[col] = channelMap.get(newRow[col]) || newRow[col];
                  }
                }
                if (table.name === "bonus_role_settings" && newRow.excludedRoleIds) {
                  try {
                    const ids = JSON.parse(newRow.excludedRoleIds);
                    const newIds = ids.map((id) => roleMap.get(id) || id);
                    newRow.excludedRoleIds = JSON.stringify(newIds);
                  } catch (e) {
                  }
                }
                const columns = Object.keys(newRow);
                const placeholders = columns.map(() => "?").join(", ");
                const values = Object.values(newRow);
                db.prepare(`INSERT INTO ${table.name} (${columns.join(", ")}) VALUES (${placeholders})`).run(...values);
              }
            }
          }
          if (sourceGuild.afkChannelId || sourceGuild.systemChannelId) {
            await guild.edit({
              afkChannel: sourceGuild.afkChannelId ? channelMap.get(sourceGuild.afkChannelId) : null,
              systemChannel: sourceGuild.systemChannelId ? channelMap.get(sourceGuild.systemChannelId) : null
            }).catch(() => null);
          }
          await interaction.editReply("✅ تم نسخ السيرفر بالكامل بما في ذلك الإعدادات والاستكرات! (100%)").catch(() => null);
          const sourceMembers = await sourceGuild.members.fetch();
          const bots = sourceMembers.filter((m) => m.user.bot && m.id !== client.user?.id);
          if (bots.size > 0) {
            const botList = bots.map((b) => `• **${b.user.tag}**
[اضغط هنا لدعوة البوت](https://discord.com/api/oauth2/authorize?client_id=${b.id}&permissions=8&scope=bot%20applications.commands)`).join("\n\n");
            const botEmbed = new EmbedBuilder().setTitle("🤖 البوتات المكتشفة في السيرفر المصدري").setDescription("لا يمكن للبوتات الانتقال تلقائياً بسبب قيود ديسكورد، ولكن يمكنك دعوتهم يدوياً من الروابط التالية:\n\n" + (botList.length > 2e3 ? botList.substring(0, 1997) + "..." : botList)).setColor("#5865F2").setFooter({ text: "ملاحظة: تم إنشاء روابط الدعوة بصلاحية Administrator لضمان عمل البوتات بشكل صحيح." });
            await interaction.followUp({ embeds: [botEmbed] });
          }
          await interaction.followUp("⚠️ سيتم حذف هذه القناة خلال 30 ثانية لتنظيف السيرفر تماماً.");
          setTimeout(async () => {
            try {
              const channel2 = interaction.channel;
              if (channel2 && channel2.deletable) {
                await channel2.delete().catch(() => null);
              }
            } catch (e) {
            }
          }, 3e4);
        } catch (err) {
          console.error("Error during server copy:", err);
          await interaction.followUp("❌ حدث خطأ أثناء نسخ السيرفر.");
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
    const commandName = "copy-server";
    if (commandName === "copy-server") {
          if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("Admin only.");
          }
          return message.reply("Copy Server is a complex operation. Please use the slash command `/copy-server` to initiate it safely.");
        }
  }
};
