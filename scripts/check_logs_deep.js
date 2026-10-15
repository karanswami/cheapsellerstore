const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const finalData = JSON.parse(fs.readFileSync('/tmp/analysis_final.json', 'utf8'));
const notFoundKeys = finalData.notFound;

async function main() {
    process.env.DATABASE_URL = "mongodb+srv://guru_gaming:OLSvzzl00TYZoLJX@gurugaming.5kqpl3y.mongodb.net/drip-client-reseller?retryWrites=true&w=majority";
    const dripPrisma = new PrismaClient();

    process.env.DATABASE_URL = "mongodb+srv://guru_gaming:OLSvzzl00TYZoLJX@gurugaming.5kqpl3y.mongodb.net/gurugaminghub_store?retryWrites=true&w=majority";
    const guruPrisma = new PrismaClient();

    console.log("Checking ActivityLogs in both DBs for remaining 61 keys...");

    for (const siteName of ['dripclientofficial.dev', 'gurugaminghub']) {
        const prisma = siteName === 'dripclientofficial.dev' ? dripPrisma : guruPrisma;
        const actLogs = await prisma.activityLog.findMany();
        for (const log of actLogs) {
            const metaStr = JSON.stringify(log.metadata || {});
            const msgStr = log.message || '';
            for (const rk of notFoundKeys) {
                if (metaStr.includes(rk) || msgStr.includes(rk)) {
                    console.log(`Found in ActivityLog [${siteName}]: ${rk}`, log);
                }
            }
        }
    }

    await dripPrisma.$disconnect();
    await guruPrisma.$disconnect();
}

main().catch(console.error);
