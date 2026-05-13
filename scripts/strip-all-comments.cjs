"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");

function collectTsFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = ent.name;
    if (name === "node_modules" || name === ".next" || name === ".git" || name === "dist") continue;
    const full = path.join(dir, name);
    if (ent.isDirectory()) collectTsFiles(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
}

function stripNextEnvDts(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (t.startsWith("///")) return true;
      if (t.startsWith("//")) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function stripWithPrinter(relPath, source, isTsx) {
  const kind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true, kind);
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: true,
  });
  let out = printer.printFile(sf);
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

function stripJsFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(
    path.basename(filePath),
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: true,
  });
  let out = printer.printFile(sf);
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

function main() {
  const files = [];
  collectTsFiles(path.join(ROOT, "app"), files);
  collectTsFiles(path.join(ROOT, "src"), files);
  const rootTs = path.join(ROOT, "next-env.d.ts");
  if (fs.existsSync(rootTs)) files.push(rootTs);

  const jsRoots = ["next.config.js", "tailwind.config.js", "postcss.config.mjs", "eslint.config.mjs"].map((f) =>
    path.join(ROOT, f),
  );

  let changed = 0;
  for (const filePath of files) {
    const rel = path.relative(ROOT, filePath).split(path.sep).join("/");
    const before = fs.readFileSync(filePath, "utf8");
    let next;
    if (rel === "next-env.d.ts") {
      next = stripNextEnvDts(before);
    } else {
      next = stripWithPrinter(rel, before, filePath.endsWith(".tsx"));
    }
    if (next === before) continue;
    fs.writeFileSync(filePath, next, "utf8");
    changed++;
    console.log(rel);
  }

  for (const filePath of jsRoots) {
    if (!fs.existsSync(filePath)) continue;
    const rel = path.relative(ROOT, filePath).split(path.sep).join("/");
    const before = fs.readFileSync(filePath, "utf8");
    let next;
    try {
      next = stripJsFile(filePath);
    } catch {
      console.warn("skip (parse failed):", rel);
      continue;
    }
    if (next === before) continue;
    fs.writeFileSync(filePath, next, "utf8");
    changed++;
    console.log(rel);
  }

  console.log("strip-all-comments: updated", changed, "files");
}

main();
