@echo off
REM Wrapper Gradle untuk Windows — jika gradle-wrapper.jar belum ada, pakai gradle global yang terpasang
set DIRNAME=%~dp0
if exist "%DIRNAME%gradle\wrapper\gradle-wrapper.jar" (
  java -classpath "%DIRNAME%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
) else (
  gradle %*
)
