/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/migrate.js";
import {
  createUser,
  getUser,
  getUserByName,
  listUsers,
  toPublicUser,
  updateUserSettings,
} from "../users.repository.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  runMigrations(db);
  return db;
}

describe("users.repository", () => {
  it("создаёт пользователя и находит по id и имени", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "salt:hash");
    expect(getUser(db, user.id)?.name).toBe("Женя");
    expect(getUserByName(db, "Женя")?.id).toBe(user.id);
  });

  it("listUsers отдаёт всех без password_hash", () => {
    const db = freshDb();
    createUser(db, "А", "x:y");
    createUser(db, "Б", "x:y");
    const users = listUsers(db);
    expect(users).toHaveLength(2);
    expect(users[0]).not.toHaveProperty("password_hash");
  });

  it("дубль имени бросает ошибку", () => {
    const db = freshDb();
    createUser(db, "Женя", "x:y");
    expect(() => createUser(db, "Женя", "x:y")).toThrow();
  });

  it("новый пользователь по умолчанию изучает английский", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    expect(user.language).toBe("en");
  });

  it("updateUserSettings меняет язык изучения", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    const updated = updateUserSettings(db, user.id, { language: "de" });
    expect(updated?.language).toBe("de");
    expect(getUser(db, user.id)?.language).toBe("de");
  });

  it("у нового пользователя дефолтные настройки тренажёра", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    expect(user.daily_goal).toBe(20);
    expect(user.tts_enabled).toBe(1);
    expect(user.review_direction).toBe("both");
  });

  it("updateUserSettings сохраняет каждую настройку", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    const updated = updateUserSettings(db, user.id, {
      dailyGoal: 50,
      ttsEnabled: false,
      reviewDirection: "toForeign",
    });
    expect(updated?.daily_goal).toBe(50);
    expect(updated?.tts_enabled).toBe(0);
    expect(updated?.review_direction).toBe("toForeign");
  });

  it("частичный патч не затирает остальные настройки", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    updateUserSettings(db, user.id, { dailyGoal: 30, ttsEnabled: false, language: "de" });
    const updated = updateUserSettings(db, user.id, { reviewDirection: "toNative" });
    expect(updated?.review_direction).toBe("toNative");
    expect(updated?.daily_goal).toBe(30);
    expect(updated?.tts_enabled).toBe(0);
    expect(updated?.language).toBe("de");
  });

  it("пустой патч ничего не ломает", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    expect(updateUserSettings(db, user.id, {})?.daily_goal).toBe(20);
  });

  it("toPublicUser не отдаёт password_hash", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    const publicUser = toPublicUser(user);
    expect(publicUser).not.toHaveProperty("password_hash");
    expect(publicUser.review_direction).toBe("both");
  });
});
