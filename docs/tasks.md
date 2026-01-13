# NEXT TASKS


## 1. Authentication & Security

- Implement JWT Middleware: Create a middleware to verify the Authorization: Bearer <token> header.

- Protect Private Routes: Apply the auth middleware to POST, PATCH, and DELETE endpoints in the wishlistRouter.

- Ownership Check: Refactor deleteWishlist and updateWishlist to ensure users can only modify their own resources (WHERE id = $1 AND user_id = $2).


## 2. Image Management (Multer)

- Configure Multer Middleware: Set up storage engine and file filters for image uploads.

- Static Files Serving: Add express.static to the main app file to make the uploads/ folder accessible via URL.

- Refactor Controllers for Multi-part Data: Update createWishlist and updateWishlist to parse JSON strings from FormData and map uploaded file paths to the correct gifts.
