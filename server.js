import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: CORS before routes
app.use(cors({
  origin: [
    "http://pandania.xyz",
    "https://pandania.xyz",
  ]
}));

app.use(express.json());

