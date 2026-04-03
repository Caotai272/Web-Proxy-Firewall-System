const { createLog } = require('../repositories/logRepository');

async function logAccess(entry) {
  return createLog(entry);
}

module.exports = {
  logAccess
};
