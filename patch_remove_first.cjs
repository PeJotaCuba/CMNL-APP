const fs = require('fs');
const path = './components/FirmaDigitalTool.tsx';
let code = fs.readFileSync(path, 'utf8');

const search = `<h3 className="font-bold text-lg">Firma Digital Activa</h3>
                 <p className="text-xs opacity-70">Usted se encuentra debidamente certificado en la emisora para validar la programación.</p>
               </div>
            </div>
            
            <PasswordCountdown userId={userId} cert={loadedCert} />`;

const replace = `<h3 className="font-bold text-lg">Firma Digital Activa</h3>
                 <p className="text-xs opacity-70">Usted se encuentra debidamente certificado en la emisora para validar la programación.</p>
               </div>
            </div>`;

if (code.includes(search)) {
    code = code.replace(search, replace);
    fs.writeFileSync(path, code);
    console.log("Removed from main view");
} else {
    console.log("Could not find in main view");
}
