import { Response, Request, NextFunction } from "express";
import pool from "../config/db";
import type { User } from "../types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


const JWT_SECRET: string = process.env.JWT_SECRET!;

async function registration(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        res.status(400).json({ msg: "Dati mancanti" });
        return;
    }

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
        if (existingUser.rowCount && existingUser.rowCount > 0) {
            res.status(409).json({ msg: "Email già registrata" });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        const newUser = await pool.query(
            `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) 
             RETURNING id, name, email`, 
            [name, email, password_hash]
        );

        const user = newUser.rows[0];

        // GENERA IL TOKEN ANCHE QUI!
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            msg: "Registrazione completata", 
            user, 
            token // Ora il frontend riceverà il token con l'ID
        });
    } catch (error) {
        console.error("ERRORE REGISTRAZIONE:", error);
        res.status(500).json({ msg: "Errore interno" });
    }
}

async function login(req: Request, res: Response, _next: NextFunction): Promise<void> {

    const credentials: Pick<User, 'email' | 'password'> = req.body;
    const { email, password} = credentials;

    if( !email || !password ) {
        res.status(400).json({msg: "Errore nell'inserimento dei dati, dati mancanti"});
        return;
    }
   
        try {
        const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);

        if(result.rowCount === 0 ){
            res.status(409).json({msg: "Credenziali non valide"})
            return;
        }

        const user = result.rows[0];
        const isMatch: boolean = await bcrypt.compare(password, user.password);
        if(!isMatch){
            res.status(401).json({msg: "Credenziali non valide"});
            return;
        }

        const token = jwt.sign(
        { id: user.id, email: user.email }, 
        JWT_SECRET, 
        { expiresIn: '24h' } // Il token scade dopo un giorno
    );
        res.status(200).json({ 
            msg: "Login effettuato", 
            user: { id: user.id, name: user.name, email: user.email },
            token: token
        });
         
    }
    catch(error){
        console.error("ERRORE LOGIN:", error);
        res.status(500).json({ 
            msg: "Si è verificato un errore interno durante il login" 
        });
    }
}



export {
    registration,
    login
}