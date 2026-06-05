import fs from 'fs';
let content = fs.readFileSync('./components/musica/ReportsModal.tsx', 'utf8');

// remove Auto-archives from useEffect
content = content.replace(/\/\/ Auto-archive standard music stats[\s\S]*?saveToArchive\('incidental', monthKey, currentLiveI\);\n      }/, '');

// Create handleArchivar manually
let handleArchivarString = `
  const handleArchivar = () => {
    const monthKey = selectedMonthStr;
    if (activeReportType === 'mensual') {
      const currentLiveM = {
        totalWorks: totalWorksCount,
        cubaWorks: totalWorksCuba,
        foreignWorks: totalWorksForeign,
        totalAuthors: uniqueAuthorsList.length,
        cubaAuthors: cubanAuthorsCount,
        foreignAuthors: foreignAuthorsCount,
        totalPerformers: uniquePerformersList.length,
        cubaPerformers: cubanPerformersCount,
        foreignPerformers: foreignPerformersCount
      };
      saveToArchive('mensual', monthKey, currentLiveM);
      alert('Informe Mensual guardado en Archivo.');
    } else if (activeReportType === 'economia') {
      const currentLiveE = {
        completasCubana: totalWorksCuba,
        completasExtranjera: totalWorksForeign,
        completasTotal: totalWorksCount,
        instrumentalesCubana: countDaysInMonth(selectedYear, selectedMonthNum, [1, 2, 3, 4, 5]),
        instrumentalesExtranjera: 0,
        instrumentalesTotal: countDaysInMonth(selectedYear, selectedMonthNum, [1, 2, 3, 4, 5]),
        incidentalesCubana: getIncidentalStatsForMonth(selectedYear, selectedMonthNum).totalWorks,
        incidentalesExtranjera: 0,
        incidentalesTotal: getIncidentalStatsForMonth(selectedYear, selectedMonthNum).totalWorks
      };
      saveToArchive('economia', monthKey, currentLiveE);
      alert('Informe Economía guardado en Archivo.');
    } else if (activeReportType === 'incidental') {
      const currentLiveI = getIncidentalStatsForMonth(selectedYear, selectedMonthNum);
      saveToArchive('incidental', monthKey, currentLiveI);
      alert('Informe Incidental guardado en Archivo.');
    }
  };
`;

// Insert the function before handleGenerateDOCX_Music
content = content.replace("const handleGenerateDOCX_Music = async () =>", handleArchivarString + "\n  const handleGenerateDOCX_Music = async () =>");

fs.writeFileSync('./components/musica/ReportsModal.tsx', content);
