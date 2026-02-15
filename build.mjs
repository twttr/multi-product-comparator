import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "fs";

const isWatch = process.argv.includes("--watch");

mkdirSync("dist", { recursive: true });

const buildOptions = {
  entryPoints: ["src/content.ts", "src/background.ts", "src/popup.ts"],
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: "chrome120",
  sourcemap: isWatch ? "inline" : false,
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
}

cpSync("src/manifest.json", "dist/manifest.json");
cpSync("src/popup.html", "dist/popup.html");
cpSync("src/popup.css", "dist/popup.css");
cpSync("src/content.css", "dist/content.css");
cpSync("src/icons", "dist/icons", { recursive: true });
cpSync("src/_locales", "dist/_locales", { recursive: true });
