import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const COLLECTION_ID = "144534352512"; // Proton Pandas collection

// Helper: fetch all NFTs in the collection
async function getProtonPandas(wallet) {
  try {
    const url = `https://nft.xprnetwork.org/${COLLECTION_ID}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      throw new Error(`HTTP error ${resp.status}`);
    }

    const data = await resp.json();

    // Filter NFTs owned by the requested wallet
    const userNFTs = data.filter(nft => nft.owner === wallet);

    // Map to simplified frontend format
    return userNFTs.map(nft => ({
      name: nft.name || `Panda #${nft.asset_id}`,
      image: nft.image || "",
      asset_id: nft.asset_id,
      collection_id: nft.collection_id,
      serial: nft.serial,
      edition_size: nft.edition_size,
      desc: nft.desc || "",
    }));

  } catch (err) {
    console.error("Error fetching pandas:", err);
    throw err;
  }
}

// API endpoint
app.get("/api/pandas", async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) {
    return res.status(400).json({ error: "Wallet query param is required" });
  }

  try {
    const pandas = await getProtonPandas(wallet);
    res.json(pandas);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Proton Pandas" });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT backend running on port ${PORT}`);
});
