const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

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

// AtomicAssets API base
const ATOMICASSETS_API = 'https://wax.api.atomicassets.io/atomicassets/v1'; // Proton network uses same structure

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    // 1️⃣ Fetch assets owned by wallet
    const assetsResp = await fetch(`${ATOMICASSETS_API}/assets?owner=${wallet}&collection_name=protonpandas&limit=100`);
    const assetsData = await assetsResp.json();

    if (!assetsData || !assetsData.data || assetsData.data.length === 0) {
      return res.json([]);
    }

    // 2️⃣ Map assets to simplified structure for front end
    const nfts = assetsData.data.map(asset => {
      const templateData = asset.data || {};
      const img = templateData.img || templateData.image || asset.template?.immutable_data?.img || asset.template?.immutable_data?.image || null;

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
