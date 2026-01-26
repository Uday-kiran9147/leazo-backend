import chalk from 'chalk';

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
        return new Date().toLocaleString('en-IN', {
            hour12: true,
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
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
                if (typeof arg === 'object') {
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
