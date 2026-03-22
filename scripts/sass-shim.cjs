const { spawnSync } = require("node:child_process");
const path = require("node:path");
const sassEmbeddedEntry = require.resolve("sass-embedded");
const sassEmbeddedRoot = path.resolve(path.dirname(sassEmbeddedEntry), "../..");
const compilerPathModule = path.join(
  sassEmbeddedRoot,
  "dist/lib/src/compiler-path.js",
);
const { compilerCommand } = require(compilerPathModule);

let command = compilerCommand[0];
let args = [...compilerCommand.slice(1), ...process.argv.slice(2)];

const options = {
  stdio: "inherit",
  windowsHide: true,
};

// 保留对 .bat/.cmd 的兼容，避免不同平台的编译器入口差异影响 Hugo。
if ([".bat", ".cmd"].includes(path.extname(command).toLowerCase())) {
  command = `${command} ${args.join(" ")}`;
  args = [];
  options.shell = true;
}

const result = spawnSync(command, args, options);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
