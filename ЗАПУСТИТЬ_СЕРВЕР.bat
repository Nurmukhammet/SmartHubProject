@echo off
chcp 65001 >nul
echo.
echo  ====================================
echo   SmartHub — Запуск сервера
echo  ====================================
echo.
echo  Открой браузер и перейди по адресу:
echo.
echo    Сайт:    http://localhost:3000
echo    Админка: http://localhost:3000/admin.html
echo    Ключ:    smarthub2025
echo.
echo  Не закрывай это окно пока работаешь!
echo  ====================================
echo.
node server.js
pause
