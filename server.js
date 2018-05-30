var server = require('http').createServer()
var io = require('socket.io')(server)

server.listen(3000, function () {
  console.log('server starting...')
})

// 玩家在线总数
playerCount = 0
// 已开启的棋局数
gameCount = 0
// 玩家在线集合
players = []

// 玩家
function Player(socket, name) {
  this.socket = socket  // socket对象,玩家通过它来监听数据
  this.name = name  // 玩家的名称
  this.color = null // 玩家棋子的颜色
  this.state = 0  // 0代表空闲, 1在游戏中
  this.pipei = false  // 是否在匹配
  this.gamePlay = null // 棋局对象
  this.flag = true  // 是否轮到这个玩家出棋
  // this.id = playerCount // 玩家在数组中的下标(之所以定义这个变量，是因为在玩家退出的时候，方便在数组中删除这个对象)

  playerCount++ // 没添加一个玩家，当前在线人数加1

  var self = this
  // 监听玩家是否退出游戏
  this.socket.on('disconnect', function () {
    // 删除数组中的玩家
    // players.splice(players.indexOf(self), 1)  // 删不掉
    // delete players[players.indexOf(self)]
    // 新的删除方式
    players = players.filter(function (value) {
      return value.name !== self.name
    })
    playerCount--
    // 如果退出游戏的玩家正在进行游戏，那么这局游戏也该退出
    if (self.state === 0) {
      gameCount--
    }

    console.log(self.name + '已退出游戏')
  })

  // 玩家开始匹配
  this.socket.on('play', function () {
    self.pipei = true
    // 如果空闲玩家总数大于或等于2，那么开始游戏
    if (playerCount >= 2) {
      // 可用的玩家数
      var player2 = null
      self.timer = setInterval(function () {
        console.log('正在匹配...')
        if (player2 = findPlayer(self)) {
          console.log('匹配成功')
          self.gamePlay = new Game(self, player2)
          clearInterval(self.timer)
        }
      }, 1000)
    } else {
      socket.emit('player less')
    }
  })

  this.socket.on('clearPlay', function () {
    clearInterval(self.timer)
  })

  // 监听数据
  this.socket.on('data', function (data) {
    if (self.gamePlay.play1.flag) {
      add_pieces(self.gamePlay, data, self.color)
    }
  })

  players.push(this)
}

// 棋局
function Game(play1, play2) {

  gameCount++

  // 棋盘的格子数
  this.column = 21
  this.arr = init_arr() // 存储棋盘坐标的二位数组

  // 一局棋局上的两个玩家
  this.play1 = play1
  this.play2 = play2

  // 随机给两个玩家分配棋子颜色
  this.play1.color = ~~(Math.random() * 2) === 0 ? 'white' : 'black'
  this.play2.color = this.play1.color === 'white' ? 'black' : 'white'

  var self = this

  // 因为在这里对player1和player2玩家进行数据监听的话，那么不管是player1还是player2在客户端触发了的data事件，
  // 这里的player1和player2的监听方法都会被调用，造成监听函数被重复执行两次的现象
  /*
  // 监听棋盘数据
  this.play1.socket.on('data', function (data) {
    add_pieces(self, self.arr, data, self.play1.color)
  })
  this.play2.socket.on('data', function (data) {
    add_pieces(self, self.arr, data, self.play2.color)
  })
  //*/

  this.play1.socket.emit('play', {'name': this.play2.name, 'color': this.play1.color})
  // this.play2.socket.emit('play', {'name': this.play1.name, 'color': this.play2.color})
}

// 监听连接
io.on('connection', function (socket) {
  // 玩家登陆
  socket.on('login', function (name) {
    var flag = players.some(function (value) {
      return value.name === name
    })
    if (flag) {
      socket.emit('home', {'flag': true})
    } else {
      console.log(name + '已登陆')
      // 创建玩家
      new Player(socket, name)
      // 将玩家放进数组中
      // players.push(player)
      socket.emit('home', {'playerCount': playerCount, 'name': name})
    }
  })

})

// 当玩家离开的时候
io.on('close', function (socket) {
  console.log('服务器关闭')
})

// 返回一个可用的玩家
function findPlayer(player1) {
  // 过滤出所有的空闲玩家，并返回成一个数组
  var availablePlayers = players.filter(function (val) {
    // 玩家空闲状态，并已经在匹配
    return val.state === 0 && val.pipei && player1 !== val
  })
  if (availablePlayers.length > 0) {
    // 从空闲玩家中随机选取一个玩家
    var index = ~~(Math.random() * availablePlayers.length)
    // 已被选取的玩家状态被重置为1
    availablePlayers[index].state = 1
    // 将选中的玩家返回出去
    return availablePlayers[index]
  }
  return null
}

