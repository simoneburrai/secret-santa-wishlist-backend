import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const optionalAuth = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // Se non c'è l'header, procediamo comunque senza utente
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded; // Popoliamo req.user così la query può usare l'ID
        next();
    } catch (error) {
        // Se il token è scaduto o invalido, non blocchiamo la richiesta
        // ma consideriamo l'utente come "non loggato"
        req.user = null;
        next();
    }
};