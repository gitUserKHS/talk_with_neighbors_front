@echo off
setlocal

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "DRIVE=V:"

subst %DRIVE% >nul 2>&1
if not errorlevel 1 (
  echo %DRIVE% is already in use. Remove that mapping and try again.
  exit /b 1
)

subst %DRIVE% "%ROOT%"
if errorlevel 1 (
  echo Failed to map %DRIVE% to "%ROOT%".
  exit /b 1
)

pushd %DRIVE%\
call "C:\Program Files\nodejs\npm.cmd" run build
set "EXIT_CODE=%ERRORLEVEL%"
popd

subst %DRIVE% /D
exit /b %EXIT_CODE%
