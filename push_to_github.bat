@echo off
echo --- Fixing Git Setup ---

echo 1. Initializing Git...
git init

echo 2. Adding all files...
git add .

echo 3. Committing files (Required before pushing)...
git commit -m "Initial commit of OPD Engine"

echo 4. Setting branch to 'main'...
git branch -M main

echo 5. Configuring Remote Repository...
git remote remove origin
git remote add origin https://github.com/rahul-yadav-99327/Medoc-Assessment.git

echo 6. Pushing to GitHub...
git push -u origin main

echo.
echo If you see "src refspec main does not match any", it means the commit failed (maybe no files to add?).
echo If you see "failed to push", check your internet or GitHub permissions.
echo.
pause
