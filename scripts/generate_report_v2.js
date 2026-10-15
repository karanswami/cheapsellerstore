const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/analysis_accurate.json', 'utf8'));

console.log(`### 📊 Consolidated Dual-Site Key Analysis Report`);
console.log(`- **Total Input Keys/IDs:** ${data.total}`);
console.log(`- **Unique Keys Found:** ${data.foundCount}`);
console.log(`- **Not Found Keys:** ${data.notFoundCount}\n`);

console.log(`### 📜 List 1: Details of Found Keys (${data.foundRecords.length} Match Records across Both Sites)\n`);
console.log(`| # | Key / License Code | Sell Time (IST) | Buyer Username / Email | Site Name | Product Name | Supplier / Source | Status |`);
console.log(`|---|---|---|---|---|---|---|---|`);

data.foundRecords.forEach((item, index) => {
    const timeFormatted = item.sellTime !== 'N/A' ? new Date(item.sellTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'N/A';
    console.log(`| ${index + 1} | \`${item.key}\` | ${timeFormatted} | **${item.user}** | \`${item.site}\` | ${item.product} | ${item.supplier} | ${item.status} |`);
});

console.log(`\n### ❌ List 2: Not Found Keys (${data.notFoundKeys.length} Keys)\n`);
if (data.notFoundKeys.length > 0) {
    data.notFoundKeys.forEach((k, idx) => {
        console.log(`${idx + 1}. \`${k}\``);
    });
} else {
    console.log("Sabhi keys ki details mil gayi hain!");
}
