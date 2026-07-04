const { MongoClient, ObjectId } = require('C:/Users/pedra/OneDrive/Computador 2025/Documents/GitHub/YamaServerAPI/node_modules/mongodb');

async function run() {
  const client = await MongoClient.connect('mongodb+srv://yama:yamamotoo2026@cluster0.zdmdddy.mongodb.net/?appName=Cluster0');
  const db = client.db('DBservisos');
  
  const user = await db.collection('usuários').findOne({ _id: new ObjectId("69b1c3b9cec65a495eaccef7") });
  console.log('User document:', JSON.stringify(user, null, 2));
  
  await client.close();
}

run().catch(console.error);
