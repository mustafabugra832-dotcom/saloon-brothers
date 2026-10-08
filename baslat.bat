@echo off
title SALOON BROTHERS POS
echo ==================================================
echo SALOON BROTHERS - Hizli Satis ve Veresiye Takip
echo ==================================================
echo.
echo Sunucu baslatiliyor... Lutfen bekleyin.
start http://localhost:5000
python backend\app.py
pause
