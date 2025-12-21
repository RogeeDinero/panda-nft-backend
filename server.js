const express = require('express');
const cors = require('cors');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(
  cors({
    origin: [
      'http://localhost:5500',
      'http://pandania.xyz',
      'https://pandania.xyz',
    ],
  })
);

const RPC = 'https://proton.greymass.com';
const COLLECTION = 'Proton Pandas'; // exact collection name

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
    // 1️⃣ Get all assets in wallet
    const assetsResp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: wallet,
        table: 'assets',
        limit: 1000,
      }),
    });

    const assetsData = await assetsResp.json();

    // Filter only Proton Pandas
    const pandas = (assetsData.rows || []).filter(
      (a) => a.collection_name === COLLECTION
    );

    if (!pandas.length) return res.json([]);

    // 2️⃣ Fetch all templates for these assets
    const templateIds = [...new Set(pandas.map((p) => p.template_id))];

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
        limit: 1000,
      }),
    });

    const templatesData = await templatesResp.json();

    const templateMap = {};

    templatesData.rows.forEach((t) => {
      console.log(`Template ${t.template_id} raw:`, t); // 🔍 for debugging

      let img = null;
      let name = t.name || `Proton Panda #${t.template_id}`;
      let desc = t.immutable_data?.desc || t.data?.description || '';
      let author = t.author || '';

      // Try common places for the image
      if (t.immutable_data) {
        img = t.immutable_data.img || t.immutable_data.image || null;
      }
      if (!img && t.data?.media?.length > 0) img = t.data.media[0].url;
      if (!img && t.media?.length > 0) img = t.media[0].url;

      templateMap[t.template_id] = {
        image: resolveImage(img) || 'https://via.placeholder.com/150?text=No+Image',
        name,
        desc,
        author,
      };
    });

    // 3️⃣ Return final NFT objects with all metadata
    const result = pandas.map((p) => ({
      asset_id: p.asset_id,
      template_id: p.template_id,
      name: templateMap[p.template_id]?.name || `Proton Panda #${p.template_id}`,
      desc: templateMap[p.template_id]?.desc || '',
      author: templateMap[p.template_id]?.author || '',
      image: templateMap[p.template_id]?.image || 'https://via.placeholder.com/150?text=No+Image',
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
  console.log(`==> Your service is live 🎉`);
  console.log(`==> Available at your primary URL http://localhost:${PORT}`);
});
