@echo off
cd /d "%~dp0"

if "%GH_TOKEN%"=="" (
  echo HATA: GH_TOKEN ortam degiskeni tanimli degil.
  echo.
  echo Once GitHub'da Personal Access Token ^(classic, "repo" izniyle^) olustur:
  echo   https://github.com/settings/tokens/new
  echo.
  echo Sonra bu pencerede sirasiyla calistir:
  echo   set GH_TOKEN=ghp_buraya_token_yapistir
  echo   Yayinla.bat
  echo.
  pause
  exit /b 1
)

echo package.json icindeki version alanini yukseltttin mi? ^(orn. 1.0.0 -^> 1.0.1^)
echo Eger yukseltmediysen simdi Ctrl+C ile iptal et.
pause

echo.
echo WinWitget yeni surumu paketleniyor ve GitHub Releases'a yukleniyor...
call npm run publish
if errorlevel 1 (
  echo Yayinlama basarisiz.
  pause
  exit /b 1
)
echo.
echo Yayinlandi! Kullanicilarinin uygulamasi bir sonraki acilista guncellemeyi bulup arka planda indirecek.
pause
