require('dotenv').config();
const app = require('./src/app');
const db = require('./src/db/pool');
const { start: startDecayScheduler } = require('./src/scheduler');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
  console.log('Database connected successfully');
  
  // Start decay scheduler
  startDecayScheduler();
});