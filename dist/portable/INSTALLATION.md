# 🍅 Let's set up Pomodoro Cute!

A cozy little home for your focus sessions, tasks, and daily progress.

This guide is for **Windows**. You only need to do the setup once. ✨

## 🎁 Easiest start: use the portable app

The updated portable app is **`dist\portable\Pomodoro Cute.exe`**.

> 🌷 **Desktop design update:** if you also see **Pomodoro Cute - Desktop.exe**,
> open that copy for the new resizable desktop layout. It was saved separately
> because the older portable app was running during the update. Quit the old
> copy from its tray menu before opening the new one. Future successful builds
> replace the usual **Pomodoro Cute.exe**.

1. Open the `dist` folder, then `portable`.
2. Double-click **Pomodoro Cute.exe**.
3. Give the app a moment to unpack and open.

That's it! You don't need Node.js or an installation wizard. You can copy this
single `.exe` to another folder or Windows computer. Your saved tasks and journal
stay in the Windows profile on the computer where you use the app.

Choose this new file rather than the older `dist\Pomodoro.exe`.

The remaining setup steps are for running the app from its **project files** or
making another build yourself. If the portable app opened, you're ready for
[the app tutorial](HOW-TO-USE.md)! 🍅

## 🧺 What you'll need for the project-file setup

- The complete **Pomodoro-work tracker** folder, extracted from any ZIP file.
- An internet connection for the first setup.
- Node.js, the helper that runs the app from its project folder.

> 🌱 **Already have an older copy?** Use the new portable app above, or follow the steps below to run the updated project files with Tasks and Journal.

## 1. Install the little helper 🛠️

1. Visit the [official Node.js download page](https://nodejs.org/en/download).
2. Choose the **LTS** version and the **Windows Installer** for your computer.
3. Open the installer and follow its steps. Keep the default options, including npm and adding Node.js to your PATH.
4. Close any open terminal windows after installation.

**Already have Node.js?** You can skip the installer and check it in the next step.

## 2. Open the app folder 📂

1. Open **Pomodoro-work tracker** in File Explorer.
2. Check that you can see `package.json`, `index.html`, and `start_app.vbs`.
3. Click the folder's address bar at the top.
4. Type `cmd` and press **Enter**.

A Command Prompt window opens in the correct folder. No need to type a long folder address! 💛

Check that the helpers are available. Run these commands **one at a time**:

```bat
node --version
```

```bat
npm.cmd --version
```

Each should print a version number.

## 3. Set up the app 🌷

In that same window, run:

```bat
npm.cmd install
```

Wait until the command finishes and the prompt returns. The first download can take a few minutes.

Now open your app:

```bat
npm.cmd start
```

You should see the tomato timer, plus **Tasks**, **Journal**, and **Settings**. You're ready for your first little win! 🍅

## 4. Make tomorrow's launch easy ✨

Double-click **`Launch Pomodoro.cmd`** to open the **source app** directly from
this project. It uses the latest saved code, without building a portable copy.
If dependencies are missing, it attempts the first-time setup using npm.

Once dependencies are installed, it can launch using the included Electron
runtime even if npm is not on your PATH. On this computer, the build helper also
recognizes the bundled Codex Node.js runtime.

Prefer a quiet launch? Double-click **`start_app.vbs`**. It uses the same helper
with its command window hidden. If anything goes wrong, it points you back to
`Launch Pomodoro.cmd` so you can read the error.

For a desktop shortcut:

1. Right-click `Launch Pomodoro.cmd` (or `start_app.vbs` for a quiet shortcut).
2. Choose **Show more options**, if shown.
3. Choose **Send to → Desktop (create shortcut)**.
4. Rename the shortcut **Pomodoro Cute**.

Keep the app folder in the same place so the shortcut keeps working.

> 🧸 Closing the app window hides it in the system tray. To stop it completely, right-click its little tray icon near the Windows clock and choose **Quit**. The icon may be under the **↑** arrow.

## 🎁 Optional: make a portable app

After making changes, **save your edited files**, then double-click
**`Build Portable.cmd`**. A window shows the build progress and waits at the end
so you can read the result. On success, the output folder opens automatically.

Your refreshed app is always saved here:

```text
dist\portable\Pomodoro Cute.exe
```

The two Markdown tutorials are copied beside it, too. Share the single `.exe` to
share the app; your personal tasks and journal aren't included in the build.

Each build uses a separate temporary folder, so you can keep using the source
app while packaging it. **Quit any running portable copy from its tray menu
before rebuilding**, so Windows can replace the old `.exe`.

The previous portable file is kept until the new build finishes. If the old
file is locked, the script shows where it saved the fresh copy instead. A failed
build keeps its temporary files for troubleshooting.

Prefer commands? Open Command Prompt in the app folder and run:

Open Command Prompt in the app folder and run:

```bat
npm.cmd run build
```

Double-click the resulting `.exe` to launch it. This project produces a
**portable app**, so there is no separate installation wizard. Building may
need an internet connection for packaging downloads.

### 🌷 A tiny routine after changes

1. Save the changed source files.
2. Quit the source app from its tray menu and double-click **Launch Pomodoro.cmd**
   to see your changes. Closing only the window hides it; it doesn't reload code.
3. When you're happy with the changes, quit any running portable copy.
4. Double-click **Build Portable.cmd** and wait for the success message.
5. Open or share the fresh **dist\portable\Pomodoro Cute.exe**.

## 💾 Keep your little progress garden safe

Tasks, sessions, notes, and settings save automatically in your Windows user profile. They stay there when you quit and reopen the app.

To make a full backup:

1. Quit the app using its tray menu.
2. Press **Windows + R**.
3. Paste this location and press **Enter**:

   ```text
   %APPDATA%\Pomodoro Cute
   ```

4. Copy the whole folder to a safe backup location.

Journal exports are handy reports of your sessions. A copy of the whole profile folder also keeps your tasks and settings.

## 🩹 A few easy fixes

| What happened? | Try this |
| --- | --- |
| “node” or “npm” is not recognized | Install Node.js with the default PATH option, then open a new Command Prompt. |
| “package.json” cannot be found | Open Command Prompt inside **Pomodoro-work tracker**, where `package.json` lives. |
| The quiet launcher doesn't open the app | Double-click **Launch Pomodoro.cmd** so you can read any error message. |
| A portable build fails | Read the message in the build window. Check your internet connection; if the existing `.exe` is locked, quit it from its tray menu and retry. |
| The first setup failed | Check your internet connection, then run `npm.cmd install` again. |
| Tasks and Journal are missing | You may have opened the older executable. Run `npm.cmd start` from the updated folder or build a new portable app. |
| The window disappeared | Click the tomato icon in the system tray to bring it back. |

## 🌼 What's next?

Open [the friendly app tutorial](HOW-TO-USE.md) and take your first tomato-sized step.
