@echo off
cd /d "%~dp0"
echo WinWitget kurulum dosyasi olusturuluyor...
call npm run dist
if errorlevel 1 (
  echo Paketleme basarisiz.
  pause
  exit /b 1
)
echo Tamamlandi. dist klasorune bakin.
pause
