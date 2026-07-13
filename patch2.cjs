const fs = require('fs');

function remove72hBlock(path) {
    let code = fs.readFileSync(path, 'utf8');
    const searchStr = `const isPast72Hours = (Date.now() - issueDate) > 72 * 60 * 60 * 1000;`;
    const searchIdx = code.indexOf(searchStr);
    
    if (searchIdx > -1) {
        // find the start of the block (from 'const isPast72Hours')
        // and end of the block (the closing brace of `if (isPast72Hours) { ... }`)
        const ifStr = `if (isPast72Hours) {`;
        const ifIdx = code.indexOf(ifStr, searchIdx);
        let openBraces = 0;
        let endIdx = -1;
        
        for (let i = ifIdx + ifStr.length - 1; i < code.length; i++) {
            if (code[i] === '{') openBraces++;
            else if (code[i] === '}') {
                openBraces--;
                if (openBraces === 0) {
                    endIdx = i;
                    break;
                }
            }
        }
        
        if (endIdx > -1) {
            code = code.substring(0, searchIdx) + code.substring(endIdx + 1);
            fs.writeFileSync(path, code);
            console.log("Removed 72h block from", path);
        } else {
            console.log("Could not find end of 72h block in", path);
        }
    } else {
        console.log("Could not find 72h block in", path);
    }
}

remove72hBlock('./components/musica/ReportsViewer.tsx');
remove72hBlock('./components/musica/BatchSigner.tsx');
remove72hBlock('./components/gestion/ReportesTrabajador.tsx');
