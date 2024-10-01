import mongoose from "mongoose";

export const connectToDatabase = async () => {

    var url = process.env.DB_URL as string;
    var databaseName = '/leazo'
    try {
        const conn = await mongoose.connect(url + databaseName, {
            //   useNewUrlParser: true,
            //   useUnifiedTopology: true,
            //   useCreateIndex: true,
        }).then((conn) => { console.log(`MongoDB Connected: ${conn.connection.host}`); })

    } catch (error) {
        console.error(`Error Connecting MongoDB: ${error}`);
        process.exit(1);
    }
};