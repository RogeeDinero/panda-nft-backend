// server.js
const express = require("express");
const fetch = require("node-fetch"); // npm install node-fetch
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to fetch Proton NFTs for a wallet
async function getProtonPandas(wallet) {
  try {
    const resp = await fetch("https://proton.greymass.com/v1/chain/get_table_rows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        json: true,
        code: "atomicassets",
        scope: wallet,
        table: "assets",
        limit: 1000
      })
    });

    const data = await resp.json();

    // Filter for your Proton Pandas collection
    const pandas = data.rows.filter(
      nft => nft.collection_name === "144534352512"
    );

    // Map to the structure frontend expects
    return pandas.map(nft => ({
      asset_id: nft.asset_id,
      name: nft.immutable_serialized_data?.name || `Proton Panda #${nft.asset_id}`,
      image: nft.immutable_serialized_data?.image
        ? `https://ipfs.io/ipfs/${nft.immutable_serialized_data.image}`
        : null
    }));

  } catch (err) {
    console.error("Error fetching pandas:", err);
    return [];
  }
}

// API route for frontend
app.get("/api/pandas", async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.status(400).json({ error: "Wallet query parameter required" });

  const pandas = await getProtonPandas(wallet);
  res.json(pandas);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
