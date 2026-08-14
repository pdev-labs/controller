const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3000');
ws.on('open', () => { console.log('Connected!'); ws.close(); });
ws.on('error', (e) => console.log('Error:', e));
