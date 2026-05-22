@echo off
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron bulunamadi. Once "npm install" calistirin.
  pause
  exit /b 1
)

wscript //nologo "%~dp0Baslat.vbs"
exit /b 0
