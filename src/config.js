import "dotenv/config";

export const config = {
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://cool:cool@localhost:5432/cool_cms",
  corsOrigin: process.env.CORS_ORIGIN || true,
  autoMigrate: process.env.AUTO_MIGRATE !== "false",
};
