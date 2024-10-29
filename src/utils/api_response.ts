
/**
 * Represents a standard API response.
 */
class ApiResponse {
    /**
     * The HTTP status code of the response.
     */
    status: number;

    /**
     * The message associated with the response.
     */
    message: string;

    /**
     * The data payload of the response, if any.
     */
    data: any;

    /**
     * Creates an instance of ApiResponse.
     * @param status - The HTTP status code of the response.
     * @param message - The message associated with the response.
     * @param data - The data payload of the response, if any. Defaults to null.
     */
    constructor(status: number, message: string, data: any=null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
}

export default ApiResponse