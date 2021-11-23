const express = require('express');
const app = express();
const path = require('path');
const router = express.Router();

app.use(express.static('/', router));
app.use('/lib/', express.static('lib'));
app.use('/sounds/', express.static('sounds'));
app.use('/images/', express.static('images'));
app.use('/models/', express.static('models'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname+'/index.html'));
});

const port = process.env.port || 3000;
app.listen(port);
console.log("live at http://localhost:"+port);