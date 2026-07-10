import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MARKET_PATH = path.join(__dirname, "data", "market.json");
const UPDATE_MS = 5 * 60 * 1000;

export function updatePrices() {
  try {
    if (!fs.existsSync(MARKET_PATH)) return;
    const fileContent = fs.readFileSync(MARKET_PATH, "utf8");
    if (!fileContent.trim()) return;
    const m = JSON.parse(fileContent);

    for (const key of ["stocks", "properties"]) {
      if (!m[key]) continue;
      for (const [name, data] of Object.entries(m[key])) {
        const vol = data.vol || 0.02;
        const change = (Math.random() - 0.48) * vol;
        let np = Math.round(data.price * (1 + change) * 100) / 100;

        const floor = key === "stocks" ? 1 : 1000;
        np = Math.max(floor, np);
        m[key][name].price = np;
      }
    }

    m.lastUpdate = Date.now();
    fs.writeFileSync(MARKET_PATH, JSON.stringify(m, null, 2));
  } catch (e) {
    console.error("[سوق] Update error:", e.message);
  }
}

export function startMarketEngine() {
  updatePrices();
  setInterval(updatePrices, UPDATE_MS);
  console.log("[سوق] Price engine started — updates every 5 min");
}
