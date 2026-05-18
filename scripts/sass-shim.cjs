const { spawnSync } = require("node:child_process");
const path = require("node:path");
const sassEmbeddedEntry = require.resolve("sass-embedded");
const sassEmbeddedRoot = path.resolve(path.dirname(sassEmbeddedEntry), "../..");
// 注意：以下路径是 sass-embedded 内部实现细节，升级 sass-embedded 时需要验证是否存在
const compilerPathModule = path.join(
  sassEmbeddedRoot,
  "dist/lib/src/compiler-path.js",
);

let compilerCommand;
try {
  compilerCommand = require(compilerPathModule).compilerCommand;
} catch (err) {
  console.error(
    "无法加载 sass-embedded 编译器路径，请确认 sass-embedded 已正确安装。",
  );
  process.exit(1);
}

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
