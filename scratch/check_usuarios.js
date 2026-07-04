const { MongoClient } = require('C:/Users/pedra/OneDrive/Computador 2025/Documents/GitHub/YamaServerAPI/node_modules/mongodb');

async function run() {
  const client = await MongoClient.connect('mongodb+srv://yama:yamamotoo2026@cluster0.zdmdddy.mongodb.net/?appName=Cluster0');
  const db = client.db('DBservisos');
  
  const users = await db.collection('usuários').find({}).toArray();
  console.log('Total de usuários no banco:', users.length);
  users.forEach(u => {
    console.log(`- ID: ${u._id || u.id}, Nome: ${u.nome || u.name || u.displayName}, Tipo: ${u.tipo || u.role}`);
  });
  await client.close();
}

run().catch(console.error);
