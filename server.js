// server.js
const express = require('express');
const cors = require('cors');

// Node-fetch wrapper for CommonJS + ESM compatibility
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// =======================
// GET Proton Pandas NFTs
// =======================
async function getProtonPandas(wallet) {
  try {
    // Replace this URL with your actual Proton API or backend source
    const url = `https://proton.greymass.com/v1/chain/get_table_rows`;
    
    // Example request body for Proton chain (adjust according to your schema)
    const body = {
      json: true,
      code: "xprpandas",
      scope: "xprpandas",
      table: "assets",
      lower_bound: wallet,
      upper_bound: wallet,
      limit: 100
    };

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Map Proton data into the format frontend expects
    const pandas = data.rows.map(nft => ({
      asset_id: nft.asset_id,
      name: nft.name || `Proton Panda #${nft.asset_id}`,
      image: nft.img_url || nft.image || `https://via.placeholder.com/160?text=No+Image`
    }));

    return pandas;

  } catch (err) {
    console.error("Error fetching pandas:", err);
    return [];
  }
}

// =======================
// API ROUTE
// =======================
app.get('/api/pandas', async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.status(400).json({ error: "Wallet query param required" });

  const pandas = await getProtonPandas(wallet);
  res.json(pandas);
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`Panda NFT backend running on port ${PORT}`);
});
