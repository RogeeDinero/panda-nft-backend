const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ 
  origin: ['http://pandania.xyz', 'https://pandania.xyz']
}));

app.use(express.json());

app.get('/api/nfts', async (req, res) => {
  const wallet = req.query.wallet;
  
  if (!wallet) {
    return res.status(400).json({ error: 'wallet required' });
  }

  try {
    // 1. Get user's NFTs
    const assetResp = await fetch('https://proton.greymass.com/v1/chain/get_table_rows', {
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

    const assets = await assetResp.json();
    const rows = assets.rows || [];
    
    if (rows.length === 0) {
      return res.json([]);
    }

    // 2. Get unique template IDs
    const templateIds = [...new Set(rows.map(r => r.template_id).filter(Boolean))].slice(0, 12);
    
    // 3. Fetch templates for Proton Pandas collection (144534352512)
    const templates = {};
    for (const templateId of templateIds) {
      const templateResp = await fetch('https://proton.greymass.com/v1/chain/get_table_rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: true,
          code: 'atomicassets',
          scope: '144534352512',  // Proton Pandas collection
          table: 'template_mint',
          lower_bound: templateId,
          limit: 1
        })
      });
      
      const templateData = await templateResp.json();
      if (templateData.rows?.[0]) {
        templates[templateId] = templateData.rows[0];
      }
    }

    // 4. Map to NFTs with REAL unique images
    const nfts = rows.slice(0, 24).map(row => {
      const template = templates[row.template_id];
      const templateData = template?.immutable_data || {};
      
      // Extract REAL image from template data
      let imgHash = templateData.img || 
                   templateData.image || 
                   templateData.image_1 ||
                   '';
      
      // Convert IPFS hash to working URL
      let img = '';
      if (imgHash && imgHash.startsWith('Qm')) {
        img = `https://ipfs-gateway.soon.market/ipfs/${imgHash}`;
      }
      
      const name = templateData.name || `Panda #${row.template_id || row.asset_id}`;
      
      return { image: img, name, asset_id: row.asset_id };
    }).filter(nft => nft.image);  // Only NFTs with real images

    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
