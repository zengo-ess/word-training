/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../db/migrate.js";
import { createUser, getUser, getUserByName, listUsers, updateUserLanguage } from "../users.repository.js";

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

  it("updateUserLanguage меняет язык изучения", () => {
    const db = freshDb();
    const user = createUser(db, "Женя", "x:y");
    const updated = updateUserLanguage(db, user.id, "de");
    expect(updated?.language).toBe("de");
    expect(getUser(db, user.id)?.language).toBe("de");
  });
});
