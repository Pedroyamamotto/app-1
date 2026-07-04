const fs = require('fs');
const lines = fs.readFileSync('C:/Users/pedra/.gemini/antigravity/brain/15e75452-985c-4d61-b9ef-5face91e892c/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
lines.forEach(l => {
  if (l.includes('"step_index":983')) {
    try {
      const data = JSON.parse(l);
      if (data.step_index === 983) {
        fs.writeFileSync('original_user_request.txt', data.content);
        console.log('Saved');
      }
    } catch (e) {}
  }
});
