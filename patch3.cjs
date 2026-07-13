const fs = require('fs');
const path = './components/musica/ReportsViewer.tsx';
let code = fs.readFileSync(path, 'utf8');

const searchStr = `            if (!authCheck.authorized) {
                showAlert(authCheck.reason);
                return;
            }`;
const insertStr = `
            if (authCheck.warning && !sessionStorage.getItem(\`warn_acked_\${globalUserId}\`)) {
                 setPendingSignWarning(authCheck.warning);
                 return;
            }`;

code = code.replace(searchStr, searchStr + insertStr);

const modalSearch = `{/* Custom Alert Overlay Modal perfectly aligned to the director's screen view */}`;
const modalInsert = `            {pendingSignWarning && (
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
                                    const globalUserId = (currentUser as any).id || currentUser.username;
                                    sessionStorage.setItem(\`warn_acked_\${globalUserId}\`, 'true');
                                    setPendingSignWarning(null);
                                    confirmSignReport();
                                }}
                                className="w-full py-3 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold rounded-xl transition-all text-xs uppercase"
                            >
                                Continuar y Firmar
                            </button>
                            <button
                                onClick={() => {
                                    const globalUserId = (currentUser as any).id || currentUser.username;
                                    localStorage.setItem(\`cmnl_pass_warn_dismissed_\${globalUserId}\`, 'true');
                                    sessionStorage.setItem(\`warn_acked_\${globalUserId}\`, 'true');
                                    setPendingSignWarning(null);
                                    confirmSignReport();
                                }}
                                className="w-full py-2 bg-transparent text-stone-400 hover:text-white font-semibold rounded-xl transition-all text-[10px] uppercase underline"
                            >
                                No mostrar de nuevo
                            </button>
                        </div>
                    </div>
                </div>
            )}
`;

code = code.replace(modalSearch, modalInsert + '\n            ' + modalSearch);

fs.writeFileSync(path, code);
console.log("Patched ReportsViewer");
