@echo off
REM c:\Users\nitin\1Finance\support_backend-\MatcherIdentify\test.bat
echo Testing MatcherIdentify.exe...

REM Create test files
mkdir test_data 2>nul
echo test_templates\db_0.dat > test_data\db_list.txt
echo test_templates\db_1.dat >> test_data\db_list.txt
echo test_templates\db_2.dat >> test_data\db_list.txt

REM Create dummy template files for testing
mkdir test_templates 2>nul
echo dummy_template_data > test_templates\db_0.dat
echo dummy_template_data > test_templates\db_1.dat  
echo dummy_template_data > test_templates\db_2.dat
echo live_template_data > test_data\live.dat

REM Run the matcher
echo Running: MatcherIdentify.exe test_data\live.dat test_data\db_list.txt
bin\Release\net6.0\MatcherIdentify.exe test_data\live.dat test_data\db_list.txt

pause
