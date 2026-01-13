import { Response, Request, NextFunction } from "express";
import pool from "../config/db";
import type { Wishlist, Gift } from "../types";

async function createWishlist(req: Request, res: Response, _next: NextFunction){

    const client = await pool.connect();

    const wishlist: Wishlist = req.body;
    const { name, gifts, userId } = wishlist;

    if(!userId){
        res.status(400).json({msg: "Errore Creazione Wishlist: Errore attribuzione proprietario"});
        return;
    }
    if(!name || !(name.trim())){
        res.status(400).json({msg: "Errore creazione Wishlist: Inserire un nome valido"});
        return;
    }
    if(!gifts || gifts.length <= 0){
        res.status(400).json({msg: "Errore creazione Wishlist: Inserire almeno un regalo valido"});
        return;
    }

    try {
         await client.query('BEGIN');

         const newWishlist = await client.query(
        `INSERT INTO wishlists (name, user_id, is_published)  VALUES ($1, $2, $3) RETURNING id, name, created_at, share_token`, [name, userId, true]);
        
        
        if(!newWishlist){
            throw new Error("Database Error: Creazione Wishlist non avvenuta");
        }

        if(!newWishlist.rowCount){
            throw new Error("Il database non ha confermato l'inserimento")
        }

        const wishlistId = newWishlist.rows[0].id;

        for (const gift of gifts) {
    await client.query(
        `INSERT INTO gift (wishlist_id, name, price, priority, link, notes, image) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            wishlistId, 
            gift.name, 
            gift.price, 
            gift.priority, 
            gift.link ?? null,  
            gift.notes ?? null,  
            gift.image ?? null   
        ]
    );
}

        await client.query('COMMIT');
        
        res.status(201).json({
            msg: "Wishlist pubblicata con successo!",
            shareToken: newWishlist.rows[0].share_token
        });


    } catch (error) {
            console.error(error);
            res.status(500).json({msg: "Database Error: Creazione Wishlist non avvenuta"})
            return;
    }
   

    }
    



export {
    createWishlist
}