const express = require('express');
const cors = require('cors');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

/* =======================
   CONFIG
======================= */
const ATOMIC_API = 'https://proton.api.atomicassets.io';
const COLLECTION_NAME = '144534352512';

/* =======================
   CORS
======================= */
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

/* =======================
   HELPERS
======================= */
function resolveImage(img) {
  if (!img) return null;
  if (img.startsWith('ipfs://'))
    return img.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (img.startsWith('Qm'))
    return `https://ipfs.io/ipfs/${img}`;
  return img;
}

/* =======================
   API: GET PANDAS
======================= */
app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    const url =
      `${ATOMIC_API}/atomicassets/v1/assets` +
      `?owner=${wallet}` +
      `&collection_name=${COLLECTION_NAME}` +
      `&page=1&limit=100&order=desc`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data?.data) {
      console.log('⚠️ No assets returned');
      return res.json([]);
    }

    console.log(`✅ Found ${data.data.length} Proton Pandas`);

    const result = data.data.map(a => ({
      asset_id: a.asset_id,
      template_id: a.template?.template_id || null,
      name: a.name || `Proton Panda #${a.asset_id}`,
      image: resolveImage(
        a.data?.image ||
        a.template?.immutable_data?.image ||
        null
      )
    }));

    console.log(`🐼 Returning ${result.length} Proton Pandas`);
    res.json(result);

  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`🐼 Panda backend LIVE on port ${PORT}`);
});
