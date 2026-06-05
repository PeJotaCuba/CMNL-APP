import fs from 'fs';
let content = fs.readFileSync('./components/musica/ReportsModal.tsx', 'utf8');

// docxCell
content = content.replace(/size: 20/g, 'size: 24');

// size 22 -> 24
content = content.replace(/size: 22/g, 'size: 24');

// size 28 -> 28
// size 24 -> 24

// Add font: "Arial" anywhere there is new TextRun({
// We use a regex: new TextRun({ 
// then if it doesn't already have font block:
content = content.replace(/new TextRun\(\{/g, 'new TextRun({ font: "Arial",');

// Wait, the web views!
// text-xs -> text-[12px]
// text-sm -> text-[14px]
// font-serif -> font-sans (or just plain arial Arial)
// Let's modify classes where they say `text-[10px]` to `text-[12px]`
// And we also want to add the `Guardar en Archivo` button.

fs.writeFileSync('./components/musica/ReportsModal.tsx', content);
