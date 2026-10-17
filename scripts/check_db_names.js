const { MongoClient } = require('mongodb');
const fs = require('fs');

async function main() {
    const dripUri = process.env.DRIP_DB_URL;
    const guruUri = process.env.GURU_DB_URL;

    const clientDrip = new MongoClient(dripUri);
    await clientDrip.connect();
    const dripDb = clientDrip.db('drip-client-reseller');

    const clientGuru = new MongoClient(guruUri);
    await clientGuru.connect();
    const guruDb = clientGuru.db('gurugaminghub_store');

    const keysInput = JSON.parse(fs.readFileSync('/tmp/analysis_final.json', 'utf8'));
    const allKeys = [...keysInput.found.map(f => f.key), ...keysInput.notFound];

    console.log("Checking MongoDB collections directly for both DBs...");

    const dripLogs = await dripDb.collection('SupplierApiLog').find({}).toArray();
    const guruLogs = await guruDb.collection('SupplierApiLog').find({}).toArray();

    console.log("Drip SupplierApiLog total docs:", dripLogs.length);
    console.log("Guru SupplierApiLog total docs:", guruLogs.length);

    const dripOrders = await dripDb.collection('Order').find({}).toArray();
    const guruOrders = await guruDb.collection('Order').find({}).toArray();
    console.log("Drip Orders total docs:", dripOrders.length);
    console.log("Guru Orders total docs:", guruOrders.length);

    const dripUsers = await dripDb.collection('User').find({}).toArray();
    const guruUsers = await guruDb.collection('User').find({}).toArray();
    console.log("Drip Users count:", dripUsers.length);
    console.log("Guru Users count:", guruUsers.length);

    await clientDrip.close();
    await clientGuru.close();
}

main().catch(console.error);
