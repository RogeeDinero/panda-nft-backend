// server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Helper to resolve IPFS / fallback images ---
function resolveImage(img) {
  if (!img) return 'https://pandania.xyz/images/placeholder.png'; // your own placeholder
  if (img.startsWith('ipfs://')) return img.replace('ipfs://', 'https://ipfs.io/ipfs/');
  if (img.startsWith('Qm')) return `https://ipfs.io/ipfs/${img}`;
  return img;
}

// --- Endpoint to fetch wallet NFTs ---
app.get('/wallet/:account', async (req, res) => {
  const account = req.params.account;
  const NFT_ENDPOINT = process.env.NEXT_PUBLIC_NFT_ENDPOINT || 'https://proton.api.atomicassets.io';

  try {
    // Step 1: Fetch all assets for the wallet
    const assetsResp = await fetch(`${NFT_ENDPOINT}/atomicassets/v1/accounts/${account}/assets`);
    const assetsData = await assetsResp.json();
    const walletAssets = assetsData.data || [];

    // Step 2: Filter Proton Pandas (replace with your collection name)
    const protonPandasAssets = walletAssets.filter(a => a.collection.collection_name === '144534352512');

    // Step 3: For each Proton Panda, fetch template metadata
    const result = await Promise.all(protonPandasAssets.map(async asset => {
      const templateId = asset.template.template_id;

      try {
        const templateResp = await fetch(`${NFT_ENDPOINT}/atomicassets/v1/templates/144534352512/${templateId}`);
        const templateData = await templateResp.json();
        const img = templateData.data ? (templateData.data.img || templateData.data.image) : null;

        return {
          asset_id: asset.asset_id,
          template_id: templateId,
          name: asset.name || `Proton Panda #${templateId}`,
          image: resolveImage(img)
        };
      } catch (err) {
        console.error(`Error fetching template ${templateId}:`, err);
        return {
          asset_id: asset.asset_id,
          template_id: templateId,
          name: asset.name || `Proton Panda #${templateId}`,
          image: 'https://pandania.xyz/images/placeholder.png'
        };
      }
    }));

    console.log(`✅ Returning ${result.length} Proton Pandas`);
    res.json(result);

  } catch (err) {
    console.error('Error fetching wallet assets:', err);
    res.status(500).json({ error: 'Failed to fetch wallet NFTs' });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log('🐼 Panda backend LIVE — XPR Network official');
  console.log(`Available at http://localhost:${PORT}`);
});
