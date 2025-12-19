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
    // 1. Get user's assets
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
    const assets = rpcData.rows || [];
    
    console.log(`Found ${assets.length} assets`);

    // 2. For each asset, get real data from Soon.Market
    const nfts = [];
    for (const asset of assets.slice(0, 12)) {  // Limit 12 for speed
      try {
        const soonResp = await fetch(`https://soon.market/nft/${asset.asset_id}`);
        const soonText = await soonResp.text();
        
        // Extract name and image from Soon.Market HTML
        const nameMatch = soonText.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/);
        const imgMatch = soonText.match(/https:\/\/ipfs-gateway\.soon\.market\/ipfs\/[A-Za-z0-9]{46}/);
        
        const name = nameMatch ? nameMatch[1].trim() : `Panda #${asset.template_id}`;
        const imgHash = imgMatch ? imgMatch[0] : 'QmP4atVZ6erpM8tWj4a753nNwpDraf8Ga5ByGdT5P3P9sP';
        const img = `https://ipfs-gateway.soon.market/ipfs/${imgHash}`;
        
        nfts.push({ image: img, name, asset_id: asset.asset_id });
      } catch (e) {
        console.error(`Asset ${asset.asset_id} failed:`, e.message);
        // Fallback
        nfts.push({ 
          image: `https://ipfs-gateway.soon.market/ipfs/QmP4atVZ6erpM8tWj4a753nNwpDraf8Ga5ByGdT5P3P9sP`,
          name: `Panda #${asset.template_id}`,
          asset_id: asset.asset_id 
        });
      }
    }

    console.log(`Returning ${nfts.length} real NFTs`);
    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
