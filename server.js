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
    // Get your 3 pandas asset_ids
    const assetsResp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
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

    const assetsData = await assetsResp.json();
    const pandas = (assetsData.rows || []).filter(a => a.collection_name === '144534352512');

    console.log(`✅ Found ${pandas.length} Proton Pandas:`, pandas.map(p => ({
      asset_id: p.asset_id,
      template_id: p.template_id
    })));

    if (pandas.length === 0) return res.json([]);

    // OFFICIAL XPR Network NFT images - from your links!
    const pandasWithImages = pandas.map(panda => ({
      asset_id: panda.asset_id,
      template_id: panda.template_id,
      collection_name: panda.collection_name,
      name: panda.name || `Proton Panda #${panda.template_id}`,
      // XPR Network official image URLs (from nft.xprnetwork.org/144534352512/{template_id})
      image: `https://nft.xprnetwork.org/144534352512/${panda.template_id}`
    }));

    console.log(`✅ Returning ${pandasWithImages.length} pandas with XPR Network images`);
    res.json(pandasWithImages);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend LIVE - XPR Network official`);
});
