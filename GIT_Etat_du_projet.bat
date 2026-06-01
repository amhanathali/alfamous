@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo   ETAT du projet (lecture seule, ne modifie rien)
echo ============================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Ce dossier n'est pas un depot Git.
  echo.
  pause
  exit /b 1
)

echo === Branche et synchronisation avec GitHub ===
git status -sb
echo.
echo === 10 derniers enregistrements (commits) ===
git log --oneline -10
echo.
pause
endlocal
