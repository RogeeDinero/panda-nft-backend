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

/**
 * STEP 1: Return panda metadata + LOCAL image proxy URL
 */
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

    const data = await resp.json();

    const pandas = (data.rows || []).filter(
      a => a.collection_name === '144534352512'
    );

    const result = pandas.map(p => ({
      asset_id: p.asset_id,
      template_id: p.template_id,
      name: p.name || `Proton Panda #${p.template_id}`,
      image: `/api/panda-image/${p.template_id}`
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * STEP 2: IMAGE PROXY (STREAM CORRECT CONTENT TYPE)
 */
app.get('/api/panda-image/:templateId', async (req, res) => {
  const { templateId } = req.params;

  try {
    const imgResp = await fetch(
      `https://nft.xprnetwork.org/144534352512/${templateId}`,
      { redirect: 'follow' }
    );

    if (!imgResp.ok) {
      return res.status(404).send('Image not found');
    }

    // Stream the actual content type from the upstream response
    const contentType = imgResp.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    imgResp.body.pipe(res);
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(500).send('Image fetch failed');
  }
});

app.listen(PORT, () => {
  console.log(`🐼 Panda backend running on port ${PORT}`);
});
