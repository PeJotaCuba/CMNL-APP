const fs = require('fs');
const path = './components/gestion/ReportesTrabajador.tsx';
let code = fs.readFileSync(path, 'utf8');

const searchState = `const [signPass, setSignPass] = useState('');`;
const insertState = `const [signPass, setSignPass] = useState('');
    const [pendingSignWarning, setPendingSignWarning] = useState<string | null>(null);`;

if (code.includes(searchState)) {
    code = code.replace(searchState, insertState);
} else {
    code = code.replace(`const [signPass, setSignPass] = React.useState('');`, `const [signPass, setSignPass] = React.useState('');
    const [pendingSignWarning, setPendingSignWarning] = React.useState<string | null>(null);`);
}

const authCheckStr = `        const authCheck = checkSigningAuthorization(currentUser.id);
        if (!authCheck.authorized) {
            alert(authCheck.reason);
            return;
        }`;
        
const insertAuthCheck = `        const authCheck = checkSigningAuthorization(currentUser.id);
        if (!authCheck.authorized) {
            alert(authCheck.reason);
            return;
        }
        if (authCheck.warning && !sessionStorage.getItem(\`warn_acked_\${currentUser.id}\`)) {
            setPendingSignWarning(authCheck.warning);
            return;
        }`;

code = code.replace(authCheckStr, insertAuthCheck);

const modalStr = `            {pendingSignWarning && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#2C1B15] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#9E7649]/40 text-center space-y-4 font-sans">
                        <div className="flex justify-center text-[#EAB308]">
                            <span className="material-symbols-outlined text-4xl">warning</span>
                        </div>
                        <h3 className="text-white text-sm font-bold uppercase tracking-wider">Aviso de Seguridad</h3>
                        <p className="text-xs text-stone-200 font-semibold leading-relaxed whitespace-pre-line text-left bg-black/30 p-4 rounded-xl border border-[#9E7649]/10">
                            {pendingSignWarning}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    sessionStorage.setItem(\`warn_acked_\${currentUser?.id}\`, 'true');
                                    setPendingSignWarning(null);
                                    if (signingReportId) signReport(signingReportId);
                                }}
                                className="w-full py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold rounded-xl transition-all text-xs uppercase"
                            >
                                Continuar y Firmar
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.setItem(\`cmnl_pass_warn_dismissed_\${currentUser?.id}\`, 'true');
                                    sessionStorage.setItem(\`warn_acked_\${currentUser?.id}\`, 'true');
                                    setPendingSignWarning(null);
                                    if (signingReportId) signReport(signingReportId);
                                }}
                                className="w-full py-2 bg-transparent text-stone-400 hover:text-white font-semibold rounded-xl transition-all text-[10px] uppercase underline"
                            >
                                No mostrar de nuevo
                            </button>
                        </div>
                    </div>
                </div>
            )}`;

const fallbackSearch = `{signingReportId && (`;
if (code.includes(fallbackSearch)) {
    code = code.replace(fallbackSearch, modalStr + '\n            ' + fallbackSearch);
}

fs.writeFileSync(path, code);
console.log("Patched ReportesTrabajador");
