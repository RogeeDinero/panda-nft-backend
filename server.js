const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ 
  origin: ['http://pandania.xyz', 'https://pandania.xyz']
}));

app.use(express.json());

// 👈 NEW: Proxy endpoint for images (fixes CORB)
app.get('/api/image/:templateId', async (req, res) => {
  const templateId = req.params.templateId;
  const imgUrl = `https://wax.api.atomicassets.io/images/templates/354415534331/354415534331/${templateId}/preview.png`;
  
  try {
    const imgResp = await fetch(imgUrl);
    const buffer = await imgResp.arrayBuffer();
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buffer));
  } catch (err) {
    // Fallback to placeholder
    res.set('Content-Type', 'image/png');
    res.send(require('fs').readFileSync('placeholder.png') || ''); 
  }
});

app.get('/api/nfts', async (req, res) => {
  const wallet = req.query.wallet;
  
  if (!wallet) {
    return res.status(400).json({ error: 'wallet required' });
  }

  try {
    const rpcResp = await fetch('https://proton.greymass.com/v1/chain/get_table_rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: wallet,
        table: 'assets',
        limit: 24
      })
    });

    const rpcData = await rpcResp.json();
    
   const nfts = (rpcData.rows || []).slice(0, 24).map(row => {
  const templateId = row.template_id;
  
  // 👈 FULL BACKEND URL - fixes relative path issue
  const img = templateId ? `https://panda-nft-backend.onrender.com/api/image/${templateId}` : '';
  const name = `Panda #${templateId || row.asset_id}`;
  
  return { image: img, name };
}).filter(nft => nft.image);


    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
