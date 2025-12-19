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
    const rpcResp = await fetch('https://proton.greymass.com/v1/chain/get_table_rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: true,
        code: 'atomicassets',
        scope: wallet,
        table: 'assets',
        limit: 50
      })
    });

    const rpcData = await rpcResp.json();
    if (rpcData.rows && rpcData.rows.length > 0) {
  console.log('SAMPLE ROW:', JSON.stringify(rpcData.rows[0], null, 2));
}
    const nfts = (rpcData.rows || []).map(row => {
  let img = row.data?.img ||
            row.data?.image ||
            row.template?.immutable_data?.img ||
            row.template?.immutable_data?.image ||
            '';

  if (!img && row.template_id) {
    img = `https://images.atomicassets.io/nft/354415534331/354415534331/${row.template_id}/preview.png`;
  }

  const name = row.name || row.template?.name || `Asset #${row.asset_id || ''}`;
  
  return { image: img, name };
});


const server = app.listen(PORT, () => {
  console.log(`Panda NFT proxy on port ${PORT}`);
});
