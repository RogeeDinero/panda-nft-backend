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
    // OFFICIAL XPR AtomicAssets API - gives real images + names
    const aaResp = await fetch(`https://aa-mainnet.xprnetwork.org/api/assets?owner=${wallet}&collection=144534352512&limit=24`);
    const aaData = await aaResp.json();
    
    console.log(`Found ${aaData.data?.length || 0} Pandas for ${wallet}`);
    
    const nfts = (aaData.data || []).slice(0, 24).map(nft => {
      // REAL images and names from official API
      const img = nft.template?.image || nft.data?.img || nft.data?.image || '';
      const name = nft.template?.name || nft.data?.name || `Panda #${nft.template_id}`;
      
      return { 
        image: img, 
        name: name,
        asset_id: nft.asset_id
      };
    }).filter(nft => nft.image);

    console.log(`Returning ${nfts.length} NFTs`);
    res.json(nfts);
  } catch (err) {
    console.error(err);
    // Fallback to simple version
    res.json([
      { image: "https://ipfs-gateway.soon.market/ipfs/QmP4atVZ6erpM8tWj4a753nNwpDraf8Ga5ByGdT5P3P9sP", name: "Governor #001" },
      { image: "https://ipfs-gateway.soon.market/ipfs/QmP4atVZ6erpM8
