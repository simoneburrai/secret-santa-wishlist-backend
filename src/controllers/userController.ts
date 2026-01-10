import { Response, Request, NextFunction } from "express";
import pool from "../config/db";
import type { User } from "../types";
import bcrypt from "bcryptjs";

async function registration(req: Request, res: Response, _next: NextFunction): Promise<void> {

    const user: User = req.body;
    const { email, password, name} = user;

    if( !email || !password || !name) {
        res.status(400).json({msg: "Errore nell'inserimento dei dati, dati mancanti"});
        return;
    }
   
        try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email=$1', [email]);

        if(existingUser.rowCount && existingUser.rowCount > 0){
            res.status(409).json({msg: "Esiste già un utente corrispondente a questo username/email"})
            return;
        }

         const salt = await bcrypt.genSalt(10);
         const password_hash = await bcrypt.hash(password, salt);
         const creationQuery = `
            INSERT INTO users (name, email, password) 
            VALUES ($1, $2, $3) 
            RETURNING id, name, email, created_at
        `;
         const newUser = await pool.query(creationQuery, [name, email, password_hash]);

        if(newUser.rowCount && newUser.rowCount > 0){
            res.status(201).json({msg: "Creazione User avvenuta con successo", user: newUser.rows[0]})
            return;
        }else {
            throw new Error("Il database non ha confermato l'inserimento");
        }
         
    }
    catch(error){
        console.error("ERRORE REGISTRAZIONE:", error);
        res.status(500).json({ 
            msg: "Si è verificato un errore interno durante la registrazione" 
        });
    }
}

// async function login(req: Request, res: Response, _next: NextFunction): Promise<void> {

//     const user: Pick<User, 'email' | 'password'>= req.body;
//     const { email, password} = user;

//     if( !email || !password ) {
//         res.status(400).json({msg: "Errore nell'inserimento dei dati, dati mancanti"});
//         return;
//     }
   
//         try {
//         const existingUser = await pool.query('SELECT * FROM users WHERE email=$1', [email]);

//         if(existingUser.rowCount === 0 ){
//             res.status(409).json({msg: "Non esiste un utente corrispondente a questa email"})
//             return;
//         }

//          const salt = await bcrypt.genSalt(10);
//          const password_hash = await bcrypt.hash(password, salt);
//          const creationQuery = `
//             INSERT INTO users (name, email, password) 
//             VALUES ($1, $2, $3) 
//             RETURNING id, name, email, created_at
//         `;
//          const newUser = await pool.query(creationQuery, [name, email, password_hash]);

//         if(newUser.rowCount && newUser.rowCount > 0){
//             res.status(201).json({msg: "Creazione User avvenuta con successo", user: newUser.rows[0]})
//             return;
//         }else {
//             throw new Error("Il database non ha confermato l'inserimento");
//         }
         
//     }
//     catch(error){
//         console.error("ERRORE REGISTRAZIONE:", error);
//         res.status(500).json({ 
//             msg: "Si è verificato un errore interno durante la registrazione" 
//         });
//     }
// }



export {
    registration
}