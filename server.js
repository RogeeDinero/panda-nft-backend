const express = require('express');
const cors = require('cors');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

const RPC = 'https://proton.greymass.com';
const COLLECTION_ID = '144534352512'; // numeric ID for Proton Pandas

// Convert IPFS or raw Qm links to HTTPS
function resolveImage(img) {
  if (!img) return null;
  if (img.startsWith('ipfs://')) return img.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (img.startsWith('Qm')) return `https://ipfs.io/ipfs/${img}`;
  return img;
}

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    // 1️⃣ Get all assets in the wallet
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
    console.log(`📝 Wallet assets for ${wallet}:`, assetsData.rows);

    // Filter Proton Pandas by collection ID
    const pandas = (assetsData.rows || []).filter(a => a.collection_name === COLLECTION_ID);

    if (!pandas.length) {
      console.warn(`⚠️ No Proton Pandas found in wallet.`);
      return res.json([]);
    }

    // 2️⃣ Fetch all templates in batch
    const templateIds = [...new Set(pandas.map(p => p.template_id))];
    const templatesResp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: COLLECTION_ID,
        table: 'templates',
        lower_bound: Math.min(...templateIds),
        upper_bound: Math.max(...templateIds),
        limit: 100
      })
    });

    const templatesData = await templatesResp.json();
    const templateMap = {};

    // 3️⃣ Map template IDs → resolved image
    templatesData.rows.forEach(t => {
      console.log(`Template ${t.template_id} raw:`, t); // 🔍 inspect exact structure

      let img = null;

      if (t.immutable_data) {
        img = t.immutable_data.img || t.immutable_data.image || t.immutable_data.image_url || t.immutable_data.uri || null;
      }

      if (!img && t.media?.length > 0) img = t.media[0].url;
      if (!img && t.data?.media?.length > 0) img = t.data.media[0].url;

      templateMap[t.template_id] = resolveImage(img);
    });

    // 4️⃣ Build final array with live images
    const result = pandas.map(p => ({
      asset_id: p.asset_id,
      template_id: p.template_id,
      name: `Proton Panda #${p.template_id}`,
      image: templateMap[p.template_id] || null // null if no image
    }));

    console.log(`✅ Returning ${result.length} Proton Pandas`);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('🐼 Panda backend LIVE — XPR Network official');
});
