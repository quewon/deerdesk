const express = require('express');
const app = express();
const server = require('http').createServer(app);
// const io = require("socket.io")(server);
const { Server } = require('socket.io');

const io = new Server(server, { /* options */ });

app.use(express.static('public'));
app.use('/public/lib/', express.static('lib'));
app.use('/models/', express.static('models'));
app.use('/images/', express.static('images'));
app.use('/sounds/', express.static('sounds'));
// app.use('/node_modules/', express.static('node_modules'));

app.get('/', (req, res) => {
  res.sendFile(__dirname+'/index.html');
});

var imgs = [];
var guestbook = [];
var scores = {
  pc: [],
  phone: [],
};

// https://stackoverflow.com/questions/41381444/websocket-connection-failed-error-during-websocket-handshake-unexpected-respon

io.on('connection', (socket) => {
  console.log('user connected');

  socket.on('imgdrawn', (data) => {
    console.log('  image received');
    imgs.push(data.src);
    socket.emit('img', { array: imgs });
  });
  
  socket.on('datarequest', function() {
    socket.emit('datasend', { imgs: imgs, scores: scores, guestbook: guestbook })
  });
  socket.on('datawrite', (data) => {
    imgs = data.imgs;
    scores = data.scores;
    guestbook = data.guestbook;
  });
  
  socket.on('setscore', (data) => {
    console.log('  '+data.game+': score of '+data.score+' received from '+data.username);
    scores[data.game].push({
      username: data.username,
      score: data.score,
    });
    socket.emit('getscore', { pc: scores.pc, phone: scores.phone });
  });
  
  socket.on('imgrequest', (data) => {
    socket.emit('img', { array: imgs });
  });
  
  socket.on('guestbook', (data) => {
    guestbook.push(data);
    socket.emit('guestbookupdate', { array: guestbook });
  });
  
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});

const port = process.env.port || 3000;
server.listen(port, function() {
  var addr = server.address();
  console.log('app listening on http://' + addr.address + ':' + addr.port);
});