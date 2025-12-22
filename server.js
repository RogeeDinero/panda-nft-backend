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

    // Get unique template IDs
    const templateIds = [...new Set(pandas.map(p => p.template_id))];
    console.log(`📋 Fetching templates: ${templateIds.join(', ')}`);

    // Fetch template data from the working AtomicAssets API
    const templateMap = {};
    try {
      const templateUrl = `https://aa-xprnetwork-main.saltant.io/atomicassets/v1/templates?collection_name=${COLLECTION_IDENTIFIER}&ids=${templateIds.join(',')}&limit=100`;
      console.log(`📡 Fetching templates from: ${templateUrl}`);
      
      const templateResponse = await fetch(templateUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        console.log(`✅ Received ${templateData.data?.length || 0} templates`);

        if (templateData.success && templateData.data) {
          templateData.data.forEach(template => {
            const ipfsHash = template.immutable_data?.image || template.immutable_data?.img;
            if (ipfsHash) {
              templateMap[template.template_id] = ipfsHash;
              console.log(`🖼️ Template ${template.template_id}: ${ipfsHash}`);
            }
          });
        }
      } else {
        console.log(`⚠️ Template API returned ${templateResponse.status}`);
      }
    } catch (apiErr) {
      console.log(`❌ Failed to fetch templates: ${apiErr.message}`);
    }

    // Map NFTs with images
    const nfts = pandas.map(asset => {
      const ipfsHash = templateMap[asset.template_id];
      let imageUrl;

      if (ipfsHash) {
        imageUrl = `https://bloks.io/cdn-cgi/image/width=400/https://proton.mypinata.cloud/ipfs/${ipfsHash}`;
      } else {
        // Fallback SVG
        imageUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23333' width='300' height='300'/%3E%3Ctext fill='%23fff' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EProton Panda%3C/text%3E%3Ctext fill='%23888' font-family='Arial' font-size='16' x='50%25' y='60%25' text-anchor='middle'%3ETemplate ${asset.template_id}%3C/text%3E%3C/svg%3E`;
      }

      return {
        asset_id: asset.asset_id,
        template_id: asset.template_id,
        name: `Proton Panda #${asset.asset_id}`,
        image: imageUrl,
        collection: COLLECTION_IDENTIFIER
      };
    });

    console.log(`✅ Returning ${nfts.length} NFTs with images`);
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