// 输赢校验
function check_result(self, arr, position, color) {
  for (var i = 0; i < arr.length; i++) {
    var white = 0
    var black = 0
    for (var j = 0; j < arr[i].length; j++) {
      if (arr[i][j] === undefined) {
        white = 0
        black = 0
      } else if (arr[i][j] === 'white') {
        white++
        black = 0
      } else {
        black++
        white = 0
      }
      if (white === 5) {
        self.play1.socket.emit('result', '白棋胜了')
        self.play2.socket.emit('result', '白棋胜了')
        self.arr = init_arr()
        return
      } else if (black === 5) {
        self.play1.socket.emit('result', '黑棋胜了')
        self.play2.socket.emit('result', '黑棋胜了')
        self.arr = init_arr()
        return
      }
    }
  }

  for (var i = 0; i < arr.length; i++) {
    var white = 0
    var black = 0
    for (var j = 0; j < arr[i].length; j++) {
      if (arr[j][i] === undefined) {
        white = 0
        black = 0
      } else if (arr[j][i] === 'white') {
        white++
        black = 0
      } else {
        black++
        white = 0
      }
      if (white === 5) {
        self.play1.socket.emit('result', '白棋胜了')
        self.play2.socket.emit('result', '白棋胜了')
        self.arr = init_arr()
        return
      } else if (black === 5) {
        self.play1.socket.emit('result', '黑棋胜了')
        self.play2.socket.emit('result', '黑棋胜了')
        self.arr = init_arr()
        return
      }
    }
  }

  for (var i = 5; i < 21; i++) {
    var white = 0
    var black = 0
    for (var j = 0; i !== j; j++) {
      if (arr[j][i - j] === undefined) {
        white = 0
        black = 0
      } else if (arr[j][i - j] === 'white') {
        white++
        black = 0
      } else {
        black++
        white = 0
      }
      if (white === 5) {
        self.play1.socket.emit('result', '白棋胜了')
        self.play2.socket.emit('result', '白棋胜了')
        self.arr = init_arr()
        return
      } else if (black === 5) {
        self.play1.socket.emit('result', '黑棋胜了')
        self.play2.socket.emit('result', '黑棋胜了')
        self.arr = init_arr()
        return
      }
    }
  }

  for (var i = 1; i < 17; i++) {
    var white = 0
    var black = 0
    for (var j = 20, k = 0; j >= i; j-- , k++) {
      if (arr[i + k][j] === undefined) {
        white = 0
        black = 0
      } else if (arr[i + k][j] === 'white') {
        white++
        black = 0
      } else {
        black++
        white = 0
      }
      if (white === 5) {
        self.play1.socket.emit('result', '白棋胜了')
        self.play2.socket.emit('result', '白棋胜了')
        self.arr = init_arr()
        return
      } else if (black === 5) {
        self.play1.socket.emit('result', '黑棋胜了')
        self.play2.socket.emit('result', '黑棋胜了')
        self.arr = init_arr()
        return
      }
    }
  }

  for (var i = 16; i >= 0; i--) {
    var white = 0
    var black = 0
    for (var j = 0; j < 21 - i; j++) {
      if (arr[j][i + j] === undefined) {
        white = 0
        black = 0
      } else if (arr[j][i + j] === 'white') {
        white++
        black = 0
      } else {
        black++
        white = 0
      }
      if (white === 5) {
        self.play1.socket.emit('result', '白棋胜了')
        self.play2.socket.emit('result', '白棋胜了')
        self.arr = init_arr()
        return
      } else if (black === 5) {
        self.play1.socket.emit('result', '黑棋胜了')
        self.play2.socket.emit('result', '黑棋胜了')
        self.arr = init_arr()
        return
      }
    }
  }

  for (var i = 1; i < 21; i++) {
    var white = 0
    var black = 0
    for (var j = 0; j < 21 - i; j++) {
      if (arr[i + j][j] === undefined) {
        white = 0
        black = 0
      } else if (arr[i + j][j] === 'white') {
        white++
        black = 0
      } else {
        black++
        white = 0
      }
      if (white === 5) {
        self.play1.socket.emit('result', '白棋胜了')
        self.play2.socket.emit('result', '白棋胜了')
        self.arr = init_arr()
        return
      } else if (black === 5) {
        self.play1.socket.emit('result', '黑棋胜了')
        self.play2.socket.emit('result', '黑棋胜了')
        self.arr = init_arr()
        return
      }
    }
  }
  self.play1.socket.emit('addPieces', {'position': position, 'color': color})
  self.play2.socket.emit('addPieces', {'position': position, 'color': color})
}

// 添加棋子
function add_pieces(self, position, color) {
  console.log(self.arr[position.x][position.y])
  if (self.arr[position.x][position.y] === undefined) {
    self.arr[position.x][position.y] = color
    console.log(self.arr[position.x][position.y])
    if (color === self.play1.color) {
      self.play1.flag = false
      self.play2.flag = true
    } else if (color === self.play2.color) {
      self.play1.flag = true
      self.play2.flag = false
    }
    check_result(self, self.arr, position, color)
  }
}

// 初始化数组
function init_arr() {
  var arr = []
  for (var i = 0; i < 21; i++) {
    arr.push(new Array(21))
  }
  return arr
}
