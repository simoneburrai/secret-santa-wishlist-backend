import express from "express";
import { Request, Response } from "express";



const app = express();

const PORT : number = Number(process.env.PORT) | 3000;

app.listen(PORT, ()=>{
    console.log(`Server Express in ascolto nella porta ${PORT}`);
})
