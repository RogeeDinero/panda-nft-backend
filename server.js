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

    console.log(`Found ${assets.length} total assets for ${wallet}`);

    // *** DEBUG: Show ALL collection_names in your wallet ***
    const collections = {};
    assets.forEach(asset => {
      if (asset.collection_name) {
        collections[asset.collection_name] = (collections[asset.collection_name] || 0) + 1;
      }
    });

    console.log('ALL COLLECTIONS IN WALLET:', collections);

    // Show assets that MIGHT be pandas (have panda in name or common panda collection names)
    const potentialPandas = assets.filter(asset => {
      const isPandaCollection = asset.collection_name && (
        asset.collection_name.includes('panda') || 
        asset.collection_name.includes('xprpandas') ||
        asset.name?.toLowerCase().includes('panda')
      );
      return isPandaCollection;
    });

    console.log('POTENTIAL PANDAS:', potentialPandas.length);
    potentialPandas.forEach(p => {
      console.log(`- ${p.asset_id}: ${p.name} (${p.collection_name})`);
    });

    // Return ALL assets with images for now (so you can see them)
    const allWithImages = assets
      .map(asset => {
        let name = asset.name || 'NFT';
        let img = '';

        // Try image fields
        if (asset.data?.img) img = asset.data.img;
        else if (asset.data?.image) img = asset.data.image;
        else if (asset.template?.immutable_data?.img) img = asset.template.immutable_data.img;
        else if (asset.template?.immutable_data?.image) img = asset.template.immutable_data.image;

        if (img?.startsWith('ipfs://')) {
          img = `https://ipfs.neftyblocks.io/ipfs/${img.slice(7)}`;
        } else if (img && !img.startsWith('http')) {
          img = `https://ipfs.neftyblocks.io/ipfs/${img}`;
        }

        return {
          asset_id: asset.asset_id,
          collection_name: asset.collection_name,
          name,
          image: img,
          // Debug info
          hasPandaName: name.toLowerCase().includes('panda'),
          debug: { collection_name: asset.collection_name }
        };
      })
      .filter(p => p.image);

    console.log(`✅ Returning ${allWithImages.length} NFTs with images`);
    res.json(allWithImages);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend on ${PORT}`);
});
