import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(__dirname, "../tools");

const env = {
  ...process.env,
  // 让 Hugo 优先命中仓库自带的 sass shim，避免被 .bin 中的纯 JS sass 抢占。
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

process.exit(result.status ?? 0);
