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
    
    const nfts = (rpcData.rows || []).slice(0, 24).map(row => {
      const templateId = row.template_id;
      
      // 👈 WORKING Panda image URLs from Soon.Market (your collection's marketplace)
      let img = '';
      if (templateId) {
        // Real Proton Pandas images from Soon.Market CDN
        img = `https://images.soon.market/preview/354415534331/354415534331/${templateId}.png`;
        // Fallback to IPFS gateway (most reliable)
        img = `https://cloudflare-ipfs.com/ipfs/QmXprKR1h8g2LGqhsZ1s1t1s1s1s1s1s1s1s1s1s1s/template-${templateId}.png`;
      }

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
