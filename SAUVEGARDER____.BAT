@echo off
chcp 65001 >nul
REM =============================================================================
REM Snapshot complet - NE SUPPRIME AUCUN FICHIER du projet.
REM Inclut code + secrets non versionnes (key.json, secrets.gs, other\, etc.)
REM ATTENTION : l'archive contient des SECRETS - lieu sur uniquement.
REM Sortie : .rar (WinRAR) ou .zip (tar Windows) dans la racine Alfamous.
REM =============================================================================
setlocal EnableExtensions EnableDelayedExpansion
goto :MAIN

:ADD_LIST
>>"%LST%" echo %~1
exit /b 0

:MAIN
cd /d "%~dp0" || (
  echo [ERREUR] Impossible d'ouvrir le dossier du script.
  pause
  exit /b 1
)

if not exist "public\" (
  echo [ERREUR] Dossier "public\" introuvable. Ce n'est probablement pas la racine Alfamous.
  pause
  exit /b 1
)

echo [INFO] Dossier de travail : %CD%
echo.

set "TS="
for /f "delims=" %%A in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd_HHmm')" 2^>nul') do set "TS=%%A"
if not defined TS (
  for /f "tokens=2 delims==" %%T in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%T"
  if defined DT set "TS=!DT:~0,4!-!DT:~4,2!-!DT:~6,2!_!DT:~8,4!"
)
if not defined TS set "TS=manuel"

set "LST=%TEMP%\alfamous_save_%RANDOM%.lst"
if exist "%LST%" del /q "%LST%" >nul 2>&1

call :ADD_LIST public
if exist "functions\" call :ADD_LIST functions
if exist "Gscript\" call :ADD_LIST Gscript
if exist "firebase-backend\" call :ADD_LIST firebase-backend
if exist "other\" call :ADD_LIST other

for %%F in (firebase.json .firebaserc firestore.rules firestore.indexes.json storage.rules package.json package-lock.json firebase-storage-cors.json cors.json .gitignore .gitattributes) do (
  if exist "%%~F" call :ADD_LIST %%F
)
for %%F in (key.json serviceAccountKey.json .env) do (
  if exist "%%~F" call :ADD_LIST %%F
)
for %%F in (DEPLOYER____.BAT SAUVEGARDER____.BAT LANCER_ALFAMOUS.BAT GIT_Assistant____.BAT GIT_Sauvegarder_sur_GitHub.bat GIT_Recuperer_de_GitHub.bat GIT_Etat_du_projet.bat) do (
  if exist "%%~F" call :ADD_LIST %%F
)

findstr /r /c:"." "%LST%" >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Aucun fichier a archiver. Liste vide.
  if exist "%LST%" del /q "%LST%" >nul 2>&1
  goto :FIN
)

set "ARCHIVE_RAR=Sauvegarde_Alfamous_%TS%.rar"
set "ARCHIVE_ZIP=Sauvegarde_Alfamous_%TS%.zip"
set "RAREXE="
set "WRERR=1"

if exist "%ProgramFiles%\WinRAR\Rar.exe" set "RAREXE=%ProgramFiles%\WinRAR\Rar.exe"
if not defined RAREXE if exist "%ProgramFiles(x86)%\WinRAR\Rar.exe" set "RAREXE=%ProgramFiles(x86)%\WinRAR\Rar.exe"

if defined RAREXE (
  echo [INFO] WinRAR : creation de l'archive ^(sans node_modules ni .rar^) :
  echo       %CD%\%ARCHIVE_RAR%
  "%RAREXE%" a -idq -r -xr!node_modules -xr!*.rar "%ARCHIVE_RAR%" @"%LST%"
  set "WRERR=!ERRORLEVEL!"
  if exist "%ARCHIVE_RAR%" (
    echo [OK] Archive creee : %ARCHIVE_RAR%
    set "WRERR=0"
  ) else (
    echo [AVERTISSEMENT] WinRAR a echoue ^(code !WRERR!^). Essai avec tar ^(zip^)...
    set "WRERR=1"
  )
)

if "!WRERR!" NEQ "0" (
  where tar >nul 2>&1
  if errorlevel 1 (
    echo [ERREUR] Ni WinRAR ni tar disponibles.
    echo         Installez WinRAR ^(https://www.win-rar.com^) ou utilisez Windows 10/11 avec tar integre.
    goto :FIN
  )
  echo [INFO] tar : creation de l'archive zip ^(sans node_modules ni .rar^) :
  echo       %CD%\%ARCHIVE_ZIP%
  if exist "%ARCHIVE_ZIP%" del /q "%ARCHIVE_ZIP%" >nul 2>&1
  tar -a -cf "%ARCHIVE_ZIP%" --exclude=node_modules --exclude=*.rar -T "%LST%"
  set "WRERR=!ERRORLEVEL!"
  if exist "%ARCHIVE_ZIP%" (
    echo [OK] Archive creee : %ARCHIVE_ZIP%
    set "WRERR=0"
  ) else (
    echo [ERREUR] Echec tar. Code : !WRERR!
  )
)

:FIN
if exist "%LST%" del /q "%LST%" >nul 2>&1
echo.
echo [RAPPEL] Cette archive peut contenir vos SECRETS : cle USB / cloud prive uniquement.
echo [DONE] Aucun fichier du projet n'a ete supprime par ce script.
echo.
pause
if "!WRERR!"=="0" (
  endlocal
  exit /b 0
)
endlocal
exit /b 1
