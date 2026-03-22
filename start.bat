@echo off
echo Building app...
cd client && npm run build && cd ..
echo Starting server on http://localhost:5000
cd server && node index.js
