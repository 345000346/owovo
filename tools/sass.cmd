@ECHO off
SETLOCAL
node "%~dp0..\node_modules\sass-embedded\dist\bin\sass.js" %*
