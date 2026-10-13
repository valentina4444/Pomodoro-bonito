// Usage: node tests/portable-smoke.cjs "dist/Pomodoro Cute.exe"
const { _electron: electron, chromium, expect } = require("@playwright/test");
const { spawn, execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

(async () => {
  const executablePath = path.resolve(process.argv[2] || "dist/Pomodoro Cute.exe");
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "pomodoro-portable-smoke-"));
  const env = { ...process.env, POMODORO_TEST: "1", POMODORO_TEST_USERDATA: userData };
  let app, child;
  if (process.argv.includes("--portable")) {
    // NSIS does not forward the debugger's stderr to Playwright's Electron
    // launcher. Connect to the Chromium port in the isolated test profile.
    child = spawn(executablePath, ["--remote-debugging-port=0"], { env, windowsHide: true, stdio: "ignore" });
    child.on("error", error => console.error(error));
    const portFile = path.join(userData, "DevToolsActivePort");
    const deadline = Date.now() + 60000;
    while (!fs.existsSync(portFile) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 250));
    if (!fs.existsSync(portFile)) {
      execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"]);
      throw new Error("Portable launcher did not open its debugging port.");
    }
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0].trim();
    app = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  } else {
    app = await electron.launch({ executablePath, timeout: 90000, env });
  }
  try {
    const page = child ? app.contexts()[0].pages()[0] : await app.firstWindow();
    await page.waitForFunction(() => !!window.__pomodoroTest);
    await expect(page.locator("#time-display")).toHaveText("25:00");
    await page.click("#btn-tasks");
    await page.fill("#new-task-title", "Portable app check");
    await page.locator("#quick-task button").click();
    await page.locator(".task-card").getByText("Focus on this").click();
    await page.click("#btn-start");
    await page.evaluate(() => window.__pomodoroTest.fastForward(1500000));
    await expect(page.locator("#completion-modal")).toBeVisible();
    await page.fill("#session-notes", "The packaged app works!");
    await page.check("#complete-task");
    await page.locator("#completion-form button").click();
    await page.click("#btn-journal");
    await expect(page.locator("#journal-entries")).toContainText("Portable app check");
    await expect(page.locator("#journal-entries")).toContainText("The packaged app works!");
    await expect(page.locator("#journal-entries")).toContainText("Task completed in this session");
    console.log(`Portable smoke test passed: ${executablePath}`);
  } finally {
    await app.close();
    if (child) await new Promise(resolve => execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], () => resolve()));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
