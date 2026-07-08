const fs = require('fs');

const file = './components/musica/ReportsModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /    \} else \{\n\s*\/\/ Trimestral, Semestral, Anual[\s\S]*?totalCount: aggTracks\.length\n\s*\};\n\s*\}/;

const replacement = `    } else {
      // Trimestral, Semestral, Anual
      const months = getMonthsForPeriod(selectedMonthStr, activePeriod);
      
      const authorsMap: Record<string, { name: string; nac: string; cant: number; frec: number }> = {};
      const perfsMap: Record<string, { name: string; nac: string; cant: number; frec: number }> = {};
      const genresMap: Record<string, { name: string; cant: number; frec: number }> = {};
      const songsMap: Record<string, { track: any; count: number }> = {};
      let totalWorksAccum = 0;

      months.forEach(mKey => {
        let report = archiveMensual[mKey];
        if (!report) {
           report = calculateLiveMensualForMonth(mKey);
        }
        if (report) {
          totalWorksAccum += report.totalWorks || 0;
          
          if (report.topAuthors) {
            report.topAuthors.forEach((a: any) => {
               const key = (a.name || '').toUpperCase();
               if (!key) return;
               if (!authorsMap[key]) authorsMap[key] = { name: a.name, nac: a.nac, cant: 0, frec: 0 };
               authorsMap[key].cant += (typeof a.execs === 'number' ? a.execs : parseInt(a.execs || '0'));
               authorsMap[key].frec += (typeof a.frec === 'number' ? a.frec : parseInt(a.frec || '0'));
            });
          }
          if (report.topPerformers) {
            report.topPerformers.forEach((a: any) => {
               const key = (a.name || '').toUpperCase();
               if (!key) return;
               if (!perfsMap[key]) perfsMap[key] = { name: a.name, nac: a.nac, cant: 0, frec: 0 };
               perfsMap[key].cant += (typeof a.execs === 'number' ? a.execs : parseInt(a.execs || '0'));
               perfsMap[key].frec += (typeof a.frec === 'number' ? a.frec : parseInt(a.frec || '0'));
            });
          }
          if (report.topGenres) {
            report.topGenres.forEach((a: any) => {
               const key = (a.name || '').toUpperCase();
               if (!key) return;
               if (!genresMap[key]) genresMap[key] = { name: a.name, cant: 0, frec: 0 };
               genresMap[key].cant += (typeof a.execs === 'number' ? a.execs : parseInt(a.execs || '0'));
               genresMap[key].frec += (typeof a.frec === 'number' ? a.frec : (a.frec ? parseInt(a.frec || '0') : (typeof a.execs === 'number' ? a.execs : parseInt(a.execs || '0'))));
            });
          }
          if (report.topSongs) {
            report.topSongs.forEach((s: any) => {
               const track = s.track || {};
               const key = \`\${(track.title || '').toUpperCase()}-\${(track.performer || '').toUpperCase()}\`;
               if (!songsMap[key]) songsMap[key] = { track, count: 0 };
               songsMap[key].count += (typeof s.count === 'number' ? s.count : parseInt(s.count || '0'));
            });
          }
        }
      });

      const toTopArray = (map: Record<string, any>) => Object.values(map)
        .map((x: any) => ({ ...x, execs: x.cant, frec: x.frec }))
        .sort((a, b) => b.frec - a.frec)
        .slice(0, 5);

      return {
        topSongs: Object.values(songsMap).sort((a, b) => b.count - a.count).slice(0, 5),
        topAuthors: toTopArray(authorsMap),
        topPerformers: toTopArray(perfsMap),
        topGenres: toTopArray(genresMap),
        totalCount: totalWorksAccum
      };
    }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log("Successfully replaced the else block.");
} else {
    console.log("Could not find the else block to replace.");
}
