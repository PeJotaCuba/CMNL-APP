const fs = require('fs');
const path = './utils/signatureUtils.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `    try {
        const cert = JSON.parse(certStr);
        if (cert.validUntil && new Date(cert.validUntil).getTime() < Date.now()) {
            return { authorized: false, reason: "Su certificado de firma digital ha caducado. Venció el " + new Date(cert.validUntil).toLocaleDateString() + ". Solicite una renovación con el administrador para poder firmar." };
        }
        
        let lastUpdate = localStorage.getItem(\`cmnl_pass_updated_\${userId}\`);
        const issueDate = cert.issueDate ? new Date(cert.issueDate).getTime() : Date.now();
        
        // 1. Password Reset state is Checked first:
        const dbSignaturesStr = localStorage.getItem('cmnl_digital_signatures');
        if (dbSignaturesStr) {
            try {
                const dbSignatures = JSON.parse(dbSignaturesStr);
                const resets = dbSignatures.password_resets || [];
                const activeReset = resets.find((r: any) => r.userId === userId && (Date.now() - r.grantedAt) < 24 * 60 * 60 * 1000);
                if (activeReset) {
                    return {
                        authorized: false,
                        reason: "Su contraseña de firma se encuentra en estado de REGENERACIÓN por olvido. Tiene una autorización temporal de 24 horas para definir una nueva contraseña local en la sección Firma Digital. No se le permite firmar reportes usando la contraseña original hasta completar el cambio."
                    };
                }
            } catch (e) {
                console.error("Error reading password_resets", e);
            }
        }

        // ONE-TIME MIGRATION: Start the 30-day count from TODAY if they already changed their password before.
        if (lastUpdate && !localStorage.getItem(\`cmnl_pass_migrated_30d_\${userId}\`)) {
            const nowTime = Date.now().toString();
            localStorage.setItem(\`cmnl_pass_updated_\${userId}\`, nowTime);
            localStorage.setItem(\`cmnl_pass_migrated_30d_\${userId}\`, 'true');
            lastUpdate = nowTime;
        }

        // Check session-level bypass for 72h rule (changed original for local password in active session)
        let isChangedInSession = false;
        if (typeof window !== 'undefined' && window.sessionStorage) {
            isChangedInSession = window.sessionStorage.getItem(\`cmnl_pass_session_changed_\${userId}\`) === 'true';
        }

        // 2. 72-hour rule: If they are using original password and 72 hours passed since issue
        if (!lastUpdate && !isChangedInSession) {
            if (Date.now() - issueDate > 72 * 60 * 60 * 1000) {
                return { 
                     authorized: false, 
                     reason: "Actualización de contraseña obligatoria vencida. Han transcurrido más de 72 horas desde la emisión del certificado sin cambiar la contraseña original. No podrá firmar ningún reporte con la contraseña original; debe cambiarla en la sección de Firma Digital." 
                 };
            }
        } else {
            // 3. 30-day rule: If 30 days passed since last password update
            const msSinceLastUpdate = Date.now() - parseInt(lastUpdate || Date.now().toString());
            if (msSinceLastUpdate > 30 * 24 * 60 * 60 * 1000) {
                return { 
                     authorized: false, 
                     reason: "Actualización de contraseña obligatoria vencida. Han transcurrido más de 30 días desde la última actualización de su contraseña. Debe establecer una nueva contraseña local en la sección Firma Digital o no podrá seguir firmando reportes." 
                 };
            }
            
            // Warning for 3 days before 30 days expire
            if (msSinceLastUpdate > 27 * 24 * 60 * 60 * 1000 && msSinceLastUpdate <= 30 * 24 * 60 * 60 * 1000) {
                if (localStorage.getItem(\`cmnl_pass_warn_dismissed_\${userId}\`) !== 'true') {
                    return {
                        authorized: true,
                        warning: "Su contraseña de firma caducará en menos de 3 días. Le recomendamos cambiarla pronto en la sección de Firma Digital para evitar bloqueos.",
                        warningCode: "30_DAY_EXPIRING_SOON"
                    };
                }
            }
        }
        
        return { authorized: true };
    } catch(e) {
        return { authorized: false, reason: "Error al validar la contraseña y fecha del certificado." };
    }`;

const startIndex = code.indexOf('    try {');
const endIndex = code.lastIndexOf('    } catch(e) {') + code.substring(code.lastIndexOf('    } catch(e) {')).indexOf('}}') + 2;

if (startIndex > -1 && endIndex > -1) {
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync(path, code);
    console.log("Patched successfully");
} else {
    console.log("Could not find boundaries");
}
