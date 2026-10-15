const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/analysis_final.json', 'utf8'));

console.log(`### 📊 Summary Report`);
console.log(`- **Total Input Keys/IDs:** ${data.total}`);
console.log(`- **Found Keys (with Details):** ${data.foundCount}`);
console.log(`- **Not Found Keys:** ${data.notFoundCount}\n`);

console.log(`### 📜 List 1: Found Keys Details (${data.foundCount} Keys)\n`);
console.log(`| # | Key / License Code | Sell Time | Username / Email | Site Name | Product Name | Supplier / Source | Status |`);
console.log(`|---|---|---|---|---|---|---|---|`);

data.found.forEach((item, index) => {
    const timeFormatted = item.sellTime !== 'N/A' ? new Date(item.sellTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'N/A';
    console.log(`| ${index + 1} | \`${item.key}\` | ${timeFormatted} | **${item.user}** | \`${item.site}\` | ${item.product} | ${item.supplier} | ${item.status} |`);
});

console.log(`\n### ❌ List 2: Not Found Keys (${data.notFoundCount} Keys)\n`);
console.log(`> Yeh keys kisi bhi database (Key table, Order records, ya Supplier API Logs) me nahi mili. Direct list niche di gayi hai:\n`);

data.notFound.forEach((k, idx) => {
    console.log(`${idx + 1}. \`${k}\``);
});
