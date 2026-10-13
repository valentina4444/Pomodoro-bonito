// Used by Build Portable.cmd. Runs with installed Node.js or the bundled runtime.
const { build, Platform, Arch } = require("electron-builder");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

(async () => {
  const projectDir = path.resolve(__dirname, "..");
  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), "pomodoro-portable-build-"));
  const outputDir = path.join(projectDir, "dist", "portable");
  const executableName = "Pomodoro Cute.exe";
  try {
    await build({
      projectDir,
      targets: Platform.WINDOWS.createTarget("portable", Arch.x64),
      config: {
        directories: { output: stagingDir },
        beforePack: async context => {
          // The installed builder supports scanning production dependencies
          // directly. This also works when Node.js is available without npm.
          context.packager.info.getPackageManager = async () => "traversal";
        },
      },
    });
    const builtExecutable = path.join(stagingDir, executableName);
    const targetExecutable = path.join(outputDir, executableName);
    await fs.mkdir(outputDir, { recursive: true });
    // Copy to a fresh sibling before renaming so a failed copy never truncates
    // the previous successful executable. A running/locked old copy is kept.
    const readyExecutable = path.join(outputDir, `Pomodoro Cute-${path.basename(stagingDir)}.ready.exe`);
    await fs.copyFile(builtExecutable, readyExecutable);
    try { await fs.rename(readyExecutable, targetExecutable); }
    catch (error) {
      throw new Error(`Could not replace the previous portable app. Quit it from its tray menu and try again. Your newly built copy is available at: ${readyExecutable}\n${error.message}`);
    }
    for (const name of ["INSTALLATION.md", "HOW-TO-USE.md"]) {
      await fs.copyFile(path.join(projectDir, "docs", name), path.join(outputDir, name));
    }
    console.log(`\nPortable app saved: ${targetExecutable}`);
    // Only remove the exact temporary directory created by this build, after
    // verifying its resolved absolute path remains inside the OS temp folder.
    const resolvedStage = path.resolve(stagingDir);
    const resolvedTemp = path.resolve(os.tmpdir());
    if (path.dirname(resolvedStage) !== resolvedTemp || !path.basename(resolvedStage).startsWith("pomodoro-portable-build-")) throw new Error("Unexpected temporary build path; cleanup was skipped.");
    await fs.rm(resolvedStage, { recursive: true, force: true });
  } catch (error) {
    console.error(error.message);
    console.error(`Build files were retained for troubleshooting: ${stagingDir}`);
    process.exit(1);
  }
})().catch(error => { console.error(error); process.exit(1); });
