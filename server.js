const express = require('express');
const socket = require('socket.io');
const cors = require('cors')

const PORT = 5000;
const app = express();

app.use(cors())

const server = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

const io = socket(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

// io.on('connection', (socket) => {
//   console.log(`user connected: ${socket.id}`);

//   socket.on('join-room', (data) => {
//      console.log(`join-room received: `, data);
//     const { roomId, username } = data;
//     socket.join(roomId);

//     const clientsInRoom = io.sockets.adapter.rooms.get(roomId);

    
//     const otherUsers = [];
//     if (clientsInRoom) {
//       console.log(`Clients in room ${roomId}:`, clientsInRoom);
//       clientsInRoom.forEach(clientId => {
//         if (clientId !== socket.id) {
//           console.log(`Adding user ${clientId} to otherUsers`);
//           otherUsers.push({clientId:clientId,username:username});
//         }
//       });
//     }

//     // Inform the new user about existing participants
//     socket.emit('existing-users', { otherUsers });


    // Inform existing users about the new participant
    // socket.to(roomId).emit('user-joined', { socketId: socket.id, username });
  // });

 const connectedPeers = new Map();

io.on('connection', (socket) => {
  

  socket.on('join-room', (data) => {
    const { roomId, username } = data;
    socket.join(roomId);

    console.log(`User connected: ${socket.id}`,username);
    // 1. Store the new user's data first
    connectedPeers.set(socket.id, { username });

    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const otherUsers = [];

    if (clientsInRoom) {
      clientsInRoom.forEach(clientId => {
        // Find existing users (not the new one)
        if (clientId !== socket.id && connectedPeers.has(clientId)) {
          
          // --- THIS IS THE FIX ---
          // Get the correct username from the map using the existing clientId
          const existingPeerUsername = connectedPeers.get(clientId).username;

          otherUsers.push({
            socketId: clientId,
            username: existingPeerUsername // Use the correct username
          });
        }
      });
    }

    // Tell the new user about the others
    socket.emit('existing-users', { otherUsers });
    // Tell others about the new user
    socket.to(roomId).emit('user-joined', { socketId: socket.id, username });
  });

  socket.on('webRTC-offer', (data) => {
    io.to(data.calleeSocketId).emit('webRTC-offer', {
      offer: data.offer,
      callerSocketId: socket.id
    });
  });

  socket.on('webRTC-answer', (data) => {
    io.to(data.callerSocketId).emit('webRTC-answer', {
      answer: data.answer,
      calleeSocketId: socket.id
    });
  });

  socket.on('webRTC-candidate', (data) => {
    io.to(data.connectedUserSocketId).emit('webRTC-candidate', {
      candidate: data.candidate,
      senderSocketId: socket.id
    });
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('user-left', { socketId: socket.id });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`user disconnected: ${socket.id}`);
  });
});