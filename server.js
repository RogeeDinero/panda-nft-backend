import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 10000;

// Environment variables with correct Proton endpoints
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'Proton Pandas';
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://proton.greymass.com';

// Correct Proton AtomicAssets API endpoints (in priority order)
const ATOMICASSETS_ENDPOINTS = [
  'https://aa-proton.saltant.io',
  'https://aa-xprnetwork.saltant.io',
  'https://proton.api.atomicassets.io'
];

// Allow requests from frontend
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://pandania.xyz',
    'https://pandania.xyz'
  ]
}));

// Helper: convert IPFS → HTTPS with multiple gateway options
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

// Helper: try multiple AtomicAssets endpoints
async function fetchFromAtomicAssets(path) {
  let lastError = null;
  
  for (const endpoint of ATOMICASSETS_ENDPOINTS) {
    try {
      const url = `${endpoint}${path}`;
      console.log(`🔍 Trying endpoint: ${url}`);
      
      const response = await fetch(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PandaPawnShop/1.0'
        }
      });
      
      if (!response.ok) {
        console.log(`❌ Endpoint ${endpoint} returned status ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ Successfully fetched from ${endpoint}`);
      return data;
      
    } catch (err) {
      console.log(`❌ Error with endpoint ${endpoint}:`, err.message);
      lastError = err;
      continue;
    }
  }
  
  throw lastError || new Error('All AtomicAssets endpoints failed');
}

app.get('/api/pandas', async (req, res) => {
  const { wallet } = req.query;
  
  if (!wallet) {
    return res.status(400).json({ error: 'wallet parameter required' });
  }

  console.log(`\n🐼 Fetching Proton Pandas for wallet: ${wallet}`);

  try {
    // Normalize collection name (remove spaces, lowercase)
    const collectionParam = COLLECTION_NAME.replace(/ /g, '').toLowerCase();
    console.log(`📦 Looking for collection: ${collectionParam}`);
    
    // Fetch assets from AtomicAssets API
    const path = `/atomicassets/v1/assets?owner=${wallet}&collection_name=${collectionParam}&limit=100`;
    const data = await fetchFromAtomicAssets(path);

    if (!data || !data.data || !Array.isArray(data.data)) {
      console.log('❌ Invalid response structure from API');
      return res.json([]);
    }

    console.log(`📊 Found ${data.data.length} assets`);

    if (data.data.length === 0) {
      console.log('⚠️ No assets found for this wallet in the Proton Pandas collection');
      return res.json([]);
    }

    // Map assets to frontend-friendly structure
    const nfts = data.data.map(asset => {
      // Try multiple locations for image data
      let img = null;
      
      // Check asset immutable_data
      if (asset.immutable_data) {
        img = asset.immutable_data.img || 
              asset.immutable_data.image || 
              asset.immutable_data.video ||
              asset.immutable_data.media;
      }
      
      // Check asset data
      if (!img && asset.data) {
        img = asset.data.img || 
              asset.data.image || 
              asset.data.video ||
              asset.data.media;
      }
      
      // Check template immutable_data
      if (!img && asset.template && asset.template.immutable_data) {
        img = asset.template.immutable_data.img || 
              asset.template.immutable_data.image || 
              asset.template.immutable_data.video ||
              asset.template.immutable_data.media;
      }

      const resolvedImage = resolveImage(img);
      const nftName = asset.name || `Proton Panda #${asset.asset_id}`;
      
      console.log(`🖼️ Asset ${asset.asset_id}: ${nftName} -> ${resolvedImage ? 'Image Found' : 'No Image'}`);

      return {
        asset_id: asset.asset_id,
        template_id: asset.template?.template_id || null,
        name: nftName,
        image: resolvedImage || `https://nft.xprnetwork.org/${asset.template_id || 'default'}/${asset.asset_id}`,
        // Include raw data for debugging if needed
        collection: asset.collection?.collection_name || collectionParam
      };
    });

    console.log(`✅ Returning ${nfts.length} Proton Pandas for wallet ${wallet}\n`);
    res.json(nfts);

  } catch (err) {
    console.error('❌ Backend error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch NFTs',
      message: err.message,
      hint: 'Check if wallet has Proton Pandas NFTs and API endpoints are accessible'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Panda Pawn Shop Backend',
    endpoints: ATOMICASSETS_ENDPOINTS,
    collection: COLLECTION_NAME
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Panda Pawn Shop API',
    endpoints: {
      pandas: '/api/pandas?wallet=YOUR_WALLET',
      health: '/health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🐼 Panda Pawn Shop Backend running on port ${PORT}`);
  console.log(`📦 Collection: ${COLLECTION_NAME}`);
  console.log(`🔗 AtomicAssets Endpoints: ${ATOMICASSETS_ENDPOINTS.join(', ')}`);
  console.log(`⛓️ RPC Endpoint: ${RPC_ENDPOINT}`);
});
