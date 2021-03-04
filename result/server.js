const express = require('express'),
  path = require("path"),
  pg = require("pg"),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  app = express(),
  server = require('http').Server(app)

/* Set up Rookout for debugging */
const rookoutToken = process.env.ROOKOUT_TOKEN

if (rookoutToken) {
  const rookout = require('rookout')

  rookout.start({
    token: rookoutToken,
    labels: {
      env: 'dev',
      service: 'result',
    }
  })
}

const port = process.env.PORT || 4000

// Set up socket.io connection handler
const io = require('socket.io')(server, {
  transports: ["polling"],
})

io.on('connection', (socket) => {
  socket.emit('message', { text: 'Welcome!' })

  socket.on('subscribe', function (data) {
    socket.join(data.channel)
  })
})

// Start server
app.use(cookieParser())
app.use(bodyParser())
app.use(methodOverride('X-HTTP-Method-Override'))
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS")
  next()
})

app.use(express.static('views'))

app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/views/index.html'))
})

startLoop().catch((err) => {
  console.log("Error in db polling loop: " + err.message)
})

server.listen(port, function () {
  const port = server.address().port
  console.log('App running on port ' + port)
})


let _client

async function getDb() {
  if (_client) {
    return _client
  }

  const client = new pg.Client({
    user: process.env.PGUSER,
    host: "db",
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
  })

  let retries = 0

  while (!_client) {
    try {
      await client.connect()
      console.log("Connected to db")
      _client = client
      break
    } catch (err) {
      if (retries >= 1000) {
        throw err
      } else {
        console.error("Waiting for db")
        retries += 1
        await sleep(1000)
        continue
      }
    }
  }

  return _client
}

async function sleep(msec) {
  return new Promise((resolve) => setTimeout(resolve, msec))
}

async function startLoop() {
  const client = await getDb()

  while (true) {
    try {
      const result = await client.query('SELECT vote, COUNT(id) AS count FROM votes GROUP BY vote', [])
      const votes = collectVotesFromResult(result)
      io.emit("scores", JSON.stringify(votes))
    } catch (err) {
      console.error("Error performing query: " + err)
    }
    await sleep(1000)
  }
}

function collectVotesFromResult(result) {
  const votes = { a: 0, b: 0 }

  result.rows.forEach(function (row) {
    votes[row.vote] = parseInt(row.count)
  })

  return votes
}
