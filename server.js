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
const COLLECTION = 'Proton Pandas'; // correct name with space and capitalization

// Helper: IPFS → HTTPS
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
    // 1️⃣ Get assets in wallet
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
    const pandas = (assetsData.rows || []).filter(a => a.collection_name === COLLECTION);

    if (!pandas.length) return res.json([]);

    // 2️⃣ Fetch templates (batch)
    const templateIds = [...new Set(pandas.map(p => p.template_id))];

    const templatesResp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: COLLECTION,
        table: 'templates',
        lower_bound: Math.min(...templateIds),
        upper_bound: Math.max(...templateIds),
        limit: 100
      })
    });

    const templatesData = await templatesResp.json();
    const templateMap = {};

    templatesData.rows.forEach(t => {
      let img = null;

      // Try common places for the image
      if (t.immutable_data) {
        img = t.immutable_data.img || t.immutable_data.image || null;
      }

      // Fallback: template media array
      if (!img && t.data?.media?.length > 0) {
        img = t.data.media[0].url;
      }

      if (!img && t.media?.length > 0) {
        img = t.media[0].url;
      }

      templateMap[t.template_id] = resolveImage(img);
    });

    // 3️⃣ Return final NFT objects
    const result = pandas.map(p => ({
      asset_id: p.asset_id,
      template_id: p.template_id,
      name: `Proton Panda #${p.template_id}`,
      image: templateMap[p.template_id] || 'https://via.placeholder.com/150?text=No+Image'
    }));

    console.log(`✅ Returning ${result.length} Proton Pandas`);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('🐼 Panda backend LIVE — images resolved correctly');
});

