import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Allow your frontends to call this API
app.use(cors({
  origin: [
    "https://<your-github-username>.github.io",
    "https://pandania.xyz"
  ]
}));

app.use(express.json());

// Helper: resolve ipfs:// to https (optional; mainly for debugging)
function normalizeImage(url) {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return "https://ipfs.io/ipfs/" + url.slice(7);
  }
  return url;
}

// GET /api/nfts?wallet=accountname
app.get("/api/nfts", async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) {
    return res.status(400).json({ error: "wallet query param required" });
  }

  try {
    const rpcResp = await fetch("https://proton.greymass.com/v1/chain/get_table_rows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        json: true,
        code: "atomicassets",
        scope: wallet,
        table: "assets",
        limit: 50
      })
    });

    if (!rpcResp.ok) {
      const text = await rpcResp.text();
      console.error("RPC error", rpcResp.status, text);
      return res.status(502).json({ error: "RPC error", status: rpcResp.status });
    }

    const rpcData = await rpcResp.json();

    const nfts = (rpcData.rows || []).map(row => {
      const rawImg =
        row.data?.img ||
        row.data?.image ||
        row.template?.immutable_data?.image ||
        "";

      const name =
        row.name ||
        row.template?.name ||
        `Asset #${row.asset_id || row.id || ""}`;

      return {
        image: normalizeImage(rawImg),
        name
      };
    });

    res.json(nfts);
  } catch (err) {
    console.error("NFT proxy error:", err);
    res.status(500).json({ error: "Failed to load NFTs" });
  }
});

app.listen(PORT, () => {
  console.log("Panda NFT proxy running on port", PORT);
});
