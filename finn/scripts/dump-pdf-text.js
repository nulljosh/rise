const fs = require('fs');
const pdf = require('pdf-parse');

async function dumpPDF(file) {
  const dataBuffer = fs.readFileSync(file);
  const data = await pdf(dataBuffer);
  console.log('=== ' + file + ' ===\n');
  console.log(data.text);
  console.log('\n\n');
}

(async () => {
  await dumpPDF('/Users/joshua/Documents/Misc/statement/Oct.pdf');
  await dumpPDF('/Users/joshua/Documents/Misc/statement/Nov.pdf');
  await dumpPDF('/Users/joshua/Documents/Misc/statement/Dec.pdf');
  await dumpPDF('/Users/joshua/Documents/Misc/statement/January_2026.pdf');
})();
