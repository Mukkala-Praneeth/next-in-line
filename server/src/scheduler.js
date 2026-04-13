require('dotenv').config();
const { checkAndDecay } = require('./services/decayService');

const INTERVAL_MS = process.env.DECAY_CHECK_INTERVAL_MS || 60000; // 60 seconds

let intervalId = null;

const start = () => {
  if (intervalId) return;

  console.log(`Decay scheduler started — checking every ${INTERVAL_MS / 1000}s`);

  intervalId = setInterval(async () => {
    try {
      const decayed = await checkAndDecay();
      if (decayed > 0) {
        console.log(`Decay check — ${decayed} applicant(s) decayed and pushed back`);
      }
    } catch (err) {
      console.error('Decay scheduler error:', err);
    }
  }, INTERVAL_MS);
};

const stop = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Decay scheduler stopped');
  }
};

module.exports = { start, stop };