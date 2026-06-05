const fs = require('fs');
let content = fs.readFileSync('./components/musica/ReportsModal.tsx', 'utf8');
content = content.replace(
  'className="bg-[#2C1B15] border border-[#9E7649]/30 hover:bg-[#3E1A0F] text-white text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold"\n                         >\n                           <FileDown size={12} /> Ver / Descargar\n                         </button>',
  `className="bg-[#2C1B15] border border-[#9E7649]/30 hover:bg-[#3E1A0F] text-white text-[10px] px-3 py-1.5 rounded-lg flex justify-center items-center gap-1 font-bold w-full"
                         >
                           <FileDown size={12} /> Ver / Descargar
                         </button>
                         <button
                           onClick={() => {
                             if(confirm(\`¿Está seguro que desea eliminar del archivo el mes \${mStr}?\`)) {
                               deleteFromArchive(archiveManagerType, mStr);
                             }
                           }}
                           className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/30 text-red-300 text-[10px] px-3 py-1.5 rounded-lg flex justify-center items-center gap-1 font-bold w-full mt-2 transition-colors"
                         >
                           <Trash2 size={12} /> Eliminar
                         </button>`
);
fs.writeFileSync('./components/musica/ReportsModal.tsx', content);
