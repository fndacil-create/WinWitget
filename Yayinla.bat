@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM .env dosyasindan GH_TOKEN'i otomatik yukle (varsa)
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /i "%%A"=="GH_TOKEN" set "GH_TOKEN=%%B"
  )
)

if "%GH_TOKEN%"=="" (
  echo.
  echo ====================================================================
  echo  HATA: GH_TOKEN bulunamadi.
  echo ====================================================================
  echo.
  echo Yapmasi gereken:
  echo   1^) Bu klasorde ".env" adinda bir dosya olustur ^(uzanti yok^)
  echo   2^) Icine tek satir yaz:
  echo        GH_TOKEN=ghp_buraya_kendi_tokenini_yapistir
  echo   3^) Kaydedip kapat, bu Yayinla.bat'a tekrar cift tikla.
  echo.
  echo Veya tek seferlik kullanmak istersen ayni PowerShell penceresinde:
  echo        $env:GH_TOKEN = "ghp_..."
  echo        .\Yayinla.bat
  echo.
  pause
  exit /b 1
)

echo.
echo ====================================================================
echo  package.json icindeki "version" alanini yukselttin mi?
echo  ^(orn. 1.0.0 -^> 1.0.1^)
echo ====================================================================
echo.
echo Yukseltmediysen simdi pencereyi kapat, version'u guncelle, sonra
echo Yayinla.bat'a yeniden cift tikla.
echo.
echo Yukselttiysen devam etmek icin bir tusa bas...
pause >nul

echo.
echo WinWitget yeni surumu paketleniyor ve GitHub Releases'a yukleniyor...
echo Bu islem 1-3 dakika surebilir, lutfen pencereyi kapatma.
echo.

call npm run publish
if errorlevel 1 (
  echo.
  echo ====================================================================
  echo  YAYINLAMA BASARISIZ!
  echo ====================================================================
  echo Yukaridaki hata mesajini oku. Yaygin sebepler:
  echo   - Token suresi dolmus / yetkisi yok
  echo   - Internet baglantisi yok
  echo   - version numarasi yukselmemis ^(eski surumle ayni^)
  echo.
  pause
  exit /b 1
)

echo.
echo ====================================================================
echo  YAYINLANDI!
echo ====================================================================
echo  Releases sayfasini kontrol et:
echo  https://github.com/fndacil-create/WinWitget/releases
echo.
echo  Yuklu WinWitget'ler bir sonraki acilista veya 6 saat icinde
echo  yeni surumu otomatik olarak bulup arka planda indirecek.
echo.
pause
