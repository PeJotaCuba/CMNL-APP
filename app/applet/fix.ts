import fs from 'fs';
let content = fs.readFileSync('./components/musica/ReportsModal.tsx', 'utf8');

content = content.replace(/size: 20/g, 'size: 24');
content = content.replace(/size: 22/g, 'size: 24');
content = content.replace(/new TextRun\(\{/g, 'new TextRun({ font: "Arial",');

fs.writeFileSync('./components/musica/ReportsModal.tsx', content);
