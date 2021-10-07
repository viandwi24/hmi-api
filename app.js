const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser');
const app = express()
const port = process.env.PORT || 8000
const logger = require('./lib/log')

// db
const dbOptions = {
  host: '167.71.200.193',
  user: 'postgres',
  port: 5432,
  password: '123456',
  db: 'postgres',
}
const pgOptions = {};
const pg = require('pg-promise')(pgOptions);
const db = pg(`postgres://${dbOptions.user}:${dbOptions.password}@${dbOptions.host}:${dbOptions.port}/${dbOptions.db}`);

// middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))
app.use(bodyParser.json());
app.use(logger)

// funcs
const apiResponse = (status, data = [], message = 'success') => {
  return { status, message, data }
}

// routes
app.get('/test', async (req, res) => {
  const id = 54
  const value = 0
  // return res.json({ id, value })
  const a = await db.any('UPDATE data SET value = 0', [value, id], e => e)
  // const a = await db.any('UPDATE data SET value = $1 WHERE tag_id IN (55, 59, 66, 62, 67)', [value, id], e => e)
  // const a = await db.any('SELECT * FROM data')
  return res.json(a)
})

// TAGS
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
      tag = await db.oneOrNone('SELECT * FROM tags WHERE name = $1', [data.name], e => e)
    } catch (error) {
      return res.json(apiResponse(false, { data }, 'getting tag error.'))
    }
    // return console.log(tag)

    if (tag) {
      let updated
      try {
        let value = data.value
        if (typeof value === 'boolean') {
          value = (value === true) ? 1 : 0
        }
        // INSERT INTO table_name(column1, column2, …) VALUES (value1, value2, …);
        // updated = await db.oneOrNone('UPDATE data SET value = $1 WHERE tag_id = $2', [value, tag.id], e => e)
        updated = await db.oneOrNone('INSERT INTO controls(tag_id, value, last_update, acknowledge) VALUES ($1, $2, null, false)', [tag.id, value], e => e)
        console.log(`[Command] Sending Command component ${tag.id} with value ${value}`)
      } catch (error) {
        return res.json(apiResponse(false, { data, tag }, 'updating data error.'))
      }
      return res.json(apiResponse(true, { data, tag }, 'set data success.'))
    }

    return res.json(apiResponse(true, { data, tag }, 'nothing change.'))
  } catch (error) {
    return res.json(apiResponse(true, { data, tag, error }, 'cannt change.'))
  }
})

// REPORTS
app.get('/reports', async (req, res) => {
  try {
    const data = await db.any('SELECT * FROM controls')
    return res.json(apiResponse(true, data, 'getting data success.'))
  } catch (error) {
    return res.json(error)
  }
})

app.listen(port, () => {
  console.log(`Server running on :${port}`)
})