const fs = require('fs');
let code = fs.readFileSync('components/FirmaDigitalTool.tsx', 'utf8');

const startStr = `      })();
      return;

      const enc = new TextEncoder();`;

const endStr = `      downloadLink.click();
      showAlert("¡Certificado descargado con éxito! Se ha guardado un archivo HTML protegido por contraseña. Ábrelo en cualquier navegador con tu contraseña completa para visualizar o imprimir el PDF original.", 'success');
    } catch (e: any) {`;

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const finalEndIndex = endIndex + endStr.length;
  code = code.substring(0, startIndex) + `      })();
    } catch (e: any) {` + code.substring(finalEndIndex);
  fs.writeFileSync('components/FirmaDigitalTool.tsx', code);
  console.log('Successfully removed dead code');
} else {
  console.log('Not found: ' + startIndex + ' ' + endIndex);
}
