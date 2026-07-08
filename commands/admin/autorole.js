import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../src/lib/db.js";

export default {
  name: "autorole",
  category: "admin",
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("🛡️ ضبط الرتب التلقائية")
    .addRoleOption(o => o.setName("رتبة").setDescription("الرتبة المعطاة").setRequired(true)),
  async executeInteraction(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: "ليس لديك صلاحية.", ephemeral: true });
    const role = interaction.options.getRole("رتبة");
    db.prepare("INSERT OR REPLACE INTO autorole_configs (guildId, roleId) VALUES (?, ?)").run(interaction.guildId, role.id);
    return interaction.reply({ content: `✅ تم ضبط الرتبة التلقائية إلى ${role.name}` });
  }
};
