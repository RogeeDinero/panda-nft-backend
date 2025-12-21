const express = require('express');
const cors = require('cors');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { TextDecoder } = require('util');

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
const COLLECTION = '144534352512'; // Proton Pandas collection name

// Helper: decode mutable_serialized_data or immutable_serialized_data
function decodeSerializedData(data) {
  try {
    // The serialized data is an array of bytes, decode as UTF-8 text
    if (Array.isArray(data) && data.length > 0) {
      return new TextDecoder().decode(Uint8Array.from(data));
    }
    return null;
  } catch (err) {
    console.warn('Error decoding serialized data:', err);
    return null;
  }
}

// Convert IPFS/Qm strings → HTTPS
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
    console.log(`📝 Wallet assets for ${wallet}:`, assetsData.rows);

    // Filter for Proton Pandas in collection
    const pandas = (assetsData.rows || []).filter(a => a.collection_name === COLLECTION);

    if (!pandas.length) {
      console.warn('⚠️ No Proton Pandas found in wallet.');
      return res.json([]);
    }

    // 2️⃣ Fetch templates
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
      console.log(`Template ${t.template_id} raw:`, t);

      // 1. Check immutable_data fields
      let img = t.immutable_data?.img || t.immutable_data?.image || null;

      // 2. Check mutable_serialized_data
      if (!img && t.mutable_serialized_data?.length > 0) {
        const decoded = decodeSerializedData(t.mutable_serialized_data);
        if (decoded && (decoded.startsWith('Qm') || decoded.startsWith('ipfs://'))) {
          img = decoded;
        }
      }

      // 3. Check immutable_serialized_data
      if (!img && t.immutable_serialized_data?.length > 0) {
        const decoded = decodeSerializedData(t.immutable_serialized_data);
        if (decoded && (decoded.startsWith('Qm') || decoded.startsWith('ipfs://'))) {
          img = decoded;
        }
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
  console.log('🐼 Panda backend LIVE — XPR Network official');
  console.log(`==> Your service is live 🎉`);
  console.log(`==> Available at your primary URL http://localhost:${PORT}`);
});
