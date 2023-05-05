const express = require('express')
const cors = require('cors')
const app = express()
const {nanoid} = require('nanoid')
const {ask, chat} = require('./openai-api.cjs')
const port = 7009
const path = require('path')
const {unmarshall} = require('@aws-sdk/util-dynamodb')
const {write_conversations, get_conversations} = require('./write-conversations.cjs')

app.use(cors())
app.use(express.static(path.join(__dirname, '../dist')))
app.use(express.json())

function prependArray(value, array) {
  let newArray = array.slice()
  newArray.unshift(value)
  return newArray
}

const instruction = `Your name is DaVinci, and you are a large language model trained by OpenAI. Your job is to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.
If the input is a question, try your best to answer it. Otherwise, provide as much information as you can.
You should use "code blocks" syntax from markdown including language name to encapsulate any part in responses that's longer-format content such as poem, code, lyrics.
Provide programming language name in code blocks if possible.
You should also use bold syntax from markdown on the relevant parts of the responses to improve readability.
If your answer contains code, make sure to provide detailed explanations.
You can understand and communicate fluently in the user's language of choice such as English,中文,日本语,Espanol,Francais or Deutsch.`

app.post('/api/share/get', (req, res) => {
  let id = req.body.id
  get_conversations({
    id
  }).then(r => {
    if (r.Item) {
      let item = unmarshall(r.Item)
      res.json({
        success: true,
        messages: item.history
      })
    } else {
      res.json({
        success: false,
        message: 'No such conversation'
      })
    }
  }).catch(err => {
    res.json({
      success: false,
      message: 'Failed to get conversation'
    })
  })
});

app.post('/api/ask', function (req, res) {
  res.set('Content-Type', 'application/octet-stream')
  res.set('Transfer-Encoding', 'chunked')

  let composedHistory = ''
  let history = req.body.history || ''
  let message = req.body.message
  let token = req.body.token || ''
  let userPool = req.body.userPool || ''

  history.forEach(el => {
    composedHistory += `${el.sender}: ${el.text}\n`
  })

  if (!message) {
    res.write(Buffer.from('The message should not be empty 🥲'))
    res.end()

    return false
  }

  let loginType = 'password'

  if (token.split('_')[0] === 'key') {
    loginType = 'key'
  }

  ask(
    'davinci',
    {
      prompt: instruction + `
Here is a conversation between a human and you:

${composedHistory}
Human: ${message}
AI: `,
      temperature: 0.5,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      stream: true,
      key: loginType === 'key' ? token.split('_')[1] : false
    },
    function (text, cost, err) {
      if (text) {
        res.write(Buffer.from(text))
      }
      if (cost) {
        res.end()
        return false
      }
      if (err) {
        console.log(err)
        if (err.response && err.response.status === 429) {
          res.status(429)
        } else {
          res.status(500)
        }
        res.end()
        return false
      }
    }
  )
})

app.post('/api/tool/:model', function (req, res) {
  res.set('Content-Type', 'application/octet-stream')
  res.set('Transfer-Encoding', 'chunked')

  let composedHistory = []
  let history = req.body.history || ''
  let message = req.body.message
  let token = req.body.token || ''
  let userPool = req.body.userPool || ''
  let userInstruction = req.body.instructions || ''

  let model = req.params.model || ''

  if(!model) {
    res.status(404).end()
    return false
  }

  history.forEach(el => {
    composedHistory.push({
      role: el.sender === 'Human' ? 'user' : 'assistant',
      content: el.text
    })
  })

  if (!message) {
    res.write(Buffer.from('The message should not be empty 🥲'))
    res.end()

    return false
  }

  let loginType = 'password'

  if (token.split('_')[0] === 'key') {
    loginType = 'key'
  }

  if (userInstruction) {
    composedHistory = prependArray({
      role: 'system',
      content: userInstruction
    }, composedHistory)
  }

  chat(
    model,
    {
      messages: [
        ...composedHistory,
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.6,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      stream: true,
      key: loginType === 'key' ? token.split('_')[1] : false
    },
    function (text, cost, err) {

      if (text) {
        res.write(Buffer.from(text))
      }

      if (cost) {
        res.end()
        return false
      }

      if (err) {
        console.log(err)
        if (err.response && err.response.status === 429) {
          res.status(429)
        } else {
          res.status(500)
        }
        res.end()
        return false
      }
    }
  )
})

app.listen(port, () => {
  console.log(`DaVinci is now listening on port ${port}`)
})
