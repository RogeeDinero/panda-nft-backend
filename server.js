const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

app.use(express.json());

// Proton Pandas: collection_name = 144534352512 (from NeftyBlocks URL)
const COLLECTION_NAME = '144534352512';
const ATOMIC_API = 'https://proton-main-atomic01.neftyblocks.com/atomicassets/v1';

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) {
    return res.status(400).json({ error: 'wallet query param required' });
  }

  try {
    // Step 1: Get assets for this wallet + collection
    const assetsUrl = `${ATOMIC_API}/assets? 
      owner=${encodeURIComponent(wallet)}& 
      collection_name=${COLLECTION_NAME}& 
      limit=100`;

    console.log('Fetching:', assetsUrl);
    const assetsResp = await fetch(assetsUrl);
    
    if (!assetsResp.ok) {
      console.log('Assets API failed:', assetsResp.status);
      return res.status(502).json({ 
        error: 'Assets API failed', 
        status: assetsResp.status,
        url: assetsUrl 
      });
    }

    const assetsData = await assetsResp.json();
    const assets = assetsData.data || [];

    if (assets.length === 0) {
      return res.json([]);
    }

    // Step 2: Get templates for image data
    const templateIds = [...new Set(assets.map(a => a.template_id))];
    const templates = [];

    for (const templateId of templateIds.slice(0, 20)) { // limit to avoid rate limits
      const templateUrl = `${ATOMIC_API}/templates/${templateId}`;
      try {
        const templateResp = await fetch(templateUrl);
        if (templateResp.ok) {
          const templateData = await templateResp.json();
          templates.push(templateData.data);
        }
      } catch (e) {
        console.log('Template fetch failed:', templateId);
      }
    }

    // Step 3: Map assets to display data
    const pandas = assets.map(asset => {
      const template = templates.find(t => t.template_id === asset.template_id);
      
      let name = asset.name || template?.immutable_data?.name || 'Proton Panda';
      let img = '';

      // Try multiple image locations
      if (template?.immutable_data?.img) img = template.immutable_data.img;
      else if (template?.immutable_data?.image) img = template.immutable_data.image;
      else if (asset.data?.img) img = asset.data.img;
      else if (asset.data?.image) img = asset.data.image;

      // Fix IPFS
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
    }).filter(p => p.image); // only return with images

    console.log(`Found ${pandas.length} pandas for ${wallet}`);
    res.json(pandas);
  } catch (err) {
    console.error('Backend error:', err);
    res.status(500).json({ error: 'server error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Panda backend on port ${PORT}`);
});

