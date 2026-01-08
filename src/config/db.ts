import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


// Funzione di utilità per fare query
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;