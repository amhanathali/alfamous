@echo off
setlocal
pushd "%~dp0"

rem ==============================
rem 0) Dossiers
rem ==============================
set "CMDHOME=%CD%"
set "ROOT=%CMDHOME%\public"

rem ==============================
rem 1) Python (logique d'origine)
rem ==============================
set "PYEXE="
for %%P in (py python) do (where %%P >nul 2>&1 && set "PYEXE=%%P")

if not defined PYEXE (
  echo Python introuvable dans le PATH. Installe-le puis relance.
  pause & popd & endlocal & exit /b 1
)

if not exist "%ROOT%" (
  echo Dossier introuvable: "%ROOT%"
  pause & popd & endlocal & exit /b 1
)

if not exist "%CMDHOME%\nocache_server.py" (
  echo Fichier introuvable: "%CMDHOME%\nocache_server.py"
  pause & popd & endlocal & exit /b 1
)

set "SRV_PORT=8080"

rem ==============================
rem 2) Dossier par defaut de CMD = Alfamous (AutoRun)
rem ==============================
set "AUTORUN_CMD=cd /d ""%CMDHOME%"""
if not exist "%CMDHOME%\AutoRun_backup.reg" reg export "HKCU\Software\Microsoft\Command Processor" "%CMDHOME%\AutoRun_backup.reg" /y >nul 2>&1
reg add "HKCU\Software\Microsoft\Command Processor" /v AutoRun /t REG_SZ /d "%AUTORUN_CMD%" /f >nul 2>&1

rem ==============================
rem 3) Lancer le serveur no-cache (ta commande d'origine)
rem ==============================
start "Alfamous No-Cache" cmd /k cd /d "%CMDHOME%" ^&^& "%PYEXE%" "%CMDHOME%\nocache_server.py" %SRV_PORT%

rem ==============================
rem 4) Cache-buster + URL
rem ==============================
for /f %%A in ('powershell -NoProfile -Command "[DateTime]::UtcNow.ToString('yyyyMMddHHmmss')"') do set "TS=%%A"
if not defined TS set "TS=%RANDOM%%RANDOM%"
set "URL=http://127.0.0.1:%SRV_PORT%/index.html?v=%TS%"

rem ==============================
rem 5) Attendre que le port ecoute (evite chrome-error:// si Chrome s'ouvre trop tot)
rem ==============================
echo Attente du serveur local sur le port %SRV_PORT% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($n=0; $n -lt 60; $n++) { try { $t = New-Object System.Net.Sockets.TcpClient; $t.Connect('127.0.0.1', %SRV_PORT%); $t.Close(); exit 0 } catch { Start-Sleep -Milliseconds 400 } }; exit 1"
if errorlevel 1 (
  echo [ERREUR] Aucune reponse sur le port %SRV_PORT% apres ~25 s.
  echo          Regardez la fenetre "Alfamous No-Cache" ^(Python / port deja utilise^).
  pause
  popd
  endlocal
  exit /b 1
)
echo [OK] Serveur pret.

rem ==============================
rem 6) Localiser Chrome
rem ==============================
set "CHROME="
for %%C in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do if exist %%~fC set "CHROME=%%~fC"
if not defined CHROME for %%C in (chrome.exe chrome) do (where %%C >nul 2>&1 && set "CHROME=%%C")

rem ==============================
rem 7) Chrome deja en cours ?
rem ==============================
set "CHROME_RUNNING="
tasklist /FI "IMAGENAME eq chrome.exe" | find /I "chrome.exe" >nul && set "CHROME_RUNNING=1"

rem ==============================
rem 8) Ouvrir selon ta regle :
rem    - Chrome deja ouvert -> nouvel onglet (sans DevTools)
rem    - Sinon -> nouvelle fenetre avec DevTools auto
rem ==============================
if defined CHROME_RUNNING (
  rem --- Chrome est deja en cours : ouvrir un nouvel onglet (flags ignores) ---
  if defined CHROME (
    start "" "%CHROME%" --new-tab "%URL%"
  ) else (
    rem Chrome non localise, tenter via Shell (navigateur par defaut)
    cmd /c start "" "%URL%"
  )
) else (
  rem --- Chrome n'est pas en cours : l'instance prend les flags DevTools ---
  if defined CHROME (
    start "" "%CHROME%" --new-window --auto-open-devtools-for-tabs "%URL%"
  ) else (
    rem Chrome non localise : fallback navigateur par defaut (sans DevTools)
    cmd /c start "" "%URL%"
  )
)

popd
endlocal
exit /b 0
