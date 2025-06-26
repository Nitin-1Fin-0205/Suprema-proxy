@echo off
REM c:\Users\nitin\1Finance\support_backend-\MatcherIdentify\build.bat
echo Building MatcherIdentify.exe...

REM Check if project file exists and is valid
if not exist "MatcherIdentify.csproj" (
    echo Error: MatcherIdentify.csproj not found!
    goto :error
)

dotnet build --configuration Release

if %ERRORLEVEL% EQU 0 (
    echo Build successful!
    echo Copying files to backend directory...
    
    copy "bin\Release\net6.0\MatcherIdentify.exe" "..\MatcherIdentify.exe"
    copy "UFMatcher.dll" "..\UFMatcher.dll"
    
    echo Done! MatcherIdentify.exe is ready in the backend folder.
) else (
    echo Build failed!
)

:error
pause