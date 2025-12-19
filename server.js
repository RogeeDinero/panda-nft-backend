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
      
      // Panda collection uses Soon.Market CDN
      let img = '';
      if (templateId) {
        img = `https://soon.market/ipfs/${templateId}.png`;
        // Fallback to generic Panda images by template ID range
        if (templateId < 50000) img = `https://pandania.xyz/images/pandas/common/${templateId % 10 + 1}.png`;
        else if (templateId < 100000) img = `https://pandania.xyz/images/pandas/rare/${templateId % 8 + 1}.png`;
        else img = `https://pandania.xyz/images/pandas/legendary/${templateId % 5 + 1}.png`;
      }

      const name = `Panda #${templateId || row.asset_id}`;
      
      return { image: img, name };
    }).filter(nft => nft.image); // Only return with valid images

    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
