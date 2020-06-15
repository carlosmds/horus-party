const app = require('express')();
const logger = require('pino')();
const redis = require('redis');
const fs = require('fs');

const { parsed : env } = require('dotenv').config();

const log = logger.child({ level: env.LOG_LEVEL || 'info', prettyPrint: true });

// const server = require('https').createServer({
//     key: fs.readFileSync(env.SSL_KEY),
//     cert: fs.readFileSync(env.SSL_CERTIFICATE),
//     ca: fs.readFileSync(env.SSL_CA),
// }, app);

const server = require('http')// for localhost

const io = require('socket.io')(server);

const redisClient = redis.createClient({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    no_ready_check: true,
    auth_pass: env.REDIS_PASSWORD
});

redisClient.on('connect', () => {   
    log.info("Redis connected");
}); 

redisClient.on('error', (err) => {
    log.error("Error " + err)
});

io.on('connection', socket => {

    let user = { 
        id: socket.id,
        ...socket.handshake.query
    };

    // name, color, room, base64image ?

    log.debug(user, 'User connected');
    
    socket.emit('connected', user);
});

server.listen(env.PORT, () => {
    log.info('Server running on port %d', env.PORT);
});

process.on('SIGINT', function() {
    log.info( "Gracefully shutting down from SIGINT (Ctrl-C)" );
    process.exit(1);
});
