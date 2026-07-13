const fs = require('fs');
const path = './App.tsx';
let code = fs.readFileSync(path, 'utf8');

const search = `  // Update Reminder Check - Mandatory every 24 hours
  useEffect(() => {
    if (currentUser) {
      const lastSyncStr = localStorage.getItem('last_sync_time');
      if (lastSyncStr) {
        const lastSync = parseInt(lastSyncStr, 10);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (now - lastSync > twentyFourHours) {
          setShowUpdateReminder(true);
        }
      } else {
        // Force initial update/sync to establish the baseline sync time
        setShowUpdateReminder(true);
      }
    }
  }, [currentUser]);`;

const replacement = `  // Update Reminder Check - Mandatory every 48 hours
  useEffect(() => {
    if (currentUser) {
      const lastSyncStr = localStorage.getItem('last_sync_time');
      if (lastSyncStr) {
        const lastSync = parseInt(lastSyncStr, 10);
        const now = Date.now();
        const fortyEightHours = 48 * 60 * 60 * 1000;
        if (now - lastSync > fortyEightHours) {
          handleCloudSync(true);
        }
      } else {
        // Force initial update/sync to establish the baseline sync time
        handleCloudSync(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);`;

if (code.includes(search)) {
    code = code.replace(search, replacement);
    fs.writeFileSync(path, code);
    console.log("Patched successfully");
} else {
    console.log("Could not find the search string");
}
