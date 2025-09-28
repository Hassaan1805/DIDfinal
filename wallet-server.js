const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5500'],
    credentials: true
}));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Specific route for the wallet
app.get('/wallet', (req, res) => {
    res.sendFile(path.join(__dirname, 'secure-wallet-local.html'));
});

// Network test route
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'network-test.html'));
});

// Default route serves the wallet
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'secure-wallet-local.html'));
});

app.listen(PORT, () => {
    console.log(`🔐 DID Wallet Server running on http://localhost:${PORT}`);
    console.log(`📱 Access wallet at: http://localhost:${PORT}`);
});