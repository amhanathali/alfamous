@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo   SAUVEGARDER le projet Alfamous sur GitHub
echo ============================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Ce dossier n'est pas un depot Git.
  echo.
  pause
  exit /b 1
)

echo Modifications detectees :
echo ------------------------------------------------------------
git status --short
echo ------------------------------------------------------------
echo.

REM Message de commit : 1er argument, sinon on demande, sinon message auto.
set "MSG=%~1"
if "%MSG%"=="" set /p "MSG=Decrivez vos modifications (Entree = message auto) : "
if "%MSG%"=="" set "MSG=maj: sauvegarde du projet"

echo.
echo [1/3] Preparation des fichiers...
git add -A

echo [2/3] Enregistrement local (commit)...
git commit -m "%MSG%"
if errorlevel 1 (
  echo [INFO] Rien a enregistrer (aucune modification) — on tente quand meme l'envoi.
) else (
  echo [OK] Modifications enregistrees en local.
)

echo [3/3] Envoi vers GitHub (push)...
git push
if errorlevel 1 (
  echo.
  echo [ERREUR] L'envoi a echoue. Verifiez votre connexion Internet
  echo          ou votre authentification GitHub, puis relancez.
) else (
  echo.
  echo [OK] Projet sauvegarde sur GitHub avec succes.
)

echo.
pause
endlocal
