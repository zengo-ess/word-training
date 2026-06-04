import { loadConfig } from "./config.js";
import { createConnection } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { createApp } from "./app.js";

const config = loadConfig(process.env);

const dbFile = process.env.DB_FILE ?? "data/word-training.sqlite";
const db = createConnection(dbFile);
runMigrations(db);

const app = createApp(config, db);
app.listen(config.port, () => {
  console.log(`Сервер запущен на порту ${config.port}`);
});
