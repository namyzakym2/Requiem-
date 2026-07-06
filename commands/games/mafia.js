import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from "discord.js";

export default {
  name: "mafia",
  category: "games",
  data: new SlashCommandBuilder().setName("mafia").setDescription("بدء لعبة مافيا"),
  async executeInteraction(interaction, context) {
    const {
      client, db, Canvas, loadImage, GIFEncoder, GoogleGenAI, axios, jwt, nblox,
      OWNER_ID, OWNER_USERNAME, PREFIX, logEvent, logCurrencyTransaction,
      isCommandAllowed, cooldowns, evaluationStates, mafiaGames, activeGames,
      pendingTransfers, lastAzkarSent, spamMap, raidMap
    } = context;

    let { commandName, user, guildId, guild, channel } = interaction;
    if (commandName === "mafia") {
        if (mafiaGames.has(guild.id)) {
          return interaction.reply({ content: "❌ هناك لعبة مافيا جارية بالفعل في هذا السيرفر.", ephemeral: true });
        }
        const game = {
          guildId: guild.id,
          channelId: interaction.channelId,
          players: [],
          phase: "join",
          nightActions: {},
          votes: /* @__PURE__ */ new Map()
        };
        mafiaGames.set(guild.id, game);
        const embed = new EmbedBuilder().setTitle("🕵️ لعبة مافيا").setDescription("اضغط على الزر أدناه للانضمام إلى اللعبة!\nتحتاج اللعبة إلى 4 لاعبين على الأقل.").setColor(0).setThumbnail("https://i.imgur.com/8QZ8Z8Z.png").setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("mafia_join").setLabel("انضمام").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("mafia_start_game").setLabel("بدء اللعبة").setStyle(ButtonStyle.Success)
        );
        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        game.messageId = msg.id;
        game.timer = setTimeout(async () => {
          const currentGame = mafiaGames.get(guild.id);
          if (currentGame && currentGame.phase === "join") {
            if (currentGame.players.length >= 4) {
              const players = [...currentGame.players];
              const mafiaIdx = Math.floor(Math.random() * players.length);
              players[mafiaIdx].role = "mafia";
              let doctorIdx;
              do {
                doctorIdx = Math.floor(Math.random() * players.length);
              } while (doctorIdx === mafiaIdx);
              players[doctorIdx].role = "doctor";
              let detectiveIdx;
              do {
                detectiveIdx = Math.floor(Math.random() * players.length);
              } while (detectiveIdx === mafiaIdx || detectiveIdx === doctorIdx);
              players[detectiveIdx].role = "detective";
              currentGame.phase = "night";
              const roleRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("mafia_show_role").setLabel("كشف هويتي").setStyle(ButtonStyle.Primary)
              );
              const channel2 = client.channels.cache.get(currentGame.channelId);
              if (channel2) {
                await channel2.send({
                  content: "🎭 انتهى وقت الانتظار! بدأت اللعبة تلقائياً. اضغط على الزر أدناه لمعرفة هويتك.",
                  components: [roleRow]
                });
                setTimeout(() => {
                  startNightPhase(currentGame);
                }, 5e3);
              }
            } else {
              mafiaGames.delete(guild.id);
              const channel2 = client.channels.cache.get(currentGame.channelId);
              if (channel2) {
                await channel2.send("❌ تم إلغاء لعبة المافيا لعدم اكتمال عدد اللاعبين (4 لاعبين على الأقل) خلال 60 ثانية.");
              }
            }
          }
        }, 6e4);
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
    const commandName = "mafia";
    if (commandName === "mafia") {
          return message.reply("Mafia game is best played via slash commands due to its complexity. Use `/mafia` instead.");
        }
  }
};
