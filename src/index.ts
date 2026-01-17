import express from "express";
import userRouter from "./routers/authRouter";
import wishlistRouter from "./routers/wishlistRouter"
import cors from 'cors';
import path from "path";

const PORT : number = Number(process.env.PORT) | 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/", userRouter);
app.use("/wishlist/", wishlistRouter);


app.listen(PORT, ()=>{
    console.log(`Server Express in ascolto nella porta ${PORT}`);
})
