import { login, register } from "../controllers/userController";

import { Router } from "express";


const userRouter = Router();

userRouter.post("/login", login);
userRouter.post("/register", register);
