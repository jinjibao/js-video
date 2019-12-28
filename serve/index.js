let https = require('https');
let fs = require('fs');
let express = require('express');
let serveIndex = require('serve-index');

let app = express();
app.use(serveIndex('./public'));
app.use(express.static('./public'));

let options = {
  key: fs.readFileSync('./privatekey.pem'),
  cert: fs.readFileSync('./certificate.pem')
}

let https_server = https.createServer(options, app);
https_server.listen(8089)