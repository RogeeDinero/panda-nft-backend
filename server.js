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

    const nfts = pandas.map(asset => ({
      asset_id: asset.asset_id,
      template_id: asset.template_id,
      name: `Proton Panda #${asset.asset_id}`,
      // Use marketplace preview as image proxy - most reliable!
      image: `https://nft.xprnetwork.org/preview/${COLLECTION_IDENTIFIER}/${asset.template_id}`,
      collection: COLLECTION_IDENTIFIER,
      fallback_urls: [
        `https://bloks.io/cdn-cgi/image/width=400/https://proton.mypinata.cloud/ipfs/QmbQF1dXUFE7hHPck8UuGkMJw9jrb2dGg5CrED8CMEwNcP`,
        `https://proton.mypinata.cloud/ipfs/QmbQF1dXUFE7hHPck8UuGkMJw9jrb2dGg5CrED8CMEwNcP`
      ]
    }));

    console.log(`✅ Returning ${nfts.length} NFTs`);
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
