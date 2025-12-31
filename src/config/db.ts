import mongoose from "mongoose";

export const connectToDatabase = async () => {
    if (process.env.NODE_ENV === 'test') return;

    const url = process.env.DB_URL as string;
    // ensure databaseName always starts with a '/'
    const dbName = process.env.DB_NAME || (process.env.NODE_ENV === 'production' ? 'leazo' : 'leazo_dev');

    // Remove slash if present at start for dbName option
    const cleanDbName = dbName.startsWith('/') ? dbName.substring(1) : dbName;

    console.log(`Requested Database Name: ${cleanDbName}`);

    try {
        // Using the dbName option is much safer than string concatenation,
        // especially when the URL contains query parameters after a '?'
        await mongoose.connect(url, {
            dbName: cleanDbName
        });

        console.log(`MongoDB Host: ${mongoose.connection.host}`);
        console.log(`MongoDB Connected to database: ${mongoose.connection.db?.databaseName}`);
    } catch (error) {
        console.error(`Error Connecting MongoDB: ${error}`);
        process.exit(1);
    }
};