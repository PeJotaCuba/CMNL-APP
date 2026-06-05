import fs from 'fs';
let content = fs.readFileSync('./components/musica/ReportsModal.tsx', 'utf8');

// Use literal replace since regex with newlines might have failed.
let s1 = `      // Auto-archive standard music stats
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
      if (currentLiveM.totalWorks > 0 && !archiveMensual[monthKey]) {
        saveToArchive('mensual', monthKey, currentLiveM);
      }

      // Auto-archive economy stats
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
      if (currentLiveE.completasTotal > 0 && !archiveEconomia[monthKey]) {
        saveToArchive('economia', monthKey, currentLiveE);
      }

      // Auto-archive incidental stats
      const currentLiveI = getIncidentalStatsForMonth(selectedYear, selectedMonthNum);
      if (currentLiveI.totalWorks > 0 && !archiveIncidental[monthKey]) {
        saveToArchive('incidental', monthKey, currentLiveI);
      }`;

content = content.replace(s1, '');

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

content = content.replace("const handleGenerateDOCX_Music = async () =>", handleArchivarString + "\n  const handleGenerateDOCX_Music = async () =>");

fs.writeFileSync('./components/musica/ReportsModal.tsx', content);
