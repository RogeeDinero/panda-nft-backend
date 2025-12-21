// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your frontend can fetch
app.use(cors());
app.use(express.json());

// Example route to test server
app.get("/", (req, res) => {
  res.send("Panda NFT backend is running!");
});

// Fetch Proton Pandas NFTs for a given wallet
async function getProtonPandas(wallet) {
  try {
    // Replace this with the real Proton NFT API endpoint
    const url = `https://api.proton.pizza/pandas/${wallet}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch Proton Pandas: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    // Ensure we have an array to map over
    const pandasArray = Array.isArray(data) ? data : [];

    // Map to simplified object for frontend
    return pandasArray.map(nft => ({
      name: nft.name || "Unnamed Panda",
      image: nft.img || nft.image || null,
      asset_id: nft.asset_id || nft.id || null,
      edition: nft.edition || null
    }));

  } catch (err) {
    console.error("Error fetching pandas:", err);
    return [];
  }
}

// API endpoint to get pandas by wallet
app.get("/api/pandas", async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) {
    return res.status(400).json({ error: "Wallet query parameter is required" });
  }

  try {
    const pandas = await getProtonPandas(wallet);
    res.json(pandas);
  } catch (err) {
    console.error("Error in /api/pandas route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Panda NFT backend running on port ${PORT}`);
});
