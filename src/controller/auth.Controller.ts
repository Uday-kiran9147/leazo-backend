import { Request, Response } from "express";
import { User } from "../models/user.model";
import { createUser } from "./userController";

// Signup controller to handle user registration
export const signUp = async (req: Request, res: Response) => {
    console.log("signup controller"); // Log to indicate when signup is triggered

    try {
        // Call the createUser function to register a new user
        createUser(req, res);
    } catch (error) {
        console.log(error); // Log the error for debugging purposes

        // If an error occurs, return a 400 status with the error message
        return res.status(400).send({ error: error });
    }
};

// Login controller to authenticate a user
export const login = async (req: Request, res: Response) => {
    console.log("login controller"); // Log to indicate when login is triggered

    try {
        // Destructure email and password from the request body
        const { email, password } = req.body;

        // Find the user based on email and password
        const user = await User.findByCredentials(email, password);

        // If a user is found, generate an authentication token
        if (user != null) {
            const token = await user!.generateAuthToken();

            // Return the user data and token with a 200 status code
            return res.status(200).send({ data: user, token: token });
        }
    } catch (error) {
        console.log(error); // Log the error for debugging purposes

        // If an error occurs, return a 400 status with the error message
        return res.status(400).send({ error: error });
    }
};
