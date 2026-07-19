const fs = require('fs');
const path = require('path');

function getSecurityStats() {
  // Support logs/audit.log first (used by logger.js), then fallback to audit.log
  let logFilePath = path.join(__dirname, 'logs', 'audit.log');
  if (!fs.existsSync(logFilePath)) {
    logFilePath = path.join(__dirname, 'audit.log');
  }
  if (!fs.existsSync(logFilePath)) return { failedAttempts: 0, successfulLogins: 0 };
  
  const logData = fs.readFileSync(logFilePath, 'utf8');
  const lines = logData.split('\n');
  
  let failedAttempts = 0;
  let successfulLogins = 0;

  lines.forEach(line => {
    if (line.includes('failed_login_attempt')) failedAttempts++;
    if (line.includes('successful_login')) successfulLogins++;
  });

  return { failedAttempts, successfulLogins };
}

function getAuditLogs() {
  let logFilePath = path.join(__dirname, 'logs', 'audit.log');
  if (!fs.existsSync(logFilePath)) {
    logFilePath = path.join(__dirname, 'audit.log');
  }
  if (!fs.existsSync(logFilePath)) return [];

  const logData = fs.readFileSync(logFilePath, 'utf8');
  const lines = logData.split('\n').filter(line => line.trim() !== '');
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(log => log !== null).reverse().slice(0, 20);
}

module.exports = { getSecurityStats, getAuditLogs };
