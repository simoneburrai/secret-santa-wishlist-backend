import {createWishlist, getPublicWishlist, deleteWishlist, updateWishlist, getMyWishlists, addFavorite} from "../controllers/wishlistController";

import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import upload from "../config/multer";


const wishlistRouter = Router();

wishlistRouter.post("/", authMiddleware, upload.any(), createWishlist);
wishlistRouter.get("/me", authMiddleware,  getMyWishlists);
wishlistRouter.get("/public/:token", getPublicWishlist);
wishlistRouter.delete("/:id", authMiddleware, deleteWishlist);
wishlistRouter.put("/:id", authMiddleware, upload.any(), updateWishlist);
wishlistRouter.post("/favorites", authMiddleware, addFavorite );

export default wishlistRouter;