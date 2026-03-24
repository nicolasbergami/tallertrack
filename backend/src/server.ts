import { env } from "./config/env";
import { pool } from "./config/database";
import { runMigrations } from "./config/migrate";
import { runSeed } from "./scripts/seed.lib";
import app from "./app";

async function bootstrap() {
  // Verify DB connection on startup
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("✅ Database connection established.");
  } catch (err) {
    console.error("❌ Failed to connect to database:", err);
    process.exit(1);
  }

  // Run idempotent schema migrations (uses adminPool / BYPASSRLS)
  await runMigrations();

  // Seed inicial — solo si SEED_ON_START=true (entornos QA / staging)
  if (env.SEED_ON_START === "true") {
    const ssl = env.DATABASE_URL.includes("railway")
      ? { rejectUnauthorized: false }
      : false;
    await runSeed(env.DATABASE_URL, ssl).catch((err) =>
      console.warn("⚠️  Seed falló (no es fatal):", (err as Error).message)
    );
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 TallerTrack API running on http://localhost:${env.PORT}`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   WhatsApp    : ${env.WHATSAPP_PROVIDER}`);
    console.log(`   Tracking URL: ${env.TRACKING_BASE_URL}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await pool.end();
      console.log("DB pool closed. Bye!");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

bootstrap();
