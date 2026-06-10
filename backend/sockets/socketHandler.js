// backend/sockets/socketHandler.js
const BranchToken = require('../models/BranchToken');
const Branch = require('../models/Branch');

const socketHandler = (io) => {
  // Store active connections for reconnection handling
  const activeConnections = new Map();
  
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);
    const { userId, userType, branchId } = socket.handshake.query;
    
    // Store connection for reconnection
    activeConnections.set(socket.id, { userId, userType, branchId, socketId: socket.id });
    
    // Join branch-specific room
    if (branchId) {
      socket.join(`branch-${branchId}`);
      console.log(`User ${userId} joined branch-${branchId}`);
    }
    
    // Send initial queue status
    if (branchId) {
      sendQueueStatus(io, branchId);
    }
    
    // Handle reconnection
    socket.on('reconnect-request', async ({ oldSocketId }) => {
      const oldConnection = activeConnections.get(oldSocketId);
      if (oldConnection) {
        socket.join(`branch-${oldConnection.branchId}`);
        activeConnections.set(socket.id, oldConnection);
        activeConnections.delete(oldSocketId);
        console.log(`User reconnected: ${oldConnection.userId}`);
        
        // Resend current status
        await sendQueueStatus(io, oldConnection.branchId);
      }
    });
    
    // Admin actions with instant broadcast
    socket.on('admin-action', async ({ action, data }) => {
      console.log(`Admin action: ${action} on branch ${data.branchId}`);
      
      // Update database based on action
      switch(action) {
        case 'call-next':
          await handleCallNext(data);
          break;
        case 'complete':
          await handleComplete(data);
          break;
        case 'skip':
          await handleSkip(data);
          break;
        case 'pause-counter':
          await handlePauseCounter(data);
          break;
      }
      
      // Broadcast instant update to ALL clients in branch
      const queueStatus = await getQueueStatus(data.branchId);
      io.to(`branch-${data.branchId}`).emit('queue-update', queueStatus);
      
      // Send turn alert if applicable
      if (action === 'call-next') {
        io.to(`branch-${data.branchId}`).emit('turn-alert', {
          token: data.token,
          counter: data.counterNumber,
          message: `Your turn is next at Counter ${data.counterNumber}`
        });
      }
    });
    
    // Heartbeat to keep connection alive
    socket.on('heartbeat', () => {
      socket.emit('heartbeat-ack', { timestamp: Date.now() });
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
      activeConnections.delete(socket.id);
    });
  });
  
  // Send queue status every 5 seconds for accuracy
  setInterval(async () => {
    const branches = await Branch.find({ isActive: true });
    for (const branch of branches) {
      const status = await getQueueStatus(branch.branchId);
      io.to(`branch-${branch.branchId}`).emit('queue-update', status);
    }
  }, 5000);
};

async function sendQueueStatus(io, branchId) {
  const status = await getQueueStatus(branchId);
  io.to(`branch-${branchId}`).emit('queue-update', status);
}

async function getQueueStatus(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const waiting = await BranchToken.find({ 
    branchId, 
    status: 'waiting',
    date: { $gte: today }
  }).sort({ isPriority: -1, position: 1 });
  
  const serving = await BranchToken.findOne({ branchId, status: 'serving' });
  const branch = await Branch.findOne({ branchId });
  
  const waitingCount = waiting.length;
  const averageServiceTime = branch?.averageWaitTime || 3;
  const estimatedWaitTime = waitingCount * averageServiceTime;
  const isTurnNear = waitingCount <= 2;
  
  // Calculate progress based on completed vs total
  const completed = await BranchToken.countDocuments({ 
    branchId, 
    status: 'completed', 
    date: { $gte: today } 
  });
  const total = await BranchToken.countDocuments({ branchId, date: { $gte: today } });
  const progress = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    branchId,
    waitingCount,
    waitingList: waiting.map(t => ({
      tokenNumber: t.tokenNumber,
      customerName: t.customerName,
      position: t.position,
      estimatedWait: t.estimatedWaitTime,
      isPriority: t.isPriority
    })),
    currentServing: serving?.tokenNumber || null,
    nowServing: serving?.tokenNumber || 'None',
    peopleAhead: waitingCount,
    estimatedWait: `${estimatedWaitTime}-${estimatedWaitTime + 10} min`,
    isTurnNear,
    progress: Math.min(progress, 100),
    averageServiceTime,
    branchUtilization: branch ? (waitingCount / branch.capacity) * 100 : 0
  };
}

async function handleCallNext(data) {
  await BranchToken.findOneAndUpdate(
    { branchId: data.branchId, status: 'waiting' },
    { 
      status: 'serving', 
      servedBy: data.staffId,
      counterNumber: data.counterNumber
    },
    { sort: { isPriority: -1, position: 1 } }
  );
}

async function handleComplete(data) {
  const token = await BranchToken.findOneAndUpdate(
    { tokenNumber: data.token, branchId: data.branchId },
    { status: 'completed', servedAt: new Date() },
    { new: true }
  );
  
  if (token && token.actualWaitTime) {
    // Update average wait time for branch
    const branch = await Branch.findOne({ branchId: data.branchId });
    const newAvg = (branch.averageWaitTime + token.actualWaitTime) / 2;
    await Branch.updateOne({ branchId: data.branchId }, { averageWaitTime: newAvg });
  }
}

async function handleSkip(data) {
  await BranchToken.findOneAndUpdate(
    { tokenNumber: data.token, branchId: data.branchId },
    { status: 'skipped' }
  );
}

async function handlePauseCounter(data) {
  await Branch.updateOne(
    { branchId: data.branchId, 'counters.counterNumber': data.counterNumber },
    { $set: { 'counters.$.isActive': false } }
  );
}

module.exports = socketHandler;