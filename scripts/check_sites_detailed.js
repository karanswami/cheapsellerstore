const { PrismaClient: DripPrisma } = require('@prisma/client');
const fs = require('fs');

const finalData = JSON.parse(fs.readFileSync('/tmp/analysis_final.json', 'utf8'));

async function main() {
    process.env.DATABASE_URL = process.env.DRIP_DB_URL;
    const dripPrisma = new DripPrisma();

    process.env.DATABASE_URL = process.env.GURU_DB_URL;
    const guruPrisma = new DripPrisma();

    console.log("Drip keys count:", await dripPrisma.key.count());
    console.log("Drip logs count:", await dripPrisma.supplierApiLog.count());
    console.log("Guru keys count:", await guruPrisma.key.count());
    console.log("Guru logs count:", await guruPrisma.supplierApiLog.count());

    // Check how many of the found keys exist in Guru DB vs Drip DB
    const foundKeys = finalData.found.map(f => f.key);

    const dripFoundInKeys = await dripPrisma.key.findMany({ where: { code: { in: foundKeys } } });
    const guruFoundInKeys = await guruPrisma.key.findMany({ where: { code: { in: foundKeys } } });

    console.log("Found in Drip Keys table:", dripFoundInKeys.length);
    console.log("Found in Guru Keys table:", guruFoundInKeys.length);

    const dripLogs = await dripPrisma.supplierApiLog.findMany();
    const guruLogs = await guruPrisma.supplierApiLog.findMany();

    let dripLogMatches = 0;
    let guruLogMatches = 0;

    for (const rk of foundKeys) {
        const inDrip = dripLogs.some(l => (l.responseJson || '').includes(rk) || (l.requestJson || '').includes(rk));
        const inGuru = guruLogs.some(l => (l.responseJson || '').includes(rk) || (l.requestJson || '').includes(rk));
        if (inDrip) dripLogMatches++;
        if (inGuru) guruLogMatches++;
    }

    console.log("Matches in Drip SupplierApiLog:", dripLogMatches);
    console.log("Matches in Guru SupplierApiLog:", guruLogMatches);

    await dripPrisma.$disconnect();
    await guruPrisma.$disconnect();
}

main().catch(console.error);
