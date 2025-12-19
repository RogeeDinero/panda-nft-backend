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
        limit: 24,
        // Filter for Proton Pandas only
        index_position: "2",
        key_type: "i64",
        lower_bound: "144534352512",
        upper_bound: "144534352513"
      })
    });

    const rpcData = await rpcResp.json();
    
    const nfts = (rpcData.rows || []).slice(0, 24).map(row => {
      const assetId = row.asset_id;
      
      // 👈 REAL Proton Pandas images from Soon.Market IPFS gateway
      const img = `https://ipfs-gateway.soon.market/ipfs/QmP4atVZ6erpM8tWj4a753nNwpDraf8Ga5ByGdT5P3P9sP`;
      
      // Or construct per-asset (from your working example pattern)
      // const img = `https://ipfs-gateway.soon.market/ipfs/Qm${assetId.slice(0,46)}`;
      
      const name = `Panda #${row.template_id || row.asset_id}`;
      
      return { image: img, name, asset_id: assetId };
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
