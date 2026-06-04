@echo off
REM ============================================
REM  JAM POS - Build script multiplataforma
REM  Requisitos: Node.js + Rust + MSVC + Android SDK
REM ============================================

echo.
echo === 1. Instalando dependencias JS ===
call npm install

echo.
echo === 2. Generar iconos (si no existen) ===
echo.
cd src-tauri
..\node_modules\.bin\tauri icon ..\icon.svg
cd ..

echo.
echo === 3. Compilar para ANDROID ===
echo.
echo   Requisitos:
echo   - ANDROID_HOME=C:\Users\rosav\android-sdk
echo   - Rust targets: rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
echo.
echo   Para generar APK de debug:
echo     npm run tauri android build
echo.
echo   APK generado en:
echo     src-tauri/gen/android/app/build/outputs/apk/
echo.
echo === 4. Compilar para WINDOWS/MAC/LINUX ===
echo.
echo   npm run tauri build
echo.
echo   Instaladores en:
echo     src-tauri/target/release/bundle/
echo.
pause
