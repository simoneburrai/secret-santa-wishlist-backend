import { Response, Request, NextFunction } from "express";
import pool from "../config/db";
import type { Wishlist} from "../types/types";

interface AuthenticatedRequest extends Request {
    user?: { id: string; email: string }; 
}

async function createWishlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    const client = await pool.connect();

    console.log("FILES RICEVUTI:", req.files)
    
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

        console.log("FILES RICEVUTI DA MULTER:", files.map(f => f.fieldname));

        for (let i = 0; i < gifts.length; i++) {
            const gift = gifts[i];
            
            const giftFile = (files as any[]).find(f => f.fieldname === `gift_image_${i}`);

            const imagePath = giftFile 
            ? (giftFile.secure_url || giftFile.path || giftFile.url) 
            : (gift.image_url || null);

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
    const userId = (req as any).user?.id || null; 

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
        g.is_reserved,
        g.reserve_message,
        g.image_url,
        EXISTS (
            SELECT 1 FROM favorites f 
            WHERE f.wishlist_id = w.id AND f.user_id = $2
        ) AS is_favorite
    FROM wishlists w
    LEFT JOIN users u ON w.user_id = u.id
    LEFT JOIN gifts g ON w.id = g.wishlist_id
    WHERE w.share_token = $1 AND w.is_published = true`,
    [token, userId] 
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
            is_favorite: result.rows[0].is_favorite, // <--- Aggiunto qui
            gifts: result.rows
                .filter(row => row.gift_id !== null)
                .map(row => ({
                    id: row.gift_id,
                    name: row.gift_name,
                    price: row.price,
                    priority: row.priority,
                    link: row.link,
                    isReserved: row.is_reserved,
                    reserveMessage: row.reserve_message,
                    notes: row.notes,
                    image: row.image_url || null
                }))
        };

        res.status(200).json(wishlistData);
    } catch (error) {
        console.error("ERRORE SERVER:", error);
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

async function updateWishlist(req: AuthenticatedRequest, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
        if (!req.user) {
            res.status(401).json({ msg: "Utente non autenticato" });
            return;
        }

        const userId = Number(req.user.id);
        const { id } = req.params; // ID della wishlist da aggiornare
        const { name, gifts: giftsRaw } = req.body;
        
        // Parsing dei regali se arrivano come stringa JSON (FormData)
        const gifts = typeof giftsRaw === "string" ? JSON.parse(giftsRaw) : giftsRaw;
        const files = (req.files as Express.Multer.File[]) || [];

        await client.query('BEGIN');

        // 1. Verifichiamo che la wishlist appartenga effettivamente all'utente
        const checkOwnership = await client.query(
            "SELECT id FROM wishlists WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        if (checkOwnership.rowCount === 0) {
            res.status(403).json({ msg: "Non hai i permessi per modificare questa wishlist" });
            return;
        }

        // 2. Aggiorniamo i dati base della wishlist (es. il nome)
        await client.query(
            "UPDATE wishlists SET name = $1 WHERE id = $2",
            [name, id]
        );

        // 3. Gestione Regali: Sincronizzazione
        // Strategia: Identifichiamo i regali da mantenere e cancelliamo gli altri
        const updatedGiftIds = gifts
            .filter((g: any) => g.id) // Prendiamo solo quelli che hanno già un ID
            .map((g: any) => g.id);

        if (updatedGiftIds.length > 0) {
            // Eliminiamo i regali che non sono più presenti nella lista inviata
            await client.query(
                `DELETE FROM gifts WHERE wishlist_id = $1 AND id NOT IN (${updatedGiftIds.join(',')})`,
                [id]
            );
        } else {
            // Se non ci sono ID, l'utente potrebbe aver rimosso tutto
            await client.query("DELETE FROM gifts WHERE wishlist_id = $1", [id]);
        }

        // 4. Inserimento o Aggiornamento dei singoli regali
        for (let i = 0; i < gifts.length; i++) {
            const gift = gifts[i];
            
            const giftFile = (files as any[]).find(f => f.fieldname === `gift_image_${i}`);

            const imagePath = giftFile 
                ? (giftFile.secure_url || giftFile.path) 
                : gift.image_url;


            if (gift.id) {
                // UPDATE regalo esistente
                await client.query(
                    `UPDATE gifts SET name = $1, price = $2, priority = $3, link = $4, notes = $5, image_url = $6 
                     WHERE id = $7 AND wishlist_id = $8`,
                    [gift.name, gift.price, gift.priority, gift.link || null, gift.notes || null, imagePath, gift.id, id]
                );
            } else {
                // INSERT nuovo regalo
                await client.query(
                    `INSERT INTO gifts (wishlist_id, name, price, priority, link, notes, image_url) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [id, gift.name, gift.price, gift.priority, gift.link || null, gift.notes || null, imagePath]
                );
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ msg: "Wishlist aggiornata con successo" });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Errore aggiornamento wishlist:", error);
        res.status(500).json({ msg: "Errore durante l'aggiornamento" });
    } finally {
        client.release();
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

async function addFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ msg: "Utente non autenticato" });
            return;
        }

        const userId = req.user.id; 
        const { wishlistId } = req.body;

        if (!wishlistId) {
            res.status(400).json({ msg: "ID wishlist mancante" });
            return;
        }

        const result = await pool.query(
            `INSERT INTO favorites (wishlist_id, user_id) 
             VALUES ($1, $2) 
             RETURNING *`, 
            [wishlistId, userId]
        );

        // Restituiamo la riga inserita (result.rows[0])
        res.status(201).json({
            msg: "Wishlist aggiunta ai preferiti",
            favorite: result.rows[0]
        });

    } catch (error: any) {
        // Gestione errore per duplicati (se l'utente ha già quella wishlist nei preferiti)
        if (error.code === '23505') {
            res.status(400).json({ msg: "Questa wishlist è già tra i tuoi preferiti" });
            return;
        }
        console.error(error);
        res.status(500).json({ msg: "Errore nell'aggiunta lista favorita" });
    }
}

async function removeFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ msg: "Utente non autenticato" });
            return;
        }

        const userId = req.user.id; 
        const { wishlistId } = req.params;

        if (!wishlistId) {
            res.status(400).json({ msg: "ID wishlist mancante" });
            return;
        }

        const result = await pool.query(
            `DELETE FROM favorites 
             WHERE wishlist_id = $1 AND user_id = $2
             RETURNING *`, 
            [wishlistId, userId]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ msg: "Preferito non trovato" });
            return;
        }

        res.status(200).json({
            msg: "Wishlist rimossa dai preferiti con successo",
            removed: result.rows[0]
        });

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ msg: "Errore nella rimozione della lista favorita" });
    }
}


export {
    createWishlist,
    getPublicWishlist,
    deleteWishlist,
    updateWishlist,
    getMyWishlists,
    addFavorite,
    removeFavorite
}