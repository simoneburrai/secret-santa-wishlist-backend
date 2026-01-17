# ⚙️ Secret Santa Wishlist - Backend API

Il motore dell'applicazione. Gestisce la logica di business, l'autenticazione degli utenti e la persistenza dei dati.

## 🚀 Tech Stack
* **Node.js & Express** per il server web.
* **PostgreSQL** come database relazionale.
* **JWT (JSON Web Token)** per l'autenticazione sicura.
* **Bcryptjs** per l'hashing delle password.
* **Multer** per la gestione dell'upload dei file (immagini dei regali).
* **PG-Pool** per la gestione efficiente delle connessioni al DB.

## 🛠️ Funzionalità implementate
* **Auth Controller**: Hashing password e generazione JWT (incluso user_id nel payload).
* **Wishlist CRUD**: Operazioni complete su wishlist e regali.
* **Public Access**: Rotte ottimizzate per l'accesso tramite share_token.
* **Database Relazionale**: Gestione tabelle `users`, `wishlists`, `gifts` e `favorites`.
* **Middlewares**: Protezione delle rotte tramite verifica del token JWT.
