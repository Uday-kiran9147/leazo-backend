import mongoose from "mongoose";

export const connectToDatabase = async () => {
    if (process.env.NODE_ENV === 'test') return;

    var url = process.env.DB_URL as string;
    var databaseName = '/leazo'
    try {
        await mongoose.connect(url + databaseName).then((conn) => {
            console.log(`MongoDB Connected: ${conn.connection.host}`);
        });
    } catch (error) {
        console.error(`Error Connecting MongoDB: ${error}`);
        process.exit(1);
    }
};