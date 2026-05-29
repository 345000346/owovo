import { spawnSync } from "node:child_process";
import path from "node:path";

const toolsDir = path.resolve(import.meta.dirname, "../tools");

const env = {
  ...process.env,
  // 让 Hugo 优先命中 tools/ 中的 sass 包装脚本，避免与 .bin/ 中的入口冲突。
  PATH: `${toolsDir}${path.delimiter}${process.env.PATH ?? ""}`,
};

const result = spawnSync("hugo", process.argv.slice(2), {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
