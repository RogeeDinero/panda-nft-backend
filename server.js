import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/**
 * CONFIG
 * -------------------------
 */
const ATOMIC_API = "https://proton.api.atomicassets.io/atomicassets/v1";
const COLLECTION_NAME = "protonpandas"; // ⚠ lowercase, no spaces

/**
 * =========================
 * FETCH PROTON PANDAS BY WALLET
 * =========================
 */
app.get("/api/pandas", async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "Wallet is required" });
    }

    const url =
      `${ATOMIC_API}/assets` +
      `?owner=${wallet}` +
      `&collection_name=${COLLECTION_NAME}` +
      `&page=1&limit=1000&order=desc&sort=asset_id`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.success) {
      throw new Error("AtomicAssets API error");
    }

    const assets = json.data.map(asset => {
      const data = asset.data || {};

      let image = data.img || data.image || "";

      // Convert IPFS → HTTP
      if (image.startsWith("Qm")) {
        image = `https://ipfs.io/ipfs/${image}`;
      }
      if (image.startsWith("ipfs://")) {
        image = image.replace("ipfs://", "https://ipfs.io/ipfs/");
      }

      return {
        asset_id: asset.asset_id,
        name: data.name || `Proton Panda #${asset.asset_id}`,
        image
      };
    });

    res.json(assets);

  } catch (err) {
    console.error("Atomic fetch error:", err);
    res.status(500).json({ error: "Failed to fetch NFTs" });
  }
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (_, res) => {
  res.send("🐼 Panda Pawn Shop backend running");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
