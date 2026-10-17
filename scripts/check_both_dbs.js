const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
    const dripPrisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DRIP_DB_URL
            }
        }
    });

    const guruPrisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.GURU_DB_URL
            }
        }
    });

    const dripUsersCount = await dripPrisma.user.count();
    const guruUsersCount = await guruPrisma.user.count();

    console.log("Drip Users count:", dripUsersCount);
    console.log("Guru Users count:", guruUsersCount);

    const dripOrdersCount = await dripPrisma.order.count();
    const guruOrdersCount = await guruPrisma.order.count();

    console.log("Drip Orders count:", dripOrdersCount);
    console.log("Guru Orders count:", guruOrdersCount);

    const dripLogsCount = await dripPrisma.supplierApiLog.count();
    const guruLogsCount = await guruPrisma.supplierApiLog.count();

    console.log("Drip SupplierApiLogs count:", dripLogsCount);
    console.log("Guru SupplierApiLogs count:", guruLogsCount);

    // Let's check sample user from drip vs guru
    const sampleDripUser = await dripPrisma.user.findFirst();
    const sampleGuruUser = await guruPrisma.user.findFirst();

    console.log("Sample Drip User:", sampleDripUser?.username);
    console.log("Sample Guru User:", sampleGuruUser?.username);

    await dripPrisma.$disconnect();
    await guruPrisma.$disconnect();
}

main().catch(console.error);
