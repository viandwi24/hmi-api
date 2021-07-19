const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser');
const app = express()
const port = process.env.PORT || 8000

// db
const pgOptions = {};
const pg = require('pg-promise')(pgOptions);
const db = pg('postgres://postgres:123456@188.166.222.247:5432/postgres');

// middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))
app.use(bodyParser.json());

// funcs
const apiResponse = (status, data = [], message = 'success') => {
  return { status, message, data }
}

// routes
app.get('/tags', async (req, res) => {
  try {
    const data = await db.any('SELECT t.id as "id", t.name as "name", t.tipedata as "tipedata", d.value as "value" FROM tags AS t INNER JOIN data AS d ON t.id=d.tag_id')
    return res.json(apiResponse(true, data, 'getting data success.'))
  } catch (error) {
    return res.json(error)
  }
})
app.put('/tags', async (req, res) => {
  try {
    const data = req.body

    // find
    let tag
    try {
      tag = await db.oneOrNone('SELECT * FROM tags INNER JOIN data ON tags.id=data.tag_id WHERE name = $1', [data.name], e => e)
    } catch (error) {
      return res.json(apiResponse(false, { data }, 'getting tag error.'))
    }

    if (tag.value !== data.value) {
      let updated
      try {
        let value = data.value
        if (typeof value === 'boolean') {
          value = (value === true) ? 1 : 0
        }
        updated = await db.oneOrNone('UPDATE data SET value = $1 WHERE tag_id = $2', [value, tag.id], e => e)
      } catch (error) {
        return res.json(apiResponse(false, { data, tag }, 'updating data error.'))
      }
      return res.json(apiResponse(true, { data, tag }, 'set data success.'))
    }

    return res.json(apiResponse(true, { data, tag }, 'nothing change.'))
  } catch (error) {
    console.log(error)
    return res.json(error)
  }
})

app.listen(port, () => {
  console.log(`Server running on :${port}`)
})