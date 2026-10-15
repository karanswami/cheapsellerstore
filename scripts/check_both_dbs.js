const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
    const dripPrisma = new PrismaClient({
        datasources: {
            db: {
                url: "mongodb+srv://guru_gaming:OLSvzzl00TYZoLJX@gurugaming.5kqpl3y.mongodb.net/drip-client-reseller?retryWrites=true&w=majority"
            }
        }
    });

    const guruPrisma = new PrismaClient({
        datasources: {
            db: {
                url: "mongodb+srv://guru_gaming:OLSvzzl00TYZoLJX@gurugaming.5kqpl3y.mongodb.net/gurugaminghub_store?retryWrites=true&w=majority"
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
