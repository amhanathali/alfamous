@echo off
chcp 65001 >nul
REM =============================================================================
REM Assistant Git Alfamous — menu unique pour branches, commit, push, merge,
REM pull, snapshot WinRAR et deploiement Firebase.
REM Ne remplace pas les .bat specialises : les appelle quand il faut.
REM =============================================================================
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
cd /d "%ROOT%" || (
  echo [ERREUR] Impossible d'ouvrir le dossier du script.
  pause
  exit /b 1
)

if not exist "public\" (
  echo [ERREUR] Dossier "public\" introuvable. Lancez ce script depuis la racine Alfamous.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Ce dossier n'est pas un depot Git.
  echo         Initialisez Git ou faites "git clone" avant d'utiliser l'assistant.
  pause
  exit /b 1
)

goto :MENU

REM ---------------------------------------------------------------------------
:SHOW_BRANCH
set "CUR_BRANCH="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CUR_BRANCH=%%B"
if not defined CUR_BRANCH set "CUR_BRANCH=(detachee ou inconnue)"
exit /b 0

:LIST_BRANCHES
echo.
echo --- Branches locales ---
git branch --no-color
echo.
exit /b 0

:PAUSE_MENU
echo.
pause
exit /b 0

REM ---------------------------------------------------------------------------
:MENU
cls
call :SHOW_BRANCH
echo ============================================================
echo   ASSISTANT GIT - Alfamous
echo ============================================================
echo   Dossier  : %CD%
echo   Branche  : !CUR_BRANCH!
echo ============================================================
echo.
echo   1  Etat du projet ^(lecture seule^)
echo   2  Changer de branche ou en creer une
echo   3  Enregistrer et envoyer ^(commit + push^)
echo   4  Recuperer depuis GitHub ^(pull^)
echo   5  Fusionner la branche courante dans main
echo   6  Snapshot complet ^(SAUVEGARDER____.BAT^)
echo   7  Deployer Firebase ^(DEPLOYER____.BAT^)
echo.
echo   0  Quitter
echo.
set "CHOIX="
set /p "CHOIX=Votre choix (0-7) : "
if "%CHOIX%"=="0" goto :QUIT
if "%CHOIX%"=="1" goto :DO_STATUS
if "%CHOIX%"=="2" goto :DO_BRANCH
if "%CHOIX%"=="3" goto :DO_COMMIT_PUSH
if "%CHOIX%"=="4" goto :DO_PULL
if "%CHOIX%"=="5" goto :DO_MERGE_MAIN
if "%CHOIX%"=="6" goto :DO_SAVE_RAR
if "%CHOIX%"=="7" goto :DO_DEPLOY
echo [INFO] Choix invalide.
goto :MENU

REM ---------------------------------------------------------------------------
:DO_STATUS
cls
echo === Branche et synchronisation ===
git status -sb
echo.
echo === 15 derniers commits ===
git log --oneline -15
call :PAUSE_MENU
goto :MENU

REM ---------------------------------------------------------------------------
:DO_BRANCH
cls
call :SHOW_BRANCH
echo Branche actuelle : !CUR_BRANCH!
call :LIST_BRANCHES
echo Saisissez le nom de la branche cible.
echo   - branche existante : bascule dessus
echo   - nouveau nom       : cree une branche ^(ex. ui/ma-modif^)
echo   - Entree vide       : retour au menu
echo.
set "NEWBR="
set /p "NEWBR=Nom de branche : "
if not defined NEWBR goto :MENU
set "NEWBR=!NEWBR: =!"

git show-ref --verify --quiet "refs/heads/!NEWBR!" 2>nul
if errorlevel 1 (
  echo [INFO] Creation de la branche "!NEWBR!"...
  git checkout -b "!NEWBR!"
) else (
  echo [INFO] Bascule vers "!NEWBR!"...
  git checkout "!NEWBR!"
)
if errorlevel 1 (
  echo [ERREUR] Operation branche echouee.
) else (
  echo [OK] Vous etes sur : 
  git branch --show-current
)
call :PAUSE_MENU
goto :MENU

REM ---------------------------------------------------------------------------
:DO_COMMIT_PUSH
cls
call :SHOW_BRANCH
echo Branche : !CUR_BRANCH!
echo.
echo Modifications detectees :
echo ------------------------------------------------------------
git status --short
echo ------------------------------------------------------------
echo.
set "MSG="
set /p "MSG=Message de commit (Entree = maj: sauvegarde du projet) : "
if not defined MSG set "MSG=maj: sauvegarde du projet"

