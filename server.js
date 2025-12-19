const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ 
  origin: ['http://pandania.xyz', 'https://pandania.xyz']
}));

app.use(express.json());

// 🆕 SIMPLIFIED: Direct Panda placeholder images (NO external proxy needed)
app.get('/api/image/:templateId', (req, res) => {
  const templateId = req.params.templateId;
  
  // Generate Panda image based on template ID (no external fetch = no CORB)
  const rarity = templateId % 3;
  const pandaNum = (templateId % 9) + 1;
  
  // Panda rarity colors
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
  const color = colors[pandaNum % colors.length];
  
  // Return 150x150 PNG with Panda text (base64 embedded)
  const svg = `<svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
    <rect width="150" height="150" rx="20" fill="${color}"/>
    <circle cx="75" cy="50" r="30" fill="#fff"/>
    <circle cx="60" cy="45" r="8" fill="#000"/>
    <circle cx="90" cy="45" r="8" fill="#000"/>
    <circle cx="55" cy="35" r="12" fill="#333"/>
    <circle cx="95" cy="35" r="12" fill="#333"/>
    <path d="M60 65 Q75 80 90 65" stroke="#333" stroke-width="4" fill="none"/>
    <text x="75" y="120" font-family="Arial" font-size="20" fill="#fff" text-anchor="middle" font-weight="bold">P${pandaNum}</text>
  </svg>`;
  
  res.set({
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600'
  });
  res.send(svg);
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
      
      // FULL URL to your image proxy
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
