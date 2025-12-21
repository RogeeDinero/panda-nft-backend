// server.js
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

// CORS – allow your pawnshop frontend origin(s)
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

app.use(express.json());

// Proton Pandas collection info
// NeftyBlocks URL you sent uses this collection_name: 144534352512
// https://proton.neftyblocks.com/marketplace/listing?page=1&collection_name=144534352512
const COLLECTION_NAME = '144534352512'; // Proton Pandas collection on Nefty
const NEFTY_API_BASE = 'https://proton-main-atomic01.neftyblocks.com';
const IPFS_BASE = 'https://ipfs.neftyblocks.io/ipfs'; // from page config [file:1]

// GET /api/pandas?wallet=<account>
app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) {
    return res.status(400).json({ error: 'wallet query param is required' });
  }

  try {
    // Nefty AtomicAssets-like endpoint: assets by owner + collection_name
    // (path pattern based on standard atomicassets APIs and Nefty config) [file:1]
    const url = `${NEFTY_API_BASE}/atomicassets/v1/assets?owner=${encodeURIComponent(wallet)}&collection_name=${encodeURIComponent(COLLECTION_NAME)}&limit=100`;

    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ error: 'Nefty API error', status: resp.status });
    }

    const json = await resp.json();
    const assets = json.data || [];

    const mapped = assets.map(a => {
      // Try Nefty/Atomic standard JSON structure
      const name =
        a.name ||
        a.data?.name ||
        a.template?.immutable_data?.name ||
        'Unnamed NFT';

      let img =
        a.data?.img ||
        a.data?.image ||
        a.template?.immutable_data?.img ||
        a.template?.immutable_data?.image ||
        '';

      if (img.startsWith('ipfs://')) {
        img = `${IPFS_BASE}/${img.slice(7)}`;
      } else if (img && !img.startsWith('http')) {
        // Sometimes plain CID
        img = `${IPFS_BASE}/${img}`;
      }

      return {
        asset_id: a.asset_id,
        name,
        image: img
      };
    }).filter(a => !!a.image); // only keep with image

    res.json(mapped);
  } catch (err) {
    console.error('Error in /api/pandas:', err);
    res.status(500).json({ error: 'server error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Panda backend listening on port ${PORT}`);
});
