@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo   RECUPERER la derniere version depuis GitHub
echo ============================================================
echo.
echo (Utile si vous travaillez sur plusieurs ordinateurs,
echo  ou apres avoir fusionne une contribution sur GitHub.)
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Ce dossier n'est pas un depot Git.
  echo.
  pause
  exit /b 1
)

git pull
if errorlevel 1 (
  echo.
  echo [ERREUR] La recuperation a echoue. Voir les messages ci-dessus.
  echo          En cas de conflit, demandez de l'aide avant de continuer.
) else (
  echo.
  echo [OK] Projet a jour avec GitHub.
)

echo.
pause
endlocal
