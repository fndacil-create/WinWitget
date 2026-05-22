@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

REM ====================================================================
REM .env dosyasindan GH_TOKEN'i otomatik yukle
REM ====================================================================
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
  echo Bu klasorde ".env" adli dosya olustur ve icine yaz:
  echo   GH_TOKEN=ghp_buraya_kendi_tokenini_yapistir
  echo.
  pause
  exit /b 1
)

REM ====================================================================
REM Mevcut versiyonu goster
REM ====================================================================
for /f "tokens=2 delims=:," %%V in ('findstr /R /C:"\"version\"" package.json') do (
  set "CURRENT_VERSION=%%V"
)
set "CURRENT_VERSION=%CURRENT_VERSION:"=%"
set "CURRENT_VERSION=%CURRENT_VERSION: =%"

echo.
echo ====================================================================
echo  WinWitget Yayinlama Sihirbazi
echo ====================================================================
echo.
echo  Mevcut surum: %CURRENT_VERSION%
echo.
echo  Yapilacak guncelleme turunu sec:
echo.
echo    [1] Hata duzeltme       (orn. 1.0.1 -^> 1.0.2)
echo    [2] Yeni ozellik        (orn. 1.0.1 -^> 1.1.0)
echo    [3] Buyuk degisiklik    (orn. 1.0.1 -^> 2.0.0)
echo    [4] Surumu artirma, sadece tekrar yayinla (ayni surum)
echo    [0] Iptal
echo.

set /p "CHOICE=Secimini yaz (1/2/3/4/0) ve Enter'a bas: "

if "%CHOICE%"=="0" (
  echo Iptal edildi.
  pause
  exit /b 0
)

set "BUMP_TYPE="
if "%CHOICE%"=="1" set "BUMP_TYPE=patch"
if "%CHOICE%"=="2" set "BUMP_TYPE=minor"
if "%CHOICE%"=="3" set "BUMP_TYPE=major"
if "%CHOICE%"=="4" set "BUMP_TYPE=none"

if "%BUMP_TYPE%"=="" (
  echo HATA: Gecersiz secim "%CHOICE%". 1, 2, 3, 4 veya 0 yazmalisin.
  pause
  exit /b 1
)

REM ====================================================================
REM Versiyon yukseltme (4 secildiyse atla)
REM ====================================================================
if not "%BUMP_TYPE%"=="none" (
  echo.
  echo Surum yukseltiliyor ^(%BUMP_TYPE%^)...
  call npm version %BUMP_TYPE% --no-git-tag-version
  if errorlevel 1 (
    echo HATA: Surum yukseltilemedi.
    pause
    exit /b 1
  )

  for /f "tokens=2 delims=:," %%V in ('findstr /R /C:"\"version\"" package.json') do (
    set "NEW_VERSION=%%V"
  )
  set "NEW_VERSION=!NEW_VERSION:"=!"
  set "NEW_VERSION=!NEW_VERSION: =!"
  echo Yeni surum: !NEW_VERSION!
)

REM ====================================================================
REM Commit mesajini sor
REM ====================================================================
echo.
set /p "COMMIT_MSG=Commit mesaji (ENTER ile varsayilani kullan): "
if "%COMMIT_MSG%"=="" (
  if "%BUMP_TYPE%"=="none" (
    set "COMMIT_MSG=Yeniden yayin"
  ) else (
    set "COMMIT_MSG=v!NEW_VERSION! yayinla"
  )
)

REM ====================================================================
REM Git: degisiklikleri commit'le ve push'la
REM ====================================================================
echo.
echo Git'e gonderiliyor...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%COMMIT_MSG%"
  if errorlevel 1 (
    echo HATA: Commit yapilamadi.
    pause
    exit /b 1
  )
  git push
  if errorlevel 1 (
    echo HATA: Push yapilamadi.
    pause
    exit /b 1
  )
) else (
  echo Yeni degisiklik yok, push atlandi.
)

REM ====================================================================
REM Paketle ve GitHub Releases'a yukle
REM ====================================================================
echo.
echo Paketleme ve GitHub'a yukleme basliyor (1-3 dakika)...
echo.

call npm run publish
if errorlevel 1 (
  echo.
  echo ====================================================================
  echo  YAYINLAMA BASARISIZ!
  echo ====================================================================
  echo Yukaridaki hata mesajini oku. Yaygin sebepler:
  echo   - Token suresi dolmus veya yetkisi yok
  echo   - Internet baglantisi yok
  echo   - Ayni surum zaten yayinda (4 sectiysen surum ayni kalir)
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
