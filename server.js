// server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 10000;

// Environment variables
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'Proton Pandas';
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://proton.greymass.com';

// Allow requests from your frontend domains
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

// Helper: convert IPFS to HTTPS
function resolveImage(img) {
  if (!img) return null;
  if (img.startsWith('ipfs://')) return img.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (img.startsWith('Qm')) return `https://ipfs.io/ipfs/${img}`;
  return img;
}

// Proton AtomicAssets API endpoint
const ATOMICASSETS_API = 'https://proton.api.atomicassets.io/atomicassets/v1';

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    // Fetch assets for this wallet in your collection
    const url = `${ATOMICASSETS_API}/assets?owner=${wallet}&collection_name=${COLLECTION_NAME.replace(/ /g,'').toLowerCase()}&limit=100`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.data || data.data.length === 0) {
      return res.json([]);
    }

    // Map assets to a simple structure for front end
    const nfts = data.data.map(asset => {
      const img = asset.data?.img || asset.data?.image || asset.template?.immutable_data?.img || asset.template?.immutable_data?.image || null;

      return {
        asset_id: asset.asset_id,
        template_id: asset.template.template_id,
        name: asset.name || `Proton Panda #${asset.asset_id}`,
        image: resolveImage(img)
      };
    });

    console.log(`🐼 Returning ${nfts.length} Proton Pandas for wallet ${wallet}`);
    res.json(nfts);

  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend running on port ${PORT}`);
});
