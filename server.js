import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 10000;

// Environment variables - ACTUAL on-chain collection identifier
const COLLECTION_IDENTIFIER = process.env.COLLECTION_NAME || '144534352512';
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://proton.greymass.com';

// Allow requests from frontend
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

// Helper: convert IPFS → HTTPS
function resolveImage(img) {
  if (!img) return null;
  
  // If already a full HTTP/HTTPS URL, return as-is
  if (img.startsWith('http://') || img.startsWith('https://')) {
    return img;
  }
  
  // Handle ipfs:// protocol
  if (img.startsWith('ipfs://')) {
    const hash = img.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }
  
  // Handle raw IPFS hash (starts with Qm)
  if (img.startsWith('Qm')) {
    return `https://ipfs.io/ipfs/${img}`;
  }
  
  // If it's a path-like string, try to extract IPFS hash
  const ipfsMatch = img.match(/Qm[a-zA-Z0-9]{44}/);
  if (ipfsMatch) {
    return `https://ipfs.io/ipfs/${ipfsMatch[0]}`;
  }
  
  return img;
}

// Helper: Query Proton RPC
async function queryProtonRPC(body) {
  const response = await fetch(`${RPC_ENDPOINT}/v1/chain/get_table_rows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.statusText}`);
  }
  
  return await response.json();
}

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  
  if (!wallet) {
    return res.status(400).json({ error: 'wallet parameter required' });
  }

  console.log(`\n🐼 Fetching Proton Pandas for wallet: ${wallet}`);
  console.log(`📦 Using collection identifier: ${COLLECTION_IDENTIFIER}`);

  try {
    // 1️⃣ Get all assets owned by wallet
    const assetsData = await queryProtonRPC({
      json: true,
      code: 'atomicassets',
      scope: wallet,
      table: 'assets',
      limit: 1000
    });

    console.log(`📊 Total assets in wallet: ${assetsData.rows?.length || 0}`);

    if (!assetsData.rows || assetsData.rows.length === 0) {
      console.log('⚠️ No assets found in wallet');
      return res.json([]);
    }

    // 2️⃣ Filter for Proton Pandas (collection identifier 144534352512)
    const pandas = assetsData.rows.filter(asset => 
      asset.collection_name === COLLECTION_IDENTIFIER
    );

    console.log(`🐼 Found ${pandas.length} Proton Pandas`);

    if (pandas.length === 0) {
      console.log('⚠️ No Proton Pandas found in wallet');
      return res.json([]);
    }

    // 3️⃣ Get unique template IDs
    const templateIds = [...new Set(pandas.map(p => p.template_id))];
    console.log(`📋 Fetching ${templateIds.length} unique templates`);

    // 4️⃣ Fetch template data for images
    const templatesData = await queryProtonRPC({
      json: true,
      code: 'atomicassets',
      scope: COLLECTION_IDENTIFIER,
      table: 'templates',
      lower_bound: Math.min(...templateIds),
      upper_bound: Math.max(...templateIds),
      limit: 1000
    });

    console.log(`📄 Retrieved ${templatesData.rows?.length || 0} template records`);

    // 5️⃣ Build template → image mapping
    const templateMap = {};
    
    if (templatesData.rows) {
      for (const template of templatesData.rows) {
        let img = null;
        
        // Try to get image from immutable_data
        if (template.immutable_data) {
          // If immutable_data is already deserialized
          if (typeof template.immutable_data === 'object') {
            img = template.immutable_data.img || 
                  template.immutable_data.image || 
                  template.immutable_data.video;
          }
        }
        
        // Fallback: use XPR NFT viewer URL
        if (!img && template.template_id) {
          img = `https://xpr.network/nfts/${COLLECTION_IDENTIFIER}/${template.template_id}`;
        }
        
        templateMap[template.template_id] = resolveImage(img);
        console.log(`🖼️ Template ${template.template_id}: ${img ? 'Image found' : 'Using fallback URL'}`);
      }
    }

    // 6️⃣ Map to frontend format
    const nfts = pandas.map(asset => {
      const imageUrl = templateMap[asset.template_id] || 
                       `https://nft.xprnetwork.org/${COLLECTION_IDENTIFIER}/${asset.asset_id}`;
      
      return {
        asset_id: asset.asset_id,
        template_id: asset.template_id,
        name: `Proton Panda #${asset.asset_id}`,
        image: imageUrl,
        collection: COLLECTION_IDENTIFIER
      };
    });

    console.log(`✅ Returning ${nfts.length} Proton Pandas\n`);
    res.json(nfts);

  } catch (err) {
    console.error('❌ Backend error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch NFTs',
      message: err.message,
      hint: 'Check Proton RPC connectivity'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Panda Pawn Shop Backend',
    method: 'Proton RPC Direct Query',
    rpc_endpoint: RPC_ENDPOINT,
    collection: COLLECTION_IDENTIFIER
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Panda Pawn Shop API - Direct RPC Method',
    endpoints: {
      pandas: '/api/pandas?wallet=YOUR_WALLET',
      health: '/health'
    },
    collection_id: COLLECTION_IDENTIFIER
  });
});

app.listen(PORT, () => {
  console.log(`🐼 Panda Pawn Shop Backend running on port ${PORT}`);
  console.log(`📦 Collection ID: ${COLLECTION_IDENTIFIER}`);
  console.log(`⛓️ RPC Endpoint: ${RPC_ENDPOINT}`);
  console.log(`🔧 Method: Direct blockchain RPC queries`);
});
