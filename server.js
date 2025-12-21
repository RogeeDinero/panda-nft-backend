const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: ['http://localhost:5500', 'http://pandania.xyz', 'https://pandania.xyz']
}));
app.use(express.json());

// OFFICIAL XPR AtomicAssets API (from XPR-Market repo)
const ATOMIC_API = 'https://proton.api.atomicassets.io/atomicassets/v1';

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    // Proton Pandas collection_name from your NeftyBlocks URL
    const assetsUrl = `${ATOMIC_API}/assets?owner=${encodeURIComponent(wallet)}&collection_name=144534352512&limit=100`;
    
    console.log('Fetching:', assetsUrl);
    const assetsResp = await fetch(assetsUrl);
    
    if (!assetsResp.ok) {
      console.log('Assets failed:', assetsResp.status, await assetsResp.text());
      return res.status(502).json({ error: 'Assets API failed', status: assetsResp.status });
    }

    const assetsData = await assetsResp.json();
    const assets = assetsData.data || [];

    if (assets.length === 0) {
      return res.json([]);
    }

    // Get templates for images (parallel fetches)
    const templateIds = [...new Set(assets.map(a => a.template_id))];
    const templatePromises = templateIds.slice(0, 20).map(id => 
      fetch(`${ATOMIC_API}/templates/${id}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    const templates = (await Promise.all(templatePromises)).filter(Boolean);
    
    // Map to clean data
    const pandas = assets.map(asset => {
      const template = templates.find(t => t.template_id === asset.template_id);
      
      let name = asset.name || template?.immutable_data?.name || 'Proton Panda';
      let img = template?.immutable_data?.img || 
                template?.immutable_data?.image || 
                asset.data?.img || 
                asset.data?.image || '';

      // Fix IPFS URLs
      if (img?.startsWith('ipfs://')) {
        img = `https://ipfs.neftyblocks.io/ipfs/${img.slice(7)}`;
      } else if (img && !img.startsWith('http')) {
        img = `https://ipfs.neftyblocks.io/ipfs/${img}`;
      }

      return {
        asset_id: asset.asset_id,
        template_id: asset.template_id,
        name,
        image: img
      };
    }).filter(p => p.image); // Only with images

    console.log(`✅ Found ${pandas.length} pandas for ${wallet}`);
    res.json(pandas);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend on ${PORT}`);
});
