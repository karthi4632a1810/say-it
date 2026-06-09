@echo off
REM Right-click Command Prompt -> Run as administrator, then:
REM   cd /d "C:\KARTHIKEYAN\myCode\Say IT"
REM   scripts\open-lan-firewall.cmd

netsh advfirewall firewall add rule name="Say IT Vite 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Say IT API 3000" dir=in action=allow protocol=TCP localport=3000

echo.
echo Done. On other laptop open: http://192.168.1.110:5173
echo Test API: http://192.168.1.110:3000/health
pause
