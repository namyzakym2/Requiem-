import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { Collection } from "discord.js";

// Helper to recursively ensure all slash command builders, subcommands, and options have a description
function ensureDescriptions(builder) {
  if (!builder) return;
  
  const defaultDesc = "وصف تلقائي للنظام"; // Default description in Arabic
  
  if (typeof builder.setDescription === "function") {
    if (!builder.description || builder.description.trim() === "") {
      builder.setDescription(builder.name || defaultDesc);
    }
  } else {
    // Handle plain objects
    if (!builder.description || (typeof builder.description === "string" && builder.description.trim() === "")) {
      builder.description = builder.name || defaultDesc;
    }
  }

  if (builder.options && Array.isArray(builder.options)) {
    for (const option of builder.options) {
      ensureDescriptions(option);
    }
  }
}

// Helper to recursively validate names and structures for Discord API compliance
function isValidSlashStructure(obj) {
  if (!obj.name || !/^[\w-]{1,32}$/.test(obj.name)) {
    return false;
  }
  if (obj.options && Array.isArray(obj.options)) {
    for (const opt of obj.options) {
      if (!isValidSlashStructure(opt)) return false;
    }
  }
  return true;
}

export async function loadCommands() {
  const commands = new Collection();
  const slashCommandsData = [];
  const commandsPath = path.join(process.cwd(), "commands");

  if (!fs.existsSync(commandsPath)) return { commands, slashCommandsData };

  const getFiles = (dir) => {
    let files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        files = files.concat(getFiles(fullPath));
      } else if (item.endsWith(".js")) {
        files.push(fullPath);
      }
    }
    return files;
  };

  const commandFiles = getFiles(commandsPath);

  for (const filePath of commandFiles) {
    const fileUrl = pathToFileURL(filePath).href;
    try {
      const module = await import(fileUrl);
      const command = module.default || module;

      if (command && command.name) {
        // Use the relative folder name as category if possible, or just "general"
        const relativePath = path.relative(commandsPath, filePath);
        command.category = path.dirname(relativePath).split(path.sep)[0] || "general";
        
        commands.set(command.name.toLowerCase(), command);

        if (command.aliases && Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            commands.set(alias.toLowerCase(), command);
          }
        }

        if (command.data) {
          try {
            ensureDescriptions(command.data);
            const dataJson = typeof command.data.toJSON === "function" ? command.data.toJSON() : command.data;
            
            // Validate name and options structure (must be ^[\w-]{1,32}$)
            if (!isValidSlashStructure(dataJson)) {
              console.warn(`⚠️ Skipping slash command "${command.name}" because its structure (name or options) is invalid for Discord API.`);
              continue;
            }

            // Check for duplicates
            const existing = slashCommandsData.find(c => c.name === dataJson.name);
            if (existing) {
              console.warn(`⚠️ Skipping duplicate slash command name: "${dataJson.name}" from ${filePath}`);
              continue;
            }

            slashCommandsData.push(dataJson);
          } catch (err) {
            console.error(`⚠️ Error compiling slash command JSON for ${command.name}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`Error loading command ${filePath}:`, err);
    }
  }

  if (slashCommandsData.length > 100) {
    console.warn(`⚠️ Warning: Found ${slashCommandsData.length} slash commands, but Discord only allows 100 global commands. Truncating to 100.`);
    slashCommandsData.splice(100);
  }

  console.log(`Loaded ${commands.size} commands/aliases. Compiled ${slashCommandsData.length} slash commands.`);
  return { commands, slashCommandsData };
}

