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
    // 1. Get assets
    const assetResp = await fetch('https://proton.greymass.com/v1/chain/get_table_rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: wallet,
        table: 'assets',
        limit: 24  // fewer for speed
      })
    });

    const assets = await assetResp.json();
    
    if (!assets.rows || assets.rows.length === 0) {
      return res.json([]);
    }

    // 2. Get unique template IDs
    const templateIds = [...new Set(assets.rows.map(row => row.template_id))];

    // 3. Batch fetch templates (your collection)
    const templates = {};
    for (const templateId of templateIds.slice(0, 10)) {  // limit 10 templates
      try {
        const templateResp = await fetch('https://proton.greymass.com/v1/chain/get_table_rows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            json: true,
            code: 'atomicassets',
            scope: '354415534331',  // your collection
            table: 'template_mint',
            lower_bound: templateId,
            upper_bound: templateId + 1,
            limit: 1
          })
        });
        
        const templateData = await templateResp.json();
        if (templateData.rows && templateData.rows[0]) {
          templates[templateId] = templateData.rows[0];
        }
      } catch (e) {
        console.error('Template fetch failed:', templateId);
      }
    }

    // 4. Map assets to NFTs with template images
    const nfts = assets.rows.map(row => {
      const template = templates[row.template_id];
      
      let img = '';
      if (template?.immutable_data) {
        // Try common image fields in template
        img = template.immutable_data.img ||
              template.immutable_data.image ||
              template.immutable_data.image_1 ||
              '';
      }
      
      // Fallback: construct standard AtomicAssets image URL
      if (!img && row.template_id) {
        img = `https://images.atomicassets.io/nftv2/354415534331/354415534331/${row.template_id}/preview.png`;
      }

      const name = row.name || 
                   (template?.name || '') || 
                   `Asset #${row.asset_id}`;
      
      return { 
        image: img, 
        name: name,
        asset_id: row.asset_id,
        template_id: row.template_id
      };
    }).filter(nft => nft.image);  // only return NFTs with images

    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
