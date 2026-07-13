const fs = require('fs');
const path = './components/FirmaDigitalTool.tsx';
let code = fs.readFileSync(path, 'utf8');

const searchInsert = `<h3 className="font-bold text-lg">Firma Digital Activa</h3>
                 <p className="text-xs opacity-70">Usted se encuentra debidamente certificado en la emisora para validar la programación.</p>
               </div>
            </div>`;

const replaceInsert = `<h3 className="font-bold text-lg">Firma Digital Activa</h3>
                 <p className="text-xs opacity-70">Usted se encuentra debidamente certificado en la emisora para validar la programación.</p>
               </div>
            </div>
            
            <PasswordCountdown userId={userId} cert={loadedCert} />`;

if (code.includes(searchInsert)) {
    code = code.replace(searchInsert, replaceInsert);
    fs.writeFileSync(path, code);
    console.log("Injected PasswordCountdown into view");
} else {
    console.log("Could not find view string");
}
