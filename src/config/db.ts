import mongoose from "mongoose";
import { logger } from "../utils/logger";

export const connectToDatabase = async () => {
    if (process.env.NODE_ENV === 'test') return;

    const url = process.env.DB_URL as string;
    // ensure databaseName always starts with a '/'
    const dbName = process.env.DB_NAME || (process.env.NODE_ENV === 'production' ? 'leazo' : 'leazo_dev');

    // Remove slash if present at start for dbName option
    const cleanDbName = dbName.startsWith('/') ? dbName.substring(1) : dbName;

    logger.info(`Connecting to Database: ${cleanDbName}`);

    try {
        // Using the dbName option is much safer than string concatenation,
        // especially when the URL contains query parameters after a '?'
        await mongoose.connect(url, {
            dbName: cleanDbName
        });

        logger.success(`MongoDB Connected!`, {
            host: mongoose.connection.host,
            database: mongoose.connection.db?.databaseName
        });
    } catch (error) {
        logger.error(`Error Connecting MongoDB`, error);
        process.exit(1);
    }
};