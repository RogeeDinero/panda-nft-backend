const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: ['http://localhost:5500', 'http://pandania.xyz', 'https://pandania.xyz']
}));
app.use(express.json());

const RPC = 'https://proton.greymass.com';

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    // Query ALL assets for this wallet from atomicassets contract
    const resp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: wallet,
        table: 'assets',
        limit: 100
      })
    });

    if (!resp.ok) throw new Error(`RPC failed: ${resp.status}`);
    const data = await resp.json();
    const assets = data.rows || [];

    console.log(`Found ${assets.length} total assets for ${wallet}`);

    // Filter for Proton Pandas ONLY (collection_name = 144534352512)
    const pandas = assets
      .filter(asset => asset.collection_name === '144534352512')
      .map(asset => {
        let name = asset.name || 'Proton Panda';
        let img = '';

        // Try all possible image locations
        if (asset.data?.img) img = asset.data.img;
        else if (asset.data?.image) img = asset.data.image;
        else if (asset.template?.immutable_data?.img) img = asset.template.immutable_data.img;
        else if (asset.template?.immutable_data?.image) img = asset.template.immutable_data.image;

        // Fix IPFS
        if (img?.startsWith('ipfs://')) {
          img = `https://ipfs.neftyblocks.io/ipfs/${img.slice(7)}`;
        } else if (img && !img.startsWith('http')) {
          img = `https://ipfs.neftyblocks.io/ipfs/${img}`;
        }

        return {
          asset_id: asset.asset_id,
          template_id: asset.template_id || asset.template?.template_id,
          collection_name: asset.collection_name,
          name,
          image: img
        };
      })
      .filter(p => p.image); // Only return NFTs with images

    console.log(`✅ Found ${pandas.length} Proton Pandas for ${wallet}`);
    res.json(pandas);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend on ${PORT}`);
});
