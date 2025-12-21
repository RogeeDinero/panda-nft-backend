const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

// CORS whitelist
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

const COLLECTION_NAME = 'Proton Pandas'; // Collection name on AtomicAssets
const ATOMIC_API = 'https://proton.api.atomicassets.io';

// Helper: Resolve IPFS / HTTP images
function resolveImage(img) {
  if (!img) return null;
  if (img.startsWith('ipfs://')) return img.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (img.startsWith('Qm')) return `https://ipfs.io/ipfs/${img}`;
  return img;
}

// GET /api/pandas?wallet=<wallet>
app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    // Fetch NFTs for wallet from AtomicAssets
    const url = `${ATOMIC_API}/atomicassets/v1/assets?owner=${wallet}&collection_name=${encodeURIComponent(COLLECTION_NAME)}&page=1&limit=100&order=desc&sort=asset_id`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.data) return res.json([]);

    // Map to simplified JSON for frontend
    const result = data.data.map(asset => {
      const name = asset.name || `Proton Panda #${asset.asset_id}`;
      let img = null;

      // Try immutable_data first
      if (asset.data?.immutable_data) {
        img = asset.data.immutable_data.img || asset.data.immutable_data.image || null;
      }

      // Fallback to media[0]
      if (!img && asset.data?.media?.length > 0) {
        img = asset.data.media[0].url;
      }

      return {
        asset_id: asset.asset_id,
        template_id: asset.template?.template_id || null,
        name,
        image: resolveImage(img) || 'https://via.placeholder.com/160?text=No+Image'
      };
    });

    console.log(`🐼 Returning ${result.length} Proton Pandas for ${wallet}`);
    res.json(result);

  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend LIVE on port ${PORT}`);
});
