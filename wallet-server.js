const express = require('express');
const path = require('path');
const app = express();
const PORT = 3002;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the wallet app at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'wallet-app.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-auth-flow.html'));
});

app.listen(PORT, () => {
    console.log(`🔐 DID Wallet Server running at http://localhost:${PORT}`);
    console.log(`📱 Access your wallet at: http://localhost:${PORT}`);
});
