import {createWishlist, getPublicWishlist, deleteWishlist, updateWishlist, getMyWishlists} from "../controllers/wishlistController";

import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import upload from "../utility/multer";


const wishlistRouter = Router();

wishlistRouter.post("/", authMiddleware, upload.any(), createWishlist);
wishlistRouter.get("/me", authMiddleware,  getMyWishlists);
wishlistRouter.get("/public/:token", getPublicWishlist);
wishlistRouter.delete("/:id", authMiddleware, deleteWishlist);
wishlistRouter.put("/:id", authMiddleware, updateWishlist);


export default wishlistRouter;