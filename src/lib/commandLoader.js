import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { Collection } from "discord.js";

export async function loadCommands() {
  const commands = new Collection();
  const slashCommandsData = [];
  const commandsPath = path.join(process.cwd(), "commands");

  if (!fs.existsSync(commandsPath)) return { commands, slashCommandsData };

  const categories = fs.readdirSync(commandsPath);
  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      const fileUrl = pathToFileURL(filePath).href;
      const module = await import(fileUrl);
      const command = module.default || module;

      if (command && command.name) {
        command.category = category;
        commands.set(command.name.toLowerCase(), command);

        if (command.aliases && Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            commands.set(alias.toLowerCase(), command);
          }
        }

        if (command.data) {
          const dataJson = typeof command.data.toJSON === "function" ? command.data.toJSON() : command.data;
          slashCommandsData.push(dataJson);
        }
      }
    }
  }

  console.log(`Loaded ${commands.size} commands/aliases across ${categories.length} categories.`);
  return { commands, slashCommandsData };
}
