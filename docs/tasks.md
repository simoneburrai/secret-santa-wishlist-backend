## Feature: Gestione Preferiti

Creare l'endpoint POST /wishlists/favorites/:id per aggiungere/rimuovere una lista dai preferiti.

Validare che l'utente non possa aggiungere la propria lista ai preferiti.

## Feature: Prenotazione Regali

Creare l'endpoint PATCH /gifts/:id/book che permetta a chiunque (tramite il token della lista) di segnare un regalo come "preso".

## Sicurezza e Validazione

Implementare express-validator per validare i dati in ingresso (email corretta, nomi non vuoti).

Aggiungere un middleware per limitare la dimensione degli upload (Multer).

## Deploy Readiness

Configurare il supporto a CORS per accettare richieste solo dal tuo dominio frontend.

Preparare lo script di migrazione SQL per inizializzare le tabelle su Neon.

Gestire le variabili d'ambiente per la produzione.