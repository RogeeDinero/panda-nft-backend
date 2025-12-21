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

    // Filter ONLY Proton Pandas (your 3 NFTs)
    const pandas = assets.filter(asset => asset.collection_name === '144534352512');

    console.log(`✅ Found ${pandas.length} Proton Pandas for ${wallet}`);

    if (pandas.length === 0) {
      return res.json([]);
    }

    // For each panda, get template data (where images live)
    const pandasWithImages = [];
    for (const asset of pandas) {
      try {
        // Get template for this asset
        const templateResp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            json: true,
            code: 'atomicassets',
            scope: 'atomicassets',
            table: 'templates',
            lower_bound: asset.template_id,
            upper_bound: asset.template_id,
            limit: 1
          })
        });

        const templateData = await templateResp.json();
        const template = templateData.rows[0];

        let name = asset.name || template?.immutable_data?.name || 'Proton Panda';
        let img = '';

        // Proton Pandas images are often in immutable_data or serialized_data
        if (template?.immutable_data?.img) img = template.immutable_data.img;
        else if (template?.immutable_data?.image) img = template.immutable_data.image;
        else if (asset.data?.img) img = asset.data.img;
        else if (asset.data?.image) img = asset.data.image;

        // Fix IPFS URLs
        if (img?.startsWith('ipfs://')) {
          img = `https://ipfs.neftyblocks.io/ipfs/${img.slice(7)}`;
        } else if (img && !img.startsWith('http')) {
          img = `https://ipfs.neftyblocks.io/ipfs/${img}`;
        }

        if (img) {
          pandasWithImages.push({
            asset_id: asset.asset_id,
            template_id: asset.template_id,
            collection_name: asset.collection_name,
            name,
            image: img
          });
        }
      } catch (e) {
        console.log(`Template fetch failed for ${asset.asset_id}`);
      }
    }

    console.log(`✅ Returning ${pandasWithImages.length} Proton Pandas with images`);
    res.json(pandasWithImages);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend on ${PORT}`);
});
