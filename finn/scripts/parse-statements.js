#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const STATEMENTS_DIR = '/Users/joshua/Documents/Misc/statement/';
const OUTPUT_FILE = path.join(__dirname, '..', 'statements-data.json');

// Category mapping based on transaction description patterns
const CATEGORIES = {
  'STARBUCKS': 'Food',
  'TIM HORTONS': 'Food',
  'MCDONALDS': 'Food',
  'A&W': 'Food',
  'SUBWAY': 'Food',
  'DOMINOS': 'Food',
  'UBER EATS': 'Food',
  'DOORDASH': 'Food',
  'RESTAURANT': 'Food',
  'GROCERY': 'Food',
  'SAFEWAY': 'Food',
  'SUPERSTORE': 'Food',
  'SAVE ON FOODS': 'Food',
  'NETFLIX': 'Subscriptions',
  'SPOTIFY': 'Subscriptions',
  'APPLE.COM/BILL': 'Subscriptions',
  'CLAUDE': 'Subscriptions',
  'DISNEY': 'Subscriptions',
  'AMAZON PRIME': 'Subscriptions',
  'TRANSFER FROM': 'Transfers',
  'TRANSFER TO': 'Transfers',
  'E-TRANSFER': 'Transfers',
  'INTERAC': 'Transfers',
  'DIRECT DEPOSIT': 'Income',
  'PAYROLL': 'Income',
  'INTEREST': 'Income',
  'GYM': 'Health',
  'FITNESS': 'Health',
  'GOODLIFE': 'Health',
  'PHARMACY': 'Health',
  'TELUS': 'Phone',
  'BELL': 'Phone',
  'ROGERS': 'Phone',
};

function categorizeTransaction(description) {
  const desc = description.toUpperCase();

  for (const [pattern, category] of Object.entries(CATEGORIES)) {
    if (desc.includes(pattern)) {
      return category;
    }
  }

  return 'Other';
}

function parseMonthFromFilename(filename) {
  // Oct.pdf -> 2025-10, Nov.pdf -> 2025-11, etc.
  const months = {
    'OCT': '2025-10',
    'NOV': '2025-11',
    'DEC': '2025-12',
    'JANUARY_2026': '2026-01',
  };

  const name = filename.toUpperCase().replace('.PDF', '');
  return months[name] || null;
}

async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);

  return data.text;
}

function extractTransactions(text, month) {
  const lines = text.split('\n');
  const transactions = [];
  let openingBalance = 0;
  let closingBalance = 0;

  // Look for opening/closing balance patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('Opening balance') || line.includes('OPENING BALANCE')) {
      const nextLine = lines[i + 1]?.trim() || '';
      const match = nextLine.match(/\$?([\d,]+\.\d{2})/);
      if (match) {
        openingBalance = parseFloat(match[1].replace(/,/g, ''));
      }
    }

    if (line.includes('Closing balance') || line.includes('CLOSING BALANCE')) {
      const nextLine = lines[i + 1]?.trim() || '';
      const match = nextLine.match(/\$?([\d,]+\.\d{2})/);
      if (match) {
        closingBalance = parseFloat(match[1].replace(/,/g, ''));
      }
    }

    // Extract transactions (date | description | amount | balance format)
    // Looking for patterns like: "Jan 15" or "2026-01-15" followed by description and amounts
    const dateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/);
    if (dateMatch) {
      const description = lines[i + 1]?.trim() || '';
      const amountLine = lines[i + 2]?.trim() || '';

      const amountMatch = amountLine.match(/-?\$?([\d,]+\.\d{2})/);
      if (amountMatch && description) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        const isDebit = amountLine.includes('-') || amount < 0;

        transactions.push({
          date: dateMatch[0],
          description: description,
          amount: isDebit ? -Math.abs(amount) : amount,
          category: categorizeTransaction(description),
        });
      }
    }
  }

  // Calculate totals by category
  const categories = {};
  let totalSpending = 0;

  transactions.forEach(t => {
    if (t.amount < 0) {
      totalSpending += t.amount;
    }

    if (!categories[t.category]) {
      categories[t.category] = 0;
    }
    categories[t.category] += t.amount;
  });

  return {
    month,
    openingBalance,
    closingBalance,
    totalSpending,
    categories,
    transactionCount: transactions.length,
    transactions: transactions.slice(0, 10), // Include first 10 for reference
  };
}

async function main() {
  console.log('Parsing bank statements...\n');

  const files = fs.readdirSync(STATEMENTS_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort();

  const statements = [];

  for (const file of files) {
    const filePath = path.join(STATEMENTS_DIR, file);
    const month = parseMonthFromFilename(file);

    if (!month) {
      console.log(`Skipping ${file} - couldn't parse month`);
      continue;
    }

    console.log(`Processing ${file} (${month})...`);

    try {
      const text = await parsePDF(filePath);
      const data = extractTransactions(text, month);
      statements.push(data);

      console.log(`  Transactions: ${data.transactionCount}`);
      console.log(`  Total spending: $${data.totalSpending.toFixed(2)}`);
      console.log(`  Opening: $${data.openingBalance.toFixed(2)} -> Closing: $${data.closingBalance.toFixed(2)}`);
      console.log('');
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  // Sort by month
  statements.sort((a, b) => a.month.localeCompare(b.month));

  // Write output
  const output = {
    generated: new Date().toISOString(),
    statements,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nData saved to ${OUTPUT_FILE}`);

  // Print summary
  console.log('\n=== SUMMARY ===');
  statements.forEach(s => {
    console.log(`${s.month}: $${s.totalSpending.toFixed(2)} spending across ${s.transactionCount} transactions`);
  });
}

main().catch(console.error);
