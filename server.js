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
    // Get your 3 pandas
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

    console.log(`✅ Found ${pandas.length} Proton Pandas for ${wallet}:`, pandas.map(p => p.asset_id));

    if (pandas.length === 0) return res.json([]);

    // Use NeftyBlocks image pattern - THEY HAVE THE IMAGES!
    // https://proton.neftyblocks.com/marketplace/asset/4398046895910 (your panda asset_id)
    const pandasWithImages = pandas.map(panda => ({
      asset_id: panda.asset_id,
      template_id: panda.template_id,
      collection_name: panda.collection_name,
      name: panda.name || `Proton Panda #${panda.asset_id.slice(-6)}`,
      image: `https://resizer.neftyblocks.com/resize/300/300/https://ipfs.neftyblocks.io/ipfs/QmYSE12nTMvcqaryBe9daQGAmSxp8BzUrR2LK4GWEx3Wic/${panda.template_id}.png`
    }));

    console.log(`✅ Returning ${pandasWithImages.length} pandas with NeftyBlocks images`);
    res.json(pandasWithImages);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend LIVE on ${PORT}`);
});
