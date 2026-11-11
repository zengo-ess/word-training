import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig } from "vite";

// The shell is derived from the finished bundle, so HTML and hashed assets stay in sync.
export function offlineBuild(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "offline-shell",
    apply: "build",
    configResolved(value) { config = value; },
    closeBundle() {
      const dir = resolve(config.root, config.build.outDir);
      const walk = (path: string): string[] => readdirSync(path, { withFileTypes: true }).flatMap(entry =>
        entry.isDirectory() ? walk(resolve(path, entry.name)) : [resolve(path, entry.name)]);
      const files = walk(dir).filter(path => !path.endsWith("/sw.js")).sort();
      const hash = createHash("sha256");
      for (const path of files) hash.update(relative(dir, path)).update(readFileSync(path));
      const shell = files.map(path => "/" + relative(dir, path).replaceAll("\\", "/"));
      const source = readFileSync(fileURLToPath(new URL("./offline-worker.js", import.meta.url)), "utf8")
        .replace("__SHELL_VERSION__", hash.digest("hex").slice(0, 16))
        .replace("__SHELL_FILES__", JSON.stringify(shell));
      writeFileSync(resolve(dir, "sw.js"), source);
    },
  };
}
