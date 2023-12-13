import winston from "winston";
import config from "config";

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
});

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
)

const transports = [
  new winston.transports.Console()
]

const level = () => {
  const isDevelopment = config.environment === 'development'
  return isDevelopment ? 'debug' : 'info'
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

const Logger = winston.createLogger({
  levels,
  format,
  transports,
  level: level()
})

export default Logger;
