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

    const nfts = await Promise.all(pandas.map(async (asset) => {
      let imageUrl = null;
      
      try {
        const marketplaceUrl = `https://nft.xprnetwork.org/${COLLECTION_IDENTIFIER}/${asset.template_id}`;
        console.log(`📡 Fetching: ${marketplaceUrl}`);
        
        const response = await fetch(marketplaceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          
          // Method 1: Look for __NEXT_DATA__ JSON structure (Next.js apps)
          const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
          if (nextDataMatch && nextDataMatch[1]) {
            try {
              const nextData = JSON.parse(nextDataMatch[1]);
              console.log(`🔍 Found __NEXT_DATA__ for template ${asset.template_id}`);
              
              const pageProps = nextData?.props?.pageProps;
              if (pageProps) {
                const template = pageProps.template || pageProps.data?.template || pageProps.nft?.template;
                const immutableData = template?.immutable_data || template?.data?.immutable_data;
                
                let img = immutableData?.img || 
                         immutableData?.image ||
                         pageProps.img ||
                         pageProps.image;
                
                if (!img && immutableData) {
                  for (const key in immutableData) {
                    const value = immutableData[key];
                    if (typeof value === 'string' && value.match(/^Qm[a-zA-Z0-9]{44}$/)) {
                      img = value;
                      break;
                    }
                  }
                }
                
                if (img) {
                  if (img.startsWith('Qm')) {
                    imageUrl = `https://bloks.io/cdn-cgi/image/width=400/https://proton.mypinata.cloud/ipfs/${img}`;
                    console.log(`✅ Found IPFS hash in __NEXT_DATA__: ${img}`);
                  } else if (img.includes('ipfs://')) {
                    const hash = img.replace('ipfs://', '');
                    imageUrl = `https://bloks.io/cdn-cgi/image/width=400/https://proton.mypinata.cloud/ipfs/${hash}`;
                    console.log(`✅ Found ipfs:// in __NEXT_DATA__: ${hash}`);
                  } else if (img.includes('proton.mypinata.cloud')) {
                    imageUrl = img;
                    console.log(`✅ Found direct URL in __NEXT_DATA__`);
                  }
                }
              }
            } catch (jsonErr) {
              console.log(`⚠️ Failed to parse __NEXT_DATA__: ${jsonErr.message}`);
            }
          }
          
          // Method 2: Aggressively search for any IPFS hash in the entire HTML
          if (!imageUrl) {
            const bloksMatches = html.match(/bloks\.io\/cdn-cgi\/image\/[^"'\s]+\/https:\/\/proton\.mypinata\.cloud\/ipfs\/(Qm[a-zA-Z0-9]{44})/g);
            if (bloksMatches && bloksMatches.length > 0) {
              const hashMatch = bloksMatches[0].match(/\/ipfs\/(Qm[a-zA-Z0-9]{44})/);
              if (hashMatch && hashMatch[1]) {
                imageUrl = `https://bloks.io/cdn-cgi/image/width=400/https://proton.mypinata.cloud/ipfs/${hashMatch[1]}`;
                console.log(`✅ Found bloks.io IPFS hash: ${hashMatch[1]}`);
              }
            }
          }
          
          // Method 3: Look for proton.mypinata.cloud URLs
          if (!imageUrl) {
            const pinataMatches = html.match(/proton\.mypinata\.cloud\/ipfs\/(Qm[a-zA-Z0-9]{44})/g);
            if (pinataMatches && pinataMatches.length > 0) {
              const hashMatch = pinataMatches[0].match(/\/(Qm[a-zA-Z0-9]{44})/);
              if (hashMatch && hashMatch[1]) {
                imageUrl = `https://proton.mypinata.cloud/ipfs/${hashMatch[1]}`;
                console.log(`✅ Found pinata IPFS hash: ${hashMatch[1]}`);
              }
            }
          }
          
          // Method 4: Look for image in meta tags (likely generic, but worth trying)
          if (!imageUrl) {
            const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            const twitterImageMatch = html.match(/<meta name="twitter:image" content="([^"]+)"/);
            
            if (ogImageMatch && ogImageMatch[1] && !ogImageMatch[1].includes('banner')) {
              imageUrl = ogImageMatch[1];
              console.log(`✅ Found image in og:image for template ${asset.template_id}`);
            } else if (twitterImageMatch && twitterImageMatch[1] && !twitterImageMatch[1].includes('banner')) {
              imageUrl = twitterImageMatch[1];
              console.log(`✅ Found image in twitter:image for template ${asset.template_id}`);
            }
          }
          
          if (!imageUrl) {
            console.log(`⚠️ No image found for template ${asset.template_id}`);
          }
        }
      } catch (err) {
        console.log(`❌ Failed to fetch marketplace page for template ${asset.template_id}: ${err.message}`);
      }
      
      if (!imageUrl) {
        imageUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23333' width='300' height='300'/%3E%3Ctext fill='%23fff' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EProton Panda%3C/text%3E%3Ctext fill='%23888' font-family='Arial' font-size='16' x='50%25' y='60%25' text-anchor='middle'%3ETemplate ${asset.template_id}%3C/text%3E%3C/svg%3E`;
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
