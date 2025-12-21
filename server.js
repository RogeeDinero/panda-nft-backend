const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS setup
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

// Environment variables (optional)
const COLLECTION_NAME = 'Proton Pandas';
const ATOMICASSETS_API = 'https://proton.api.atomicassets.io';

// Helper: resolve IPFS image to HTTP
function resolveImage(img) {
  if (!img) return null;
  if (img.startsWith('ipfs://')) return img.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (img.startsWith('Qm')) return `https://ipfs.io/ipfs/${img}`;
  return img;
}

// GET /api/pandas?wallet=<wallet>
app.get('/api/pandas', async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    // 1️⃣ Get all assets for the wallet from AtomicAssets API
    const assetsResp = await fetch(`${ATOMICASSETS_API}/atomicassets/v1/assets?owner=${wallet}&collection_name=${encodeURIComponent(COLLECTION_NAME)}&limit=100`);
    const assetsData = await assetsResp.json();

    if (!assetsData || !assetsData.data || assetsData.data.length === 0) {
      return res.json([]);
    }

    // 2️⃣ Map templates to their images
    const result = assetsData.data.map(asset => {
      let img = asset.data?.img || asset.data?.image || asset.data?.image_url || null;

      // fallback to template immutable data
      if (!img && asset.template?.immutable_data) {
        img = asset.template.immutable_data.img || asset.template.immutable_data.image || null;
      }

      return {
        asset_id: asset.asset_id,
        template_id: asset.template.template_id,
        name: `Proton Panda #${asset.template.template_id}`,
        image: resolveImage(img) || 'https://via.placeholder.com/150?text=No+Image'
      };
    });

    console.log(`🐼 Returning ${result.length} Proton Pandas for wallet ${wallet}`);
    res.json(result);

  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend LIVE on port ${PORT}`);
});
