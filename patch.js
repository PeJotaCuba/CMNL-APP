const fs = require('fs');
const content = fs.readFileSync('./components/musica/ReportsModal.tsx', 'utf-8');

const regex = /\s*\/\/ Compute calculated statistics for Incidental Report[\s\S]*?const currentIncidentalStats = getIncidentalRegionStats\(\);/;
const match = content.match(regex);

if (match) {
    const extracted = match[0];
    let newContent = content.replace(regex, '');
    
    // Insert before getAggregatedPeriodStats
    const insertPoint = newContent.indexOf('const getAggregatedPeriodStats = () => {');
    newContent = newContent.slice(0, insertPoint) + extracted + '\n\n  ' + newContent.slice(insertPoint);
    
    fs.writeFileSync('./components/musica/ReportsModal.tsx', newContent);
    console.log('Moved successfully!');
} else {
    console.log('Match not found');
}
