const fs = require('fs');
let content = fs.readFileSync('./components/musica/ReportsModal.tsx', 'utf8');
content = content.replace(/\{ font: "Arial", font: "Arial",/g, '{ font: "Arial",');
fs.writeFileSync('./components/musica/ReportsModal.tsx', content);
