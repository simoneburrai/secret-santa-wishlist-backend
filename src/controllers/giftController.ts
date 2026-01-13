import { Response, Request, NextFunction } from "express";
import pool from "../config/db";

async function reserveGift(req: Request, res: Response, _next: NextFunction){
    let { id } = req.params; 

    const { reserve_message } = req.body;

    const cleanMessage = reserve_message?.trim() || null;

    try {
        if(!id){
            res.status(404).json({msg: "Id regalo mancante"});
            return;
        }
        const parsedId: number = parseInt(id, 10);

        if(isNaN(parsedId)){
            res.status(404).json({msg: "Id errato, deve essere un numero"});
            return;
        }

        const query = `
            UPDATE gift 
            SET is_reserved = true, 
                reserve_message = $1 
            WHERE id = $2 AND is_reserved = false
            RETURNING *;
        `;

        const result = await pool.query(query, [cleanMessage, parsedId]);

        if (!result.rowCount || result.rowCount === 0) {
            res.status(409).json({ msg: "Regalo non disponibile o già prenotato" });
            return;
        }
        res.status(200).json({msg: "Prenotazione regalo avvenuta con successo", result: result.rows[0]})

    } catch (error) {
        console.error(error);
        res.status(500).json({msg:"Errore prenotazione regalo dal database"});
        return;
    }
}

export {
    reserveGift
}