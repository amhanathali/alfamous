@echo off
REM =============================================================================
REM Sauvegarde WinRAR uniquement — NE SUPPRIME AUCUN FICHIER du projet.
REM Cree un .rar dans le dossier du script (racine Alfamous).
REM Encodage: enregistrer ce fichier en ANSI ou UTF-8 sans BOM si cmd affiche des erreurs.
REM =============================================================================
setlocal EnableExtensions EnableDelayedExpansion

set "TM_PUSHED=0"
pushd "%~dp0" && set "TM_PUSHED=1"
if errorlevel 1 (
  echo [ERROR] Impossible d'ouvrir le dossier du script.
  goto :END
)

if not exist "public\" (
  echo [ERROR] Dossier "public\" introuvable. Arret: ce n'est probablement pas la racine Alfamous.
  goto :END
)

echo [INFO] Dossier de travail: %CD%
echo.

for /f %%A in ('powershell -NoProfile -Command "(Get-Date).ToString(\"yyyy-MM-dd_HHmm\")"') do set "TS=%%A"
set "ARCHIVE=Sauvegarde_Alfamous_%TS%.rar"
set "DEST=%CD%\%ARCHIVE%"

set "LST=%TEMP%\alfamous_save_rar_%RANDOM%.lst"
> "%LST%" echo public
if exist "functions\" (
  >>"%LST%" echo functions
) else (
  echo [WARN] Dossier "functions\" absent.
)
if exist "Gscript\" >>"%LST%" echo Gscript
if exist "firebase-backend\" >>"%LST%" echo firebase-backend
if exist "other\" >>"%LST%" echo other
for %%F in (firebase.json .firebaserc firestore.rules firestore.indexes.json storage.rules package.json package-lock.json firebase-storage-cors.json cors.json .gitignore) do (
  if exist "%%~F" >>"%LST%" echo %%~F
)
for %%F in (DEPLOYER____.BAT SAUVEGARDER____.BAT lancer-alfamous.bat) do (
  if exist "%%~F" >>"%LST%" echo %%~F
)

set "WINRAR=%ProgramFiles%\WinRAR\WinRAR.exe"
if not exist "%WINRAR%" set "WINRAR=%ProgramFiles(x86)%\WinRAR\WinRAR.exe"

if not exist "%WINRAR%" (
  echo [ERROR] WinRAR introuvable.
  if exist "%LST%" del /q "%LST%" >nul 2>&1
  goto :END
)

echo [INFO] Creation de l'archive ^(exclut *.rar et node_modules^) :
echo       %DEST%
call :RUN_RAR_ARCHIVE "%DEST%" "%LST%"
set "WRERR=!ERRORLEVEL!"
if exist "%DEST%" (
  echo [OK] Archive creee : %DEST%
) else (
  echo [ERROR] Echec creation archive. Code: !WRERR!
)

:END
echo.
echo [DONE] Fin. Aucun fichier du projet n'a ete supprime par ce script.
echo Appuyez sur une touche pour fermer...
pause >nul
if "%TM_PUSHED%"=="1" popd
endlocal
exit /b

:RUN_RAR_ARCHIVE
setlocal DisableDelayedExpansion
set "ARCH=%~1"
set "LSTF=%~2"
set "RAREXE=%ProgramFiles%\WinRAR\Rar.exe"
if not exist "%RAREXE%" set "RAREXE=%ProgramFiles(x86)%\WinRAR\Rar.exe"
if not exist "%RAREXE%" set "RAREXE=%ProgramFiles%\WinRAR\WinRAR.exe"
if not exist "%RAREXE%" set "RAREXE=%ProgramFiles(x86)%\WinRAR\WinRAR.exe"
if not exist "%RAREXE%" (
  echo [ERROR] Rar.exe / WinRAR.exe introuvable.
  if exist "%LSTF%" del /q "%LSTF%" >nul 2>&1
  endlocal
  exit /b 1
)
"%RAREXE%" a -idq -r -xr!node_modules -xr!*.rar "%ARCH%" @"%LSTF%"
set ER=%ERRORLEVEL%
if exist "%LSTF%" del /q "%LSTF%" >nul 2>&1
endlocal & exit /b %ER%
