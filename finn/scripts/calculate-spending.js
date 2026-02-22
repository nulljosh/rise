const fs = require('fs');
const pdf = require('pdf-parse');

async function extractSpending(filePath, monthName) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  const lines = data.text.split('\n');

  let totalSpending = 0;
  let categories = {
    food: 0,
    subscriptions: 0,
    phone: 0,
    health: 0,
    vape: 0,
    transfers: 0,
    shopping: 0,
    atm: 0,
    bankFees: 0,
    uncategorized: 0
  };

  // Parse each line looking for amounts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match transaction lines with negative amounts (spending)
    const match = line.match(/–\$([\d,]+\.\d{2})/);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      totalSpending += amount;

      const desc = lines[i - 1]?.toUpperCase() || '';

      // Categorize
      if (desc.includes('DOMINOS') || desc.includes('STARBUCKS') || desc.includes('MCDONALDS') ||
          desc.includes('CHACHI') || desc.includes('CHIPOTLE') || desc.includes('SUBWAY') ||
          desc.includes('FIVE GUYS') || desc.includes('A&W') || desc.includes('DAIRY QUEEN') ||
          desc.includes('FRESHSLICE') || desc.includes('PIZZA') || desc.includes('TIM HORTONS') ||
          desc.includes('SKIP') || desc.includes('DOORDASH') || desc.includes('UBER EATS')) {
        categories.food += amount;
      } else if (desc.includes('CLAUDE') || desc.includes('NETFLIX') || desc.includes('OPENAI') ||
                 desc.includes('CHATGPT') || desc.includes('SPOTIFY') || desc.includes('YOUTUBE') ||
                 desc.includes('AMAZON PRIME') || desc.includes('APPLE') || desc.includes('GITHUB')) {
        categories.subscriptions += amount;
      } else if (desc.includes('BELL') || desc.includes('TELUS') || desc.includes('ROGERS')) {
        categories.phone += amount;
      } else if (desc.includes('CLUB16') || desc.includes('GYM') || desc.includes('FITNESS')) {
        categories.health += amount;
      } else if (desc.includes('VAPE') || desc.includes('VAPORY')) {
        categories.vape += amount;
      } else if (desc.includes('TRANSFER FROM') || desc.includes('TRANSFER TO') ||
                 desc.includes('E-TRANSFER') || desc.includes('INTERAC')) {
        categories.transfers += amount;
      } else if (desc.includes('AMAZON') || desc.includes('WALMART') || desc.includes('COSTCO') ||
                 desc.includes('DOLLARAMA') || desc.includes('BEST BUY') || desc.includes('CANADIAN TIRE')) {
        categories.shopping += amount;
      } else if (desc.includes('ATM WITHDRAWAL') || desc.includes('CASH WITHDRAWAL')) {
        categories.atm += amount;
      } else if (desc.includes('MONTHLY FEE') || desc.includes('SERVICE CHARGE') ||
                 desc.includes('NSF FEE') || desc.includes('OVERDRAFT')) {
        categories.bankFees += amount;
      } else {
        categories.uncategorized += amount;
      }
    }
  }

  return {
    month: monthName,
    total: Math.round(totalSpending),
    categories
  };
}

(async () => {
  const oct = await extractSpending('/Users/joshua/Documents/Misc/statement/Oct.pdf', 'Oct');
  const nov = await extractSpending('/Users/joshua/Documents/Misc/statement/Nov.pdf', 'Nov');
  const dec = await extractSpending('/Users/joshua/Documents/Misc/statement/Dec.pdf', 'Dec');
  const jan = await extractSpending('/Users/joshua/Documents/Misc/statement/January_2026.pdf', 'Jan');

  console.log('\n=== ACTUAL SPENDING DATA ===\n');
  console.log(`Oct 2025: $${oct.total}`);
  console.log(`Nov 2025: $${nov.total}`);
  console.log(`Dec 2025: $${dec.total}`);
  console.log(`Jan 2026: $${jan.total}`);

  console.log('\n=== CATEGORY TOTALS (4 months) ===\n');
  const totals = {
    food: oct.categories.food + nov.categories.food + dec.categories.food + jan.categories.food,
    subscriptions: oct.categories.subscriptions + nov.categories.subscriptions + dec.categories.subscriptions + jan.categories.subscriptions,
    phone: oct.categories.phone + nov.categories.phone + dec.categories.phone + jan.categories.phone,
    health: oct.categories.health + nov.categories.health + dec.categories.health + jan.categories.health,
    vape: oct.categories.vape + nov.categories.vape + dec.categories.vape + jan.categories.vape,
    transfers: oct.categories.transfers + nov.categories.transfers + dec.categories.transfers + jan.categories.transfers,
    shopping: oct.categories.shopping + nov.categories.shopping + dec.categories.shopping + jan.categories.shopping,
    atm: oct.categories.atm + nov.categories.atm + dec.categories.atm + jan.categories.atm,
    bankFees: oct.categories.bankFees + nov.categories.bankFees + dec.categories.bankFees + jan.categories.bankFees,
    uncategorized: oct.categories.uncategorized + nov.categories.uncategorized + dec.categories.uncategorized + jan.categories.uncategorized
  };

  console.log(`Food & Dining: $${Math.round(totals.food)} (avg $${Math.round(totals.food/4)}/mo)`);
  console.log(`Subscriptions: $${Math.round(totals.subscriptions)}`);
  console.log(`Phone & Internet: $${Math.round(totals.phone)}`);
  console.log(`Health & Fitness: $${Math.round(totals.health)}`);
  console.log(`Vape: $${Math.round(totals.vape)}`);
  console.log(`Transfers: $${Math.round(totals.transfers)}`);
  console.log(`Shopping: $${Math.round(totals.shopping)}`);
  console.log(`ATM/Cash: $${Math.round(totals.atm)}`);
  console.log(`Bank Fees: $${Math.round(totals.bankFees)}`);
  console.log(`Uncategorized: $${Math.round(totals.uncategorized)}`);
  console.log(`\nGrand Total: $${oct.total + nov.total + dec.total + jan.total}`);

  // Output for SVG graph
  console.log('\n=== FOR SVG GRAPH ===');
  console.log(`Oct: $${oct.total} -> y=${170 - (oct.total / 10)}`);
  console.log(`Nov: $${nov.total} -> y=${170 - (nov.total / 10)}`);
  console.log(`Dec: $${dec.total} -> y=${170 - (dec.total / 10)}`);
  console.log(`Jan: $${jan.total} -> y=${170 - (jan.total / 10)}`);

})();
