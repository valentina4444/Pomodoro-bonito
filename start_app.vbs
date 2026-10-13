Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)

shell.CurrentDirectory = appDir
helper = appDir & "/scripts/app-tools.ps1"
result = shell.Run("powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & helper & """ -Action launch", 0, True)
If result <> 0 Then
  MsgBox "Pomodoro could not open. Double-click Launch Pomodoro.cmd to see the setup or error message.", vbExclamation, "Pomodoro Cute"
End If
