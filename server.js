import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 10000;

const COLLECTION_IDENTIFIER = process.env.COLLECTION_NAME || '144534352512';
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://proton.greymass.com';

app.use(cors({
  origin: ['http://localhost:5500', 'http://pandania.xyz', 'https://pandania.xyz']
}));

async function queryProtonRPC(body) {
  const response = await fetch(`${RPC_ENDPOINT}/v1/chain/get_table_rows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`RPC request failed`);
  return await response.json();
}

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  try {
    const assetsData = await queryProtonRPC({
      json: true,
      code: 'atomicassets',
      scope: wallet,
      table: 'assets',
      limit: 1000
    });

    if (!assetsData.rows) return res.json([]);

    const pandas = assetsData.rows.filter(a => a.collection_name === COLLECTION_IDENTIFIER);
    console.log(`🐼 Found ${pandas.length} Proton Pandas for ${wallet}`);

    if (pandas.length === 0) return res.json([]);

    // Fetch actual image URLs by scraping marketplace HTML
    const nfts = await Promise.all(pandas.map(async (asset) => {
      let imageUrl = null;
      
      try {
        // Fetch the marketplace page for this specific NFT
        const marketplaceUrl = `https://nft.xprnetwork.org/${COLLECTION_IDENTIFIER}/${asset.template_id}`;
        console.log(`📡 Fetching: ${marketplaceUrl}`);
        
        const response = await fetch(marketplaceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // Extract IPFS hash from the HTML (look for proton.mypinata.cloud or bloks.io URLs)
          const ipfsMatch = html.match(/proton\.mypinata\.cloud\/ipfs\/(Qm[a-zA-Z0-9]{44})/);
          const bloksMatch = html.match(/bloks\.io\/cdn-cgi\/image\/[^"]+\/https:\/\/proton\.mypinata\.cloud\/ipfs\/(Qm[a-zA-Z0-9]{44})/);
          
          if (bloksMatch && bloksMatch[1]) {
            imageUrl = `https://bloks.io/cdn-cgi/image/width=400/https://proton.mypinata.cloud/ipfs/${bloksMatch[1]}`;
            console.log(`✅ Found bloks.io image for template ${asset.template_id}: ${bloksMatch[1]}`);
          } else if (ipfsMatch && ipfsMatch[1]) {
            imageUrl = `https://proton.mypinata.cloud/ipfs/${ipfsMatch[1]}`;
            console.log(`✅ Found IPFS image for template ${asset.template_id}: ${ipfsMatch[1]}`);
          } else {
            console.log(`⚠️ No image found in HTML for template ${asset.template_id}`);
          }
        }
      } catch (err) {
        console.log(`❌ Failed to fetch marketplace page for template ${asset.template_id}: ${err.message}`);
      }
      
      // Fallback to placeholder if scraping failed
      if (!imageUrl) {
        imageUrl = `https://via.placeholder.com/300x300/333333/ffffff?text=Panda+${asset.template_id}`;
      }
      
      return {
        asset_id: asset.asset_id,
        template_id: asset.template_id,
        name: `Proton Panda #${asset.asset_id}`,
        image: imageUrl,
        collection: COLLECTION_IDENTIFIER
      };
    }));

    console.log(`✅ Returning ${nfts.length} NFTs with scraped images`);
    res.json(nfts);

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', collection: COLLECTION_IDENTIFIER });
});

app.get('/', (req, res) => {
  res.json({ message: 'Panda Pawn Shop API', collection: COLLECTION_IDENTIFIER });
});

app.listen(PORT, () => {
  console.log(`🐼 Backend running on port ${PORT}`);
});
