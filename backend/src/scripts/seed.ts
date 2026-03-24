import { runSeed } from "./seed.lib";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL no está definida");
  process.exit(1);
}

const ssl =
  process.env.NODE_ENV === "production" || DATABASE_URL.includes("railway")
    ? { rejectUnauthorized: false }
    : false;

runSeed(DATABASE_URL, ssl)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed falló:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
