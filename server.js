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
    // Step 1: Get your 3 pandas
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

    console.log(`✅ Found ${pandas.length} Proton Pandas for ${wallet}`);

    if (pandas.length === 0) return res.json([]);

    // Step 2: Get ALL templates for these pandas (collection scope)
    const templateIds = [...new Set(pandas.map(p => p.template_id))];
    console.log('Template IDs:', templateIds);

    const templatesResp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: '144534352512',  // <-- COLLECTION SCOPE (not 'atomicassets')
        table: 'templates',
        limit: 100
      })
    });

    const templatesData = await templatesResp.json();
    const templates = templatesData.rows || [];
    console.log(`Found ${templates.length} templates`);

    // Step 3: Match assets to templates and extract images
    const pandasWithImages = pandas.map(panda => {
      const template = templates.find(t => t.template_id == panda.template_id);
      
      console.log(`Panda ${panda.asset_id} template:`, template?.template_id, template?.immutable_data);

      let name = panda.name || template?.immutable_data?.name || `Proton Panda #${panda.asset_id.slice(-4)}`;
      let img = '';

      // Try ALL possible image locations
      const data = template?.immutable_data || panda.data || {};
      img = data.img || data.image || data.Image || data.IMG;

      // Check serialized data (common for complex NFTs)
      if (!img && template?.immutable_serialized_data) {
        console.log('Has serialized data, needs decoding');
        // For now use template_id as fallback image
        img = `https://ipfs.neftyblocks.io/ipfs/QmYSE12nTMvcqaryBe9daQGAmSxp8BzUrR2LK4GWEx3Wic/${template.template_id}.png`;
      }

      // Fix IPFS
      if (img?.startsWith('ipfs://')) {
        img = `https://ipfs.neftyblocks.io/ipfs/${img.slice(7)}`;
      }

      return {
        asset_id: panda.asset_id,
        template_id: panda.template_id,
        collection_name: panda.collection_name,
        name,
        image: img || `https://via.placeholder.com/300x300/333/fff?text=P#${panda.template_id}`
      };
    });

    console.log(`✅ Returning ${pandasWithImages.length} pandas`);
    res.json(pandasWithImages);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend on ${PORT}`);
});
