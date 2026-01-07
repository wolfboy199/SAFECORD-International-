const fs = require('fs');
const s = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const backticks = (s.match(/`/g) || []).length;
const slashes = (s.match(/\/\*/g) || []).length;
console.log('backticks:', backticks);
console.log('/* count:', slashes);
