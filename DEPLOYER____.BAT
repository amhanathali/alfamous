@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "TM_PUSHED=0"
REM Start from script folder
pushd "%~dp0" && set "TM_PUSHED=1"
if errorlevel 1 (
  echo [ERROR] Cannot access script directory.
  goto :END
)
echo [INFO] Script directory: %CD%
echo.

REM Targets
set "PUBLIC_DIR=%CD%\public\jsZC"
set "TARGET_JS=%PUBLIC_DIR%\dateVersion.js"
set "TARGET_NAME=dateVersion.js"
set "GCS_BASE=gs://alfamous-amha.appspot.com/MesDonnes/MesJS"

echo [INFO] Checking target files...
if not exist "%PUBLIC_DIR%" (
  echo [ERROR] Folder not found: "%PUBLIC_DIR%"
  goto :END
)
if not exist "%TARGET_JS%" (
  echo [ERROR] File not found: "%TARGET_JS%"
  goto :END
)
for %%F in ("%TARGET_JS%") do (
  if /I not "%%~nxF"=="%TARGET_NAME%" (
    echo [ERROR] Unexpected file name: %%~nxF
    goto :END
  )
)
echo [OK] Target file: "%TARGET_JS%"
echo.

REM Find gsutil
set "GSUTIL_CMD="
where gsutil >nul 2>nul && set "GSUTIL_CMD=gsutil"
if not defined GSUTIL_CMD if exist "%ProgramFiles%\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd" set "GSUTIL_CMD=%ProgramFiles%\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd"
if not defined GSUTIL_CMD if exist "%ProgramFiles(x86)%\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd" set "GSUTIL_CMD=%ProgramFiles(x86)%\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd"
if not defined GSUTIL_CMD (
  echo [ERROR] gsutil not found. Install Google Cloud SDK and/or add it to PATH.
  goto :END
)

where gcloud >nul 2>nul && (
  echo [INFO] Setting gcloud project: alfamous-amha
  call gcloud config set project alfamous-amha
)

echo.
echo [DEPLOY] Portee du deploiement Firebase :
echo   [1] Hosting uniquement
echo   [2] Tout ^(hosting, firestore, functions, storage selon firebase.json^)
set "DEPLOY_TARGET=hosting"
choice /c 12 /n /m "Votre choix (1 ou 2) : "
if errorlevel 2 set "DEPLOY_TARGET=all"
echo [INFO] Mode selectionne : !DEPLOY_TARGET!
echo.

echo.
echo [INFO] Syncing JS files from Firebase Storage...
call :SYNC_ONE "fTabVersets1.js" "%PUBLIC_DIR%\fTabVersets1.js" "fTabVersets1.js"
if errorlevel 1 goto :END
call :SYNC_ONE "fTabLexique1.js" "%PUBLIC_DIR%\fTabLexique1.js" "fTabLexique1.js"
if errorlevel 1 goto :END
call :SYNC_ONE "articles-format-html.js" "%PUBLIC_DIR%\articles-format-html.js" "articles-format-html.js"
if errorlevel 1 goto :END
echo [OK] Storage files synchronized.
echo.

REM Build temp PowerShell updater for dateVersion.js
set "PS1=%TEMP%\update_ftdv_%RANDOM%.ps1"
> "%PS1%" echo param([string]$Target)
>>"%PS1%" echo if (-not (Test-Path -LiteralPath $Target)) { throw "File not found: $Target" }
>>"%PS1%" echo if ([System.IO.Path]::GetFileName($Target) -ne "dateVersion.js") { throw "Unexpected file name" }
>>"%PS1%" echo $src = Get-Content -LiteralPath $Target -Raw -Encoding UTF8
>>"%PS1%" echo if ($src -notmatch 'function\s+fTabDateVersion\s*\(') { throw "fTabDateVersion() not found." }
>>"%PS1%" echo $version = 0.0
>>"%PS1%" echo if ($src -match '\[\s*([0-9]+(?:\.[0-9]+)?)\s*,') { $version = [double]$Matches[1] }
>>"%PS1%" echo $next = [math]::Round(($version * 100) + 1) / 100
>>"%PS1%" echo $next = "{0:N2}" -f $next
>>"%PS1%" echo $deployDate = (Get-Date).ToString("dd/MM/yyyy HH:mm:ss")
>>"%PS1%" echo $content = @"
>>"%PS1%" echo /* FTDV:CANON */
>>"%PS1%" echo window.__FTDV_CANON__ = true;
>>"%PS1%" echo function fTabDateVersion() {
>>"%PS1%" echo   var tableau = [
>>"%PS1%" echo     [$next, "$deployDate"],
>>"%PS1%" echo   ];
>>"%PS1%" echo   return tableau;
>>"%PS1%" echo }
>>"%PS1%" echo "@
>>"%PS1%" echo $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
>>"%PS1%" echo [System.IO.File]::WriteAllText($Target, $content, $utf8NoBom)
>>"%PS1%" echo Write-Host ("[OK] Version updated: {0} -> {1}" -f $version, $next)

echo [INFO] Updating dateVersion.js...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Target "%TARGET_JS%"
if errorlevel 1 (
  echo [ERROR] dateVersion.js update failed.
  del /Q "%PS1%" >nul 2>nul
  goto :END
)
del /Q "%PS1%" >nul 2>nul
echo.

if /I "!DEPLOY_TARGET!"=="all" (
  echo [INFO] firebase deploy ^(toutes les cibles^)...
  call firebase deploy
) else (
  echo [INFO] firebase deploy --only hosting...
  call firebase deploy --only hosting
)
if errorlevel 1 (
  echo [ERROR] Echec du deploiement Firebase. Sauvegarde GitHub non lancee.
  goto :END
)
echo [INFO] Deploiement Firebase termine.
echo.

REM === Sauvegarde automatique sur GitHub (remplace l'ancienne archive .rar) ===
echo.
echo [GIT] Sauvegarde du projet sur GitHub...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [WARN] Pas de depot Git ici : sauvegarde GitHub ignoree.
) else (
  for /f %%A in ('powershell -NoProfile -Command "(Get-Date).ToString(\"yyyy-MM-dd HH:mm\")"') do set "GITTS=%%A"
  git add -A
  git commit -m "deploy: mise en ligne du !GITTS!"
  git push -u origin HEAD
  if errorlevel 1 (
    echo [WARN] Envoi GitHub echoue. Pensez a sauvegarder manuellement plus tard.
  ) else (
    echo [OK] Projet sauvegarde sur GitHub.
  )
)

:END
echo.
echo [DONE] Script finished.
echo Press any key to close...
pause >nul
if "%TM_PUSHED%"=="1" popd
endlocal
exit /b

:SYNC_ONE
set "SYNC_SRC=%~1"
set "SYNC_DST=%~2"
set "SYNC_NAME=%~3"
echo [SYNC] %SYNC_NAME%
if /I "%GSUTIL_CMD%"=="gsutil" (
  call gsutil cp "%GCS_BASE%/%SYNC_SRC%" "%SYNC_DST%"
) else (
  call "%GSUTIL_CMD%" cp "%GCS_BASE%/%SYNC_SRC%" "%SYNC_DST%"
)
if errorlevel 1 (
  where gcloud >nul 2>nul && (
    echo [SYNC] Fallback with gcloud storage cp...
    call gcloud storage cp "%GCS_BASE%/%SYNC_SRC%" "%SYNC_DST%"
  )
)
if errorlevel 1 (
  echo [ERROR] Sync failed: %SYNC_NAME%
  exit /b 1
)
exit /b 0
