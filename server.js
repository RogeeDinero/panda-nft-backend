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
    // Step 1: Get user's Proton Pandas assets
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
    const assetRows = assets.rows || [];
    
    console.log(`Found ${assetRows.length} assets for ${wallet}`);

    if (assetRows.length === 0) {
      return res.json([]);
    }

    // Step 2: Get unique template IDs
    const templateIds = [...new Set(assetRows.map(row => row.template_id))].slice(0, 12);
    
    console.log('Template IDs:', templateIds);

    // Step 3: Fetch templates from Proton Pandas collection 144534352512
    const templates = {};
    for (const templateId of templateIds) {
      try {
        const templateResp = await fetch('https://proton.greymass.com/v1/chain/get_table_rows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            json: true,
            code: 'atomicassets',
            scope: '144534352512',  // Proton Pandas collection
            table: 'template_mint',
            lower_bound: templateId.toString(),
            limit: 1
          })
        });
        
        const templateData = await templateResp.json();
        if (templateData.rows && templateData.rows[0]) {
          templates[templateId] = templateData.rows[0];
          console.log(`Got template ${templateId}:`, templateData.rows[0].immutable_data);
        }
      } catch (e) {
        console.error(`Template ${templateId} failed:`, e.message);
      }
    }

    // Step 4: Create NFTs with REAL unique images
    const nfts = assetRows.slice(0, 24).map(row => {
      const template = templates[row.template_id];
      const templateData = template?.immutable_data || {};
      
      // Get REAL image hash from template
      let imgHash = '';
      if (templateData.img) imgHash = templateData.img;
      else if (templateData.image) imgHash = templateData.image;
      
      let img = '';
      if (imgHash && imgHash.startsWith('Qm')) {
        img = `https://ipfs-gateway.soon.market/ipfs/${imgHash}`;
      }
      
      const name = templateData.name || `Panda #${row.template_id}`;
      
      return { 
        image: img || `https://ipfs-gateway.soon.market/ipfs/QmP4atVZ6erpM8tWj4a753nNwpDraf8Ga5ByGdT5P3P9sP`,  // fallback
        name: name,
        asset_id: row.asset_id
      };
    }).filter(nft => nft.image);

    console.log(`Returning ${nfts.length} NFTs with images`);
    res.json(nfts);
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
