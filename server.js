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
    // Use Proton's official NFT API (much simpler + working images)
    const resp = await fetch(`https://api.protonnft.io/v1/assets?account=${wallet}&collection_name=354415534331&limit=24`);
    const data = await resp.json();
    
    const nfts = data.data.map(nft => ({
      image: nft.template?.image || nft.data?.img || nft.data?.image || '',
      name: nft.template?.name || nft.data?.name || `Asset #${nft.asset_id}`
    })).filter(nft => nft.image); // only NFTs with images

    res.json(nfts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load NFTs' });
  }
});

app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
