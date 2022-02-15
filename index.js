require('dotenv').config()

const logger = require('pino')();
const app = require('express');
const server = require('http').createServer(app);// for localhost

const log = logger.child({ prettyPrint: true });

const redis = require('redis');

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    no_ready_check: true,
    auth_pass: process.env.REDIS_PASSWORD
});

redisClient.on('connect', () => {   
    log.info("Redis connected successfully!");
}); 

redisClient.on('error', (err) => {
    log.error("Redis connection error: " + err)
});

const users = {};
const socketToRoom = {};

const io = require('socket.io')(server);

io.on('connection', socket => {

    let user = {
        id: socket.id,
        ...socket.handshake.query
    };

    emitAllRooms(socket);

    log.debug(['User connected', JSON.stringify(user)]);

    socket.on("join room", roomID => {

      user.room = roomID;
      userAcceptance(socket, user);

    });
});

async function userAcceptance(socket, user)
{
    const previouslyConnectedUsers = await getPreviouslyConnectedUsers(user);

    log.info(['previouslyConnectedUsers', previouslyConnectedUsers]);

    if ((previouslyConnectedUsers.length ?? 0) == 4) {
      socket.emit("room full");
      return;
    }

    redisClient.set(`room:${user.room}:user:${user.id}`, JSON.stringify(user));
    
    let usersInThisRoom = previouslyConnectedUsers.filter(redisUser => redisUser.id !== user.id);

    log.info(['userAcceptance:usersInThisRoom', usersInThisRoom]);
  
    socket.emit("all users", usersInThisRoom);

    handleSocketRoom(socket, user)
}

function handleSocketRoom(socket, user){

  socket.on("sending signal", payload => {
    io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on("returning signal", payload => {
    io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: user.id });
  });

  socket.on('disconnect', () => {
    redisClient.del(`room:${user.room}:user:${user.id}`);
  });
}

function getPreviouslyConnectedUsers(user)
{
  return new Promise((resolve) => {
    try {
      redisClient.keys(`room:${user.room}:user:*`, function(err, keys) {  
        
        if (err) throw err;

        log.info(['getPreviouslyConnectedUsers:keys', keys]);
        
        if (keys.length == 0) {
          resolve([]);
          return;
        }

        redisClient.mget(keys, function(err, users) {

            if (err) throw err;

            if (users.length == 0) {
              resolve([]);
              return;
            }

            connectedUsers = users.map(user => JSON.parse(user));

            log.info(['getPreviouslyConnectedUsers:connectedUsers', connectedUsers]);
            resolve(connectedUsers);
        });
      });

    } catch(e) {
        log.error(['ERROR.getPreviouslyConnectedUsers', e]);
    }
  });
}

async function emitAllRooms(socket)
{
  const rooms = await getRooms();
  socket.broadcast.emit('all rooms', rooms)
}

function getRooms()
{
  return new Promise((resolve) => {

    try {

      redisClient.keys(`room:*`, function(err, keys) {  
        
        if (err) throw err;

        log.info(['getRooms:keys', keys]);

        resolve(keys);

      });

    } catch(e) {
        log.error(['ERROR.getPreviouslyConnectedUsers', e]);
    }
  });
}

server.listen(process.env.PORT, () => {
  log.info('Running on port '+process.env.PORT);
});