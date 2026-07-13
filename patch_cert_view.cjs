const fs = require('fs');
const path = './components/FirmaDigitalTool.tsx';
let code = fs.readFileSync(path, 'utf8');

const search = `        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div>
            <h3 className="text-2xl font-black text-white italic tracking-tight">DATOS DEL CERTIFICADO</h3>
            <p className="text-stone-400 text-xs">Identificación criptográfica activa en este dispositivo</p>
          </div>
        </div>`;

const replace = `        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 gap-4">
          <div>
            <h3 className="text-2xl font-black text-white italic tracking-tight">DATOS DEL CERTIFICADO</h3>
            <p className="text-stone-400 text-xs">Identificación criptográfica activa en este dispositivo</p>
          </div>
          <div className="flex-shrink-0 scale-90 origin-right">
            <PasswordCountdown userId={userId} cert={loadedCert} />
          </div>
        </div>`;

if (code.includes(search)) {
    code = code.replace(search, replace);
    fs.writeFileSync(path, code);
    console.log("Patched cert_view");
} else {
    console.log("Could not find search string for cert_view");
}
