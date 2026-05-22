Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"

If Not fso.FileExists(electronExe) Then
  MsgBox "Electron bulunamadi." & vbCrLf & "Once klasorde 'npm install' calistir.", vbCritical, "WinWitget"
  WScript.Quit 1
End If

shell.CurrentDirectory = appDir
shell.Run """" & electronExe & """ .", 0, False
