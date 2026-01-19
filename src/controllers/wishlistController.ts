import { Response, Request, NextFunction } from "express";
import pool from "../config/db";
import type { Wishlist} from "../types";

interface AuthenticatedRequest extends Request {
    user?: { id: string; email: string }; 
}

async function createWishlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
        if (!req.user) {
            res.status(401).json({ msg: "Utente non autenticato" });
            return;
        }

        const userId : number = Number(req.user.id);

        // 1. Parsing sicuro dei regali
        const { name } = req.body;
        let gifts = req.body.gifts;
        if (typeof gifts === "string") {
            gifts = JSON.parse(gifts);
        }

        // 2. Fallback per i file per evitare il crash
        const files = (req.files as Express.Multer.File[]) || [];

        await client.query('BEGIN');

        const newWishlist = await client.query(
            `INSERT INTO wishlists (name, user_id, is_published) 
             VALUES ($1, $2, $3) RETURNING id, share_token`, 
            [name, userId, true]
        );
        
        const wishlistId = newWishlist.rows[0].id; // Questo lo avevi già


        for (let i = 0; i < gifts.length; i++) {
            const gift = gifts[i];
            
            // Ora .find() non fallirà perché files è almeno un array vuoto []
            const giftFile = files.find(f => f.fieldname === `gift_image_${i}`);
            const imagePath = giftFile ? giftFile.path : null;

            await client.query(
                `INSERT INTO gifts (wishlist_id, name, price, priority, link, notes, image_url) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    wishlistId,
                    gift.name, 
                    gift.price, 
                    gift.priority, 
                    gift.link || null, 
                    gift.notes || null, 
                    imagePath 
                ]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ shareToken: newWishlist.rows[0].share_token });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Errore creazione wishlist:", error);
        res.status(500).json({ msg: "Errore durante la creazione della wishlist" });
    } finally {
        client.release();
    }
}

async function getPublicWishlist(req: Request, res: Response): Promise<void> {
    const { token } = req.params; 
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    try {
        const result = await pool.query(
    `SELECT 
        w.id AS wishlist_id, 
        w.name AS wishlist_name, 
        w.user_id AS owner_id,
        u.name AS owner_name,
        g.id AS gift_id,
        g.name AS gift_name,
        g.price,
        g.priority,
        g.link,
        g.notes,
        g.image_url
    FROM wishlists w
    LEFT JOIN users u ON w.user_id = u.id
    LEFT JOIN gifts g ON w.id = g.wishlist_id
    WHERE w.share_token = $1 AND w.is_published = true`,
    [token]
);

        if (result.rowCount === 0) {
            res.status(404).json({ msg: "Wishlist non trovata" });
            return;
        }

        const wishlistData = {
            id: result.rows[0].wishlist_id,
            name: result.rows[0].wishlist_name,
            owner_id: result.rows[0].owner_id,
            owner_name: result.rows[0].owner_name,
            gifts: result.rows
                .filter(row => row.gift_id !== null)
                .map(row => ({
                    id: row.gift_id,
                    name: row.gift_name,
                    price: row.price,
                    priority: row.priority,
                    link: row.link,
                    notes: row.notes,
                    // Sostituisce i backslash con slash e rimuove eventuali doppi slash
                    image: row.image 
                        ? `${baseUrl}/${row.image.replace(/\\/g, '/').replace(/^\/+/, '')}` 
                        : null
                }))
        };

        res.status(200).json(wishlistData);
    } catch (error) {
        console.error("ERRORE SERVER:", error); // Controlla questo log nel terminale del backend!
        res.status(500).json({ msg: "Errore interno nel recupero della wishlist" });
    }
}

async function deleteWishlist(req: AuthenticatedRequest , res: Response): Promise<void>{
     if (!req.user) {
            res.status(401).json({ msg: "Utente non autenticato" });
            return;
        }

        const userId = req.user.id; 
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

        const removedWishlist = await pool.query('DELETE FROM wishlists WHERE id = $1 AND user_id = $2 RETURNING id, name', [parseId, userId]);

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

async function updateWishlist(req: AuthenticatedRequest , res: Response): Promise<void>{
    try {
         if (!req.user) {
            res.status(401).json({ msg: "Utente non autenticato" });
            return;
        }
        // L'ID dell'utente lo prendiamo dal TOKEN, non dai parametri!
        const userId = req.user.id; 
        
    } catch (error) {
        
    }
}

async function getMyWishlists(req: AuthenticatedRequest , res: Response): Promise<void>{
    try {
        if (!req.user) {
            res.status(401).json({ msg: "Utente non autenticato" });
            return;
        }
        // L'ID dell'utente lo prendiamo dal TOKEN, non dai parametri!
        const userId = req.user.id; 

        // Recuperiamo le wishlist create dall'utente
        const myWishlistsResult = await pool.query(
            `SELECT * from wishlists where user_id = $1`, [userId]
        );

        // Recuperiamo le preferite (assumendo che tu abbia un array o una tabella pivot)
        const favoritesResult  = await pool.query(
            `SELECT w.* FROM wishlists w
                 JOIN favorites f ON w.id = f.wishlist_id
                 WHERE f.user_id = $1`, [userId]
        );

        res.json({
            wishlists: myWishlistsResult.rows,
            favorites: favoritesResult.rows
        });
    } catch (error) {
        res.status(500).json({ msg: "Errore nel recupero delle liste" });
    }
}


export {
    createWishlist,
    getPublicWishlist,
    deleteWishlist,
    updateWishlist,
    getMyWishlists
}