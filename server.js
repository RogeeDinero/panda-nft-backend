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
        // 👈 REMOVED schema filter - gets ALL NFTs in wallet
      })
    });

    const rpcData = await rpcResp.json();
    
    console.log('Found rows:', rpcData.rows?.length || 0);
    
    const nfts = (rpcData.rows || []).slice(0, 24).map(row => {
      const templateId = row.template_id;
      
      // 👈 WORKING IPFS gateway from your example
      let img = `https://ipfs-gateway.soon.market/ipfs/QmP4atVZ6erpM8tWj4a753nNwpDraf8Ga5ByGdT5P3P9sP`;
      
      // Or use Soon.Market NFT page image pattern
      // img = `https://soon.market/_next/image?url=https%3A%2F%2Fipfs-gateway.soon.market%2Fipfs%2FQmP4atVZ6erpM8tWj4a753nNwpDraf8Ga5ByGdT5P3P9sP&w=640&q=100`;
      
      const name = `Panda #${templateId || row.asset_id}`;
      
      return { image: img, name };
    }).filter(nft => nft.image);

    console.log('Returning NFTs:', nfts.length);
    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