echo.
echo [1/2] Enregistrement local...
git add -A
git commit -m "!MSG!"
if errorlevel 1 (
  echo [INFO] Rien a committer ou commit refuse. Push quand meme si deja a jour.
) else (
  echo [OK] Commit enregistre.
)

echo [2/2] Envoi vers GitHub...
git push -u origin HEAD
if errorlevel 1 (
  echo [ERREUR] Push echoue. Verifiez Internet et l'authentification GitHub.
) else (
  echo [OK] Branche !CUR_BRANCH! envoyee sur GitHub.
)
call :PAUSE_MENU
goto :MENU

REM ---------------------------------------------------------------------------
:DO_PULL
cls
call :SHOW_BRANCH
echo Branche : !CUR_BRANCH!
echo.
git pull
if errorlevel 1 (
  echo [ERREUR] Pull echoue. Conflit possible : reglez avant de continuer.
) else (
  echo [OK] Projet a jour avec GitHub sur cette branche.
)
call :PAUSE_MENU
goto :MENU

REM ---------------------------------------------------------------------------
:DO_MERGE_MAIN
cls
call :SHOW_BRANCH
set "SRC_BRANCH=!CUR_BRANCH!"
if /I "!SRC_BRANCH!"=="main" (
  echo [INFO] Vous etes deja sur main. Rien a fusionner depuis la branche courante.
  call :PAUSE_MENU
  goto :MENU
)

echo ============================================================
echo   FUSION dans main
echo ============================================================
echo   Branche a integrer : !SRC_BRANCH!
echo.
echo   Etapes : checkout main ^> pull ^> merge !SRC_BRANCH! ^> push main
echo   ATTENTION : en cas de conflit, Git s'arretera ; reglez a la main.
echo.
set "CONF="
set /p "CONF=Continuer ? (O/N) : "
if /I not "!CONF!"=="O" goto :MENU

echo.
echo [1/4] Bascule sur main...
git checkout main
if errorlevel 1 goto :MERGE_FAIL

echo [2/4] Mise a jour de main depuis GitHub...
git pull
if errorlevel 1 goto :MERGE_FAIL

echo [3/4] Fusion de !SRC_BRANCH! dans main...
git merge "!SRC_BRANCH!" -m "merge: !SRC_BRANCH! into main"
if errorlevel 1 (
  echo [ERREUR] Fusion echouee ^(conflits ?^). Corrigez puis : git add -A ^& git commit
  goto :MERGE_PAUSE
)

echo [4/4] Envoi de main sur GitHub...
git push origin main
if errorlevel 1 goto :MERGE_FAIL

echo.
echo [OK] !SRC_BRANCH! fusionnee dans main et poussee sur GitHub.
set /p "DELBR=Supprimer la branche locale !SRC_BRANCH! ? (O/N) : "
if /I "!DELBR!"=="O" git branch -d "!SRC_BRANCH!"
goto :MERGE_PAUSE

:MERGE_FAIL
echo [ERREUR] Fusion interrompue. Branche actuelle :
git branch --show-current

:MERGE_PAUSE
call :PAUSE_MENU
goto :MENU

REM ---------------------------------------------------------------------------
:DO_SAVE_RAR
cls
if not exist "%ROOT%SAUVEGARDER____.BAT" (
  echo [ERREUR] SAUVEGARDER____.BAT introuvable.
  call :PAUSE_MENU
  goto :MENU
)
echo [INFO] Lancement du snapshot complet ^(secrets inclus^)...
echo.
call "%ROOT%SAUVEGARDER____.BAT"
goto :MENU

REM ---------------------------------------------------------------------------
:DO_DEPLOY
cls
if not exist "%ROOT%DEPLOYER____.BAT" (
  echo [ERREUR] DEPLOYER____.BAT introuvable.
  call :PAUSE_MENU
  goto :MENU
)
echo [INFO] Lancement du deploiement Firebase ^(+ sauvegarde Git si configure^)...
echo.
call "%ROOT%DEPLOYER____.BAT"
goto :MENU

REM ---------------------------------------------------------------------------
:QUIT
echo.
echo [DONE] Assistant Git ferme. Aucune modification forcee.
endlocal
exit /b 0
