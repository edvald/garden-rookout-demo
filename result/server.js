const express = require('express')
const path = require("path")
const pg = require("pg")
const methodOverride = require('method-override')

const rookoutToken = process.env.ROOKOUT_TOKEN
const port = process.env.PORT || 8080

let _client

let cachedVotes = JSON.stringify({});

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

async function startLoop(io) {
  while (true) {
    try {
      await emitScores(io)
    } catch (err) {
      console.error("Error performing query: " + err)
    }
    await sleep(3000)
  }
}

async function emitScores(io) {
  const client = await getDb()
  const result = await client.query('SELECT vote, COUNT(id) AS count FROM votes GROUP BY vote', [])
  const votes = JSON.stringify(collectVotesFromResult(result))
  if (votes !== cachedVotes) {
    console.log("Got updated vote results", votes)
    cachedVotes = votes
  }
  io.emit("scores", votes)
}

function collectVotesFromResult(result) {
  const votes = { a: 0, b: 0 }

  result.rows.forEach(function (row) {
    votes[row.vote] = parseInt(row.count)
  })

  return votes
}

function getApp() {
  const app = express()
  const server = require('http').Server(app)

  app.use(methodOverride('X-HTTP-Method-Override'))
  app.use(function (_, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS")
    next()
  })

  app.use(express.static('views'))

  app.get('/', function (_, res) {
    res.sendFile(path.resolve(__dirname + '/views/index.html'))
  })

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

  return { app, io, server }
}

module.exports = {
  getApp,
  emitScores,
}

/**
 * MAIN APP
 */
if (require.main === module) {
  /* Set up Rookout for debugging */
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

  const { server, io } = getApp()

  /* Start the db polling loop */
  startLoop(io)

  /* Start the server */
  server.listen(port, function () {
    const port = server.address().port
    console.log('App running on port ' + port)
  })
}
