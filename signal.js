const ws = require('ws')

const log = console.log


class SignalEventHandler {
  constructor(signalServer) {
    this.signalServer = signalServer
  }
  join(client, message) {
    // join event is only for userInfo storage
    // id is store right after wsServer.on('connection') 
    const userInfo = {
      nick: message.payload.nick,
      id: client.userInfo.id,
      roomId: message.payload.roomId,
    }
    // set userInfo
    client.userInfo = userInfo
    log(`${userInfo.id}  ${userInfo.nick} joined`)
    // or response with room info?
    const roomUsers = this.signalServer.getRoomUserList(userInfo.roomId, client)
    client.send(JSON.stringify({
      type: 'roomInfo',
      payload: {
        // 告诉用户自己的id
        userInfo: userInfo,
        users: roomUsers,
      }
    }))
  }
  offer(client, message) {

    // broadcast to all clients except the sender(client)
    this.signalServer.sendTo(message.receiverId, {
      ...message,
      // attach sender userInfo
      userInfo: client.userInfo,
    })
    log(`${client.userInfo.nick} incoming offer`)
  }
  leave(client) {
    if (client.userInfo.roomId && client.userInfo.nick) {
      // already joined a room
      log(`${client.userInfo.nick} left`)
      // roomId is stored in userInfo
      this.signalServer.broadcast(client.userInfo, {
        type: 'leave',
        payload: client.userInfo,
      })
    }

  }
  answer(client, message) {
    // data must contain the receiverId
    // client: the offer replier
    this.signalServer.sendTo(message.receiverId, {
      ...message,
      // attach sender userInfo
      userInfo: client.userInfo,
    })
    /*
    {
      type: 'answer',
      data: {sdp, type},
      receiverId: 'xxx',
      userInfo: {id, nick},
    }
    */
    log(`${client.userInfo.nick} incoming answer(reply offer)`)
  }
  renegotation(client, message) {
    this.signalServer.sendTo(message.receiverId, {
      ...message,
      // attach sender userInfo
      userInfo: client.userInfo,
    })
    log(`${client.userInfo.nick} incoming offer`)
  }
  icecandidate(client, message) {
    log(message)
    this.signalServer.sendTo(message.receiverId, {
      ...message,
      // attach sender userInfo
      userInfo: client.userInfo,
    })
    log(`${client.userInfo.nick} incoming icecandidate`)
  }
  pong(client, message) {
    client.isAlive = true
  }
  handle(client, message) {
    try {
      message = JSON.parse(message)
      if (message.type === 'ping') return
      // {type, receiverId, payload}
      this[message.type](client, message)
    } catch (err) {
      log(err)
    }
  }
}

class SignalServer {
  constructor() {
    const wsServer = this.wsServer = new ws.WebSocketServer(...arguments)

    wsServer.on('connection', (ws, req) => {

      // keepAlive(ws)

      // store userInfo
      ws.userInfo = { id: req.headers['sec-websocket-key'] }
      // log('client connected', req.headers['sec-websocket-key'])
      const signalEventHandler = new SignalEventHandler(this)
      ws.on('message', function (message) {
        signalEventHandler.handle(ws, message)
      })
      // leave event on connection
      ws.on('close', function () {
        signalEventHandler.leave(ws)
      })
    })
  }
  on() {
    this.wsServer.on(...arguments)
  }

  broadcast(senderInfo, data) {
    this.wsServer.clients.forEach((client) => {
      if (senderInfo.roomId === client.userInfo.roomId
        && senderInfo.id !== client.userInfo.id) {
        client.send(JSON.stringify({
          ...data,
          senderId: senderInfo.id
        }))
      }
    })
  }
  sendTo(receiverId, data) {
    this.wsServer.clients.forEach(client => {
      log(client.userInfo.id, receiverId)
      if (client.userInfo.id === receiverId) {
        client.send(JSON.stringify(data))
      }
    })
  }
  getRoomUserList(roomId, client) {
    return Array.from(this.wsServer.clients)
      .map(client => client.userInfo)
      .filter(userInfo => roomId === userInfo.roomId)
      .filter(userInfo => userInfo.id !== client.userInfo.id)
  }
}
// const srv = SignalServer({ port: 666 })

module.exports = SignalServer