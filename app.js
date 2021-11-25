const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use(express.static('/'));
app.use('/lib/', express.static('lib'));
app.use('/sounds/', express.static('sounds'));
app.use('/images/', express.static('images'));
app.use('/models/', express.static('models'));
app.use('/node_modules/', express.static('node_modules'));

app.get('/', (req, res) => {
  res.sendFile(__dirname+'/index.html');
});

var imgs = [];

// https://stackoverflow.com/questions/41381444/websocket-connection-failed-error-during-websocket-handshake-unexpected-respon

io.on('connection', (socket) => {
  console.log('user connected!');

  socket.on('imgdrawn', (data) => {
    console.log('image received!');
    imgs.push(data.src);
    socket.emit('img', { array: imgs });
  });
  
  socket.on('imgrequest', (data) => {
    console.log('image requested');
    socket.emit('img', { array: imgs });
  });
  
  socket.on('disconnect', function() {
    console.log('user disconnected.');
  });
});

const port = process.env.port || 3000;
server.listen(port);
console.log("live at http://localhost:"+port+", probably");