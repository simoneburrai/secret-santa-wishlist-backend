import {createWishlist, getPublicWishlist, deleteWishlist, updateWishlist} from "../controllers/wishlistController";

import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import upload from "../utility/multer";


const wishlistRouter = Router();

wishlistRouter.post("/", authMiddleware, upload.array("images"), createWishlist);
wishlistRouter.get("/public/:token", getPublicWishlist);
wishlistRouter.delete("/:id", authMiddleware, deleteWishlist);
wishlistRouter.put("/:id", authMiddleware, updateWishlist);


export default wishlistRouter;