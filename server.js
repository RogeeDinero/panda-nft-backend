const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ 
  origin: ['http://pandania.xyz', 'https://pandania.xyz']
}));

app.use(express.json());

function deserializeAtomicData(serializedData) {
  // Simple AtomicAssets deserializer for immutable_data
  let data = {};
  for (let i = 0; i < serializedData.length; i += 2) {
    const key = String.fromCharCode(serializedData[i]);
    const valueLength = serializedData[i + 1];
    const value = serializedData.slice(i + 2, i + 2 + valueLength).toString();
    data[key] = value;
  }
  return data;
}

app.get('/api/nfts', async (req, res) =>
