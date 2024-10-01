class ApiError extends Error {
    public statusCode: number;
    public message: string;
    
    constructor(statusCode: number, message: string, stack: string = '') {
        super(message);

        this.statusCode = statusCode;
        this.message = message;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

// Error handling function
const handleError = (error:any) => {
    if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Error:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
    } else if (error.request) {
        // The request was made but no response was received
        console.error('Error: No response received', error.request);
    } else {
        // Something happened in setting up the request
        console.error('Error:', error.message);
    }
};
export default ApiError;
