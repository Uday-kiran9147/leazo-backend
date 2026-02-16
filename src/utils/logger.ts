import chalk from 'chalk';

/**
 * Enumeration of available logging levels for the application logger.
 * @enum {string}
 * @property {string} INFO - Informational messages for general application flow
 * @property {string} WARN - Warning messages for potentially harmful situations
 * @property {string} ERROR - Error messages for recoverable error conditions
 * @property {string} DEBUG - Debug messages for development and troubleshooting
 * @property {string} SUCCESS - Success messages indicating successful operations
 * @property {string} FATAL - Fatal messages for severe errors causing application termination
 */
export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
    SUCCESS = 'SUCCESS',
    FATAL = 'FATAL'
}

class Logger {
    private static instance: Logger;
    private isProduction = process.env.NODE_ENV === 'production';

    private constructor() {}

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private getTimestamp(): string {
        return new Date().toLocaleString();
    }

    private format(level: LogLevel, message: string, ...args: any[]): string {
        const timestamp = chalk.dim(`[${this.getTimestamp()}]`);
        const levelStyled = this.styleLevel(level);
        
        let formattedMessage = `${timestamp} ${levelStyled} ${chalk.white(message)}`;

        if (args.length > 0) {
            const meta = args.map(arg => {
                if (arg instanceof Error) {
                    return chalk.red(`\nStack: ${arg.stack}`);
                }
                if (typeof arg === 'object' && arg !== null) {
                    // Check if it's a wrapped error: { error: Error }
                    if ('error' in arg && arg.error instanceof Error) {
                        return chalk.red(`\nWrapped Error Stack: ${arg.error.stack}`);
                    }
                    try {
                        return `\n${chalk.cyan(JSON.stringify(arg, null, 2))}`;
                    } catch (e) {
                        return ` [Circular or unformattable object]`;
                    }
                }
                return ` ${arg}`;
            }).join('');
            formattedMessage += meta;
        }

        return formattedMessage;
    }

    private styleLevel(level: LogLevel): string {
        switch (level) {
            case LogLevel.INFO:
                return chalk.blue.bold(`[${level}]`);
            case LogLevel.SUCCESS:
                return chalk.green.bold(`[${level}]`);
            case LogLevel.WARN:
                return chalk.yellow.bold(`[${level}]`);
            case LogLevel.ERROR:
                return chalk.red.bold(`[${level}]`);
            case LogLevel.FATAL:
                return chalk.bgRed.white.bold(`[${level}]`);
            case LogLevel.DEBUG:
                return chalk.magenta.bold(`[${level}]`);
            default:
                return chalk.white(`[${level}]`);
        }
    }

    public info(message: string, ...args: any[]) {
        console.log(this.format(LogLevel.INFO, message, ...args));
    }

    public success(message: string, ...args: any[]) {
        console.log(this.format(LogLevel.SUCCESS, message, ...args));
    }

    public warn(message: string, ...args: any[]) {
        console.warn(this.format(LogLevel.WARN, message, ...args));
    }

    public error(message: string, ...args: any[]) {
        console.error(this.format(LogLevel.ERROR, message, ...args));
    }

    public fatal(message: string, ...args: any[]) {
        console.error(this.format(LogLevel.FATAL, message, ...args));
    }

    public debug(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.debug(this.format(LogLevel.DEBUG, message, ...args));
        }
    }
}

/**
 * Enterprise Level Logger Utility
 * Provides color-coded logging with timestamps and object formatting.
 */
export const logger = Logger.getInstance();
