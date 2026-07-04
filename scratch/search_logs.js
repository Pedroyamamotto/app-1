const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:/Users/pedra/.gemini/antigravity/brain/15e75452-985c-4d61-b9ef-5face91e892c/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.step_index === 2922) {
      console.log('Found step 2922!');
      console.log(JSON.stringify(obj.tool_calls, null, 2));
    }
  }
}

run().catch(console.error);
