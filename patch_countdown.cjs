const fs = require('fs');
const path = './components/FirmaDigitalTool.tsx';
let code = fs.readFileSync(path, 'utf8');

const importRegex = /export const FirmaDigitalTool =/;
const countdownComponent = `
const PasswordCountdown = ({ userId, cert }: { userId: string, cert: any }) => {
    const [timeLeft, setTimeLeft] = React.useState<{days: number, hours: number, minutes: number, seconds: number, expired: boolean} | null>(null);

    React.useEffect(() => {
        const updateTimer = () => {
            const lastUpdate = localStorage.getItem(\`cmnl_pass_updated_\${userId}\`);
            const isChangedInSession = typeof window !== 'undefined' && window.sessionStorage.getItem(\`cmnl_pass_session_changed_\${userId}\`) === 'true';
            
            let expirationTime = 0;
            
            if (!lastUpdate && !isChangedInSession) {
                const issueDate = cert?.issueDate ? new Date(cert.issueDate).getTime() : Date.now();
                expirationTime = issueDate + (72 * 60 * 60 * 1000);
            } else {
                const baseTime = parseInt(lastUpdate || Date.now().toString(), 10);
                expirationTime = baseTime + (30 * 24 * 60 * 60 * 1000);
            }
            
            const now = Date.now();
            const diff = expirationTime - now;
            
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeLeft({ days, hours, minutes, seconds, expired: false });
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [userId, cert]);

    if (!timeLeft) return null;

    if (timeLeft.expired) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={24} />
                <div className="text-left">
                    <p className="text-red-500 text-xs font-bold uppercase tracking-wide">Contraseña Caducada</p>
                    <p className="text-red-400/80 text-[10px]">Debe cambiar su contraseña inmediatamente para poder firmar.</p>
                </div>
            </div>
        );
    }

    const isWarning = timeLeft.days < 3;
    const colorClass = isWarning ? "text-yellow-500" : "text-green-500";
    const bgClass = isWarning ? "bg-yellow-500/10 border-yellow-500/20" : "bg-green-500/10 border-green-500/20";

    return (
        <div className={\`border p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 \${bgClass}\`}>
            <div className="flex items-center gap-2">
                <Lock size={16} className={colorClass} />
                <p className={\`text-xs font-bold uppercase tracking-wider \${colorClass}\`}>
                    Vigencia de Contraseña
                </p>
            </div>
            <div className="flex gap-3 text-center">
                <div className="flex flex-col">
                    <span className={\`text-2xl font-bold font-mono \${colorClass}\`}>{String(timeLeft.days).padStart(2, '0')}</span>
                    <span className={\`text-[8px] uppercase tracking-widest \${colorClass} opacity-80\`}>Días</span>
                </div>
                <span className={\`text-xl font-bold \${colorClass}\`}>:</span>
                <div className="flex flex-col">
                    <span className={\`text-2xl font-bold font-mono \${colorClass}\`}>{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className={\`text-[8px] uppercase tracking-widest \${colorClass} opacity-80\`}>Hrs</span>
                </div>
                <span className={\`text-xl font-bold \${colorClass}\`}>:</span>
                <div className="flex flex-col">
                    <span className={\`text-2xl font-bold font-mono \${colorClass}\`}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className={\`text-[8px] uppercase tracking-widest \${colorClass} opacity-80\`}>Min</span>
                </div>
                <span className={\`text-xl font-bold \${colorClass}\`}>:</span>
                <div className="flex flex-col">
                    <span className={\`text-2xl font-bold font-mono \${colorClass}\`}>{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className={\`text-[8px] uppercase tracking-widest \${colorClass} opacity-80\`}>Seg</span>
                </div>
            </div>
        </div>
    );
};

export const FirmaDigitalTool =`;

code = code.replace(importRegex, countdownComponent);

fs.writeFileSync(path, code);
console.log("Injected PasswordCountdown");
