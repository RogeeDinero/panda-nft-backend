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

    const data = await resp.json();
    const pandas = (data.rows || []).filter(a => a.collection_name === '144534352512');

    if (pandas.length === 0) return res.json([]);

    // Get FIRST panda's template to inspect structure
    const firstPanda = pandas[0];
    console.log('FIRST PANDA:', firstPanda.asset_id, firstPanda.template_id);

    const templateResp = await fetch(`${RPC}/v1/chain/get_table_rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: 'atomicassets',
        table: 'templates',
        lower_bound: firstPanda.template_id,
        upper_bound: firstPanda.template_id,
        limit: 1
      })
    });

    const templateData = await templateResp.json();
    const template = templateData.rows[0];

    console.log('TEMPLATE STRUCTURE:', JSON.stringify(template, null, 2));

    // For now, return placeholder images so frontend works
    const result = pandas.map(panda => ({
      asset_id: panda.asset_id,
      template_id: panda.template_id,
      name: panda.name || `Proton Panda #${panda.asset_id.slice(-4)}`,
      image: `https://via.placeholder.com/300x300/000/fff?text=Panda+${panda.asset_id.slice(-4)}`
    }));

    console.log(`✅ Returning ${result.length} pandas with placeholder images`);
    res.json(result);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend on ${PORT}`);
});
