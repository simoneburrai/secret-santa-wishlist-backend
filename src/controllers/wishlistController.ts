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
    

async function getPublicWishlist(req: Request, res: Response) {
    const { token } = req.params; 

    try {

        const result = await pool.query(
            `SELECT w.name as wishlist_name, g.* FROM wishlists w
             JOIN gift g ON w.id = g.wishlist_id
             WHERE w.share_token = $1 AND w.is_published = true`,
            [token]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ msg: "Wishlist non trovata o non ancora pubblicata" });
        }

    
        const wishlistData = {
            name: result.rows[0].wishlist_name,
            gifts: result.rows.map(row => {
                const { wishlist_name, ...giftData } = row;
                return giftData;
            })
        };

        res.status(200).json(wishlistData);
    } catch (error) {
        res.status(500).json({ msg: "Errore nel recupero della wishlist" });
    }
}

async function deleteWishlist(req: Request, res: Response){
    const {id} = req.params;

    try {
        if(!id){
            res.status(400).json({msg: "Errore rimozione Wishlist, id mancante"});
            return;
        }

        const parseId: number = parseInt(id, 10); 

        if(isNaN(parseId)){
            res.status(400).json({msg: "Id Wishlist errato, inserire un numero"});
            return;
        }

        const removedWishlist = await pool.query('DELETE FROM wishlists WHERE id = $1 RETURNING id, name', [parseId]);

        if(!removedWishlist.rowCount || removedWishlist.rowCount === 0){
            res.status(404).json({msg: "Nessuna wishlist presente con l'ID inserito, la rimozione non è avvenuta"});
            return;
        }

        res.status(200).json({msg: "Rimozione Wishlist avvenuta con successo", result: removedWishlist.rows[0]});

        
    } catch (error) {
        console.error(error);
        res.status(500).json({msg: "Errore rimozione wishlist dal Database"})
    }
}

async function updateWishlist(req: Request, res: Response){

}


export {
    createWishlist,
    getPublicWishlist,
    deleteWishlist,
    updateWishlist
}