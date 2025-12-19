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
    
    const nfts = (rpcData.rows || []).map(row => {
      // Panda collection uses template IDs - construct working image URLs
      const templateId = row.template_id;
      let img = '';
      
      if (templateId) {
        // Use Wax AtomicAssets CDN (works reliably)
        img = `https://wax.api.atomicassets.io/images/templates/354415534331/354415534331/${templateId}/preview.png`;
        // Or Proton explorer fallback
        img = `https://proton.arkhamintelligence.com/nft/354415534331/${templateId}`;
      }

      const name = `Panda #${templateId || row.asset_id}`;
      
      return { image: img, name };
    }).slice(0, 24);  // limit results

    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
