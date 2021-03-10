const axios = require('axios')
const { expect } = require('chai')
const { getApp, emitScores } = require('../server')
const ioClient = require('socket.io-client')

describe('GET /', () => {
  it('should respond with 200', async () => {
    const result = await axios.get('http://result/', {})
    expect(result.status).to.eql(200)
  })
})

describe('socket.io server', () => {
  it('increment vote counter after vote is processed', (done) => {
    const socket = ioClient('http://result', { transports: ['polling'] })

    let initialScores

    socket.on('connect', () => {
      // Make sure we get a first sample of the scores
      const { io } = getApp()
      emitScores(io).catch(done)
    })

    socket.on('scores', (scoresJson) => {
      const scores = JSON.parse(scoresJson)

      if (!initialScores) {
        initialScores = scores

        // Got the first sample of scores, submit one vote and wait for it to increment
        const headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Access-Control-Allow-Origin': '*',
        }
        axios.post('http://vote/api/vote', `vote=b`, { headers })

      } else if (scores.b > initialScores.b) {
        // Vote incremented, all set!
        socket.disconnect()
        done()
      }
    })

    socket.on('error', done)
  }).timeout(10000)
})
