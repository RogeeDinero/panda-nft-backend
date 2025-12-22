import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 10000;

// Environment variables
const COLLECTION_IDENTIFIER = process.env.COLLECTION_NAME || '144534352512';
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://proton.greymass.com';

app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

function resolveImage(img) {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('ipfs://')) return img.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (img.startsWith('Qm')) return `https://ipfs.io/ipfs/${img}`;
  const ipfsMatch = img.match(/Qm[a-zA-Z0-9]{44}/);
  if (ipfsMatch) return `https://ipfs.io/ipfs/${ipfsMatch[0]}`;
  return img;
}

async function queryProtonRPC(body) {
  const response = await fetch(`${RPC_ENDPOINT}/v1/chain/get_table_rows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`RPC request failed: ${response.statusText}`);
  return await response.json();
}

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet parameter required' });

  console.log(`\n🐼 Fetching Proton Pandas for wallet: ${wallet}`);

  try {
    const assetsData = await queryProtonRPC({
      json: true,
      code: 'atomicassets',
      scope: wallet,
      table: 'assets',
      limit: 1000
    });

    if (!assetsData.rows || assetsData.rows.length === 0) {
      return res.json([]);
    }

    const pandas = assetsData.rows.filter(asset => 
      asset.collection_name === COLLECTION_IDENTIFIER
    );

    console.log(`🐼 Found ${pandas.length} Proton Pandas`);

    if (pandas.length === 0) {
      return res.json([]);
    }

    const nfts = pandas.map(asset => {
      // Use AtomicAssets resizer CDN - most reliable
      const imageUrl = `https://resizer.atomichub.io/images/v1/preview?ipfs=QmPXNqKxvD4C5gD9Z6RHqmvZgKpHZJPWpGpxJ5PqWq9mZ8&template_id=${asset.template_id}&size=370`;
      
      return {
        asset_id: asset.asset_id,
        template_id: asset.template_id,
        name: `Proton Panda #${asset.asset_id}`,
        image: imageUrl,
        collection: COLLECTION_IDENTIFIER,
        fallback_urls: [
          `https://atomichub-ipfs.com/ipfs/QmPXNqKxvD4C5gD9Z6RHqmvZgKpHZJPWpGpxJ5PqWq9mZ8/${asset.template_id}`,
          `https://ipfs.io/ipfs/QmPXNqKxvD4C5gD9Z6RHqmvZgKpHZJPWpGpxJ5PqWq9mZ8/${asset.template_id}.png`,
          `https://cloudflare-ipfs.com/ipfs/QmPXNqKxvD4C5gD9Z6RHqmvZgKpHZJPWpGpxJ5PqWq9mZ8/${asset.template_id}`
        ]
      };
    });

    console.log(`✅ Returning ${nfts.length} Proton Pandas`);
    res.json(nfts);

  } catch (err) {
    console.error('❌ Backend error:', err.message);
    res.status(500).json({ error: 'Failed to fetch NFTs', message: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Panda Pawn Shop Backend', collection: COLLECTION_IDENTIFIER });
});

app.get('/', (req, res) => {
  res.json({ message: 'Panda Pawn Shop API', collection_id: COLLECTION_IDENTIFIER });
});

app.listen(PORT, () => {
  console.log(`🐼 Panda Pawn Shop Backend running on port ${PORT}`);
  console.log(`📦 Collection ID: ${COLLECTION_IDENTIFIER}`);
});
