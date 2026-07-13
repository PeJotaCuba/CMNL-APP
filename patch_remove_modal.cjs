const fs = require('fs');
const path = './components/UpdateDialogs.tsx';
let code = fs.readFileSync(path, 'utf8');

const modalStart = code.indexOf('interface UpdateReminderModalProps');
if (modalStart > -1) {
    code = code.substring(0, modalStart);
    fs.writeFileSync(path, code);
    console.log("Removed UpdateReminderModal");
}
