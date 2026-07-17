const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create Winston Logger for audit trails
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Output all logs to audit.log as JSON objects
    new winston.transports.File({ 
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 5242880, // 5MB limit
      maxFiles: 5,
    }),
    // Output colorized, human-readable logs to the console for real-time monitoring
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          const metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    })
  ]
});

module.exports = logger;
