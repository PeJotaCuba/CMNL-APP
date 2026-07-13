const fs = require('fs');
const path = './App.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/, UpdateReminderModal /, ' ');
code = code.replace(/const \[showUpdateReminder, setShowUpdateReminder\] = useState\\(false\\);\\n/g, '');

const modalStart = code.indexOf('<UpdateReminderModal');
if (modalStart > -1) {
    const modalEnd = code.indexOf('/>', modalStart) + 2;
    code = code.substring(0, modalStart) + code.substring(modalEnd);
}

fs.writeFileSync(path, code);
console.log("Cleanup done");
