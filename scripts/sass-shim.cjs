const { spawnSync } = require("node:child_process");
const path = require("node:path");
const sassEmbeddedEntry = require.resolve("sass-embedded");
const sassEmbeddedRoot = path.resolve(path.dirname(sassEmbeddedEntry), "../..");
// 升级 sass-embedded 时必须验证 compiler-path.js 是否存在（该路径为内部实现，非公开 API）
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

function quoteForCmd(value) {
  return `"${String(value)
    .replace(/\^/g, "^^")
    .replace(/"/g, '""')
    .replace(/%/g, "^%")
    .replace(/[&|<>()]/g, "^$&")}"`;
}

// 保留对 .bat/.cmd 的兼容，避免不同平台的编译器入口差异影响 Hugo。
// Windows 批处理文件必须经由 cmd.exe 执行；不要把参数简单 join 成字符串，
// 否则路径空格或 &、|、<、> 等 shell 元字符会破坏参数边界。
if ([".bat", ".cmd"].includes(path.extname(command).toLowerCase())) {
  const commandLine = `"${[command, ...args].map(quoteForCmd).join(" ")}"`;
  command = process.env.ComSpec || "cmd.exe";
  args = ["/d", "/v:off", "/s", "/c", commandLine];
  options.windowsVerbatimArguments = true;
}

const result = spawnSync(command, args, options);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
