import express from "express";
import { Request, Response } from "express";
import { query } from "./config/db";


const PORT : number = Number(process.env.PORT) | 3000;
const app = express();


app.use(express.json());

app.get('/test-db', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ message: 'Connesso al database!', time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore di connessione al database');
  }
});

app.listen(PORT, ()=>{
    console.log(`Server Express in ascolto nella porta ${PORT}`);
})
