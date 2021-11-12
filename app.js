const express = require('express')
const moment = require('moment')
const cors = require('cors')
const bodyParser = require('body-parser');
const app = express()
const port = process.env.PORT || 8000
const logger = require('./lib/log')
const excel = require('./lib/excel.js')

// helper
const { now } = require('./lib/helper')

// db
const dbOptions = {
  host: '167.71.200.193',
  user: 'postgres',
  port: 5432,
  password: '123456',
  db: 'postgres',
}
const dbQuery = `postgres://${dbOptions.user}:${dbOptions.password}@${dbOptions.host}:${dbOptions.port}/${dbOptions.db}`;
const pgOptions = {};
const pg = require('pg-promise')(pgOptions);
const db = pg(dbQuery);

// middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))
app.use(bodyParser.json());
app.use(logger)
app.use( express.urlencoded({extended: true}) )
app.use(express.json())

// funcs
const apiResponse = (status, data = [], message = 'success', params = {}) => {
  return Object.assign({ status, message, data }, params)
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
    const tags = await db.any(`
      SELECT
        t.id as "id", t.name as "name", t.tipedata as "tipedata", t.device_id as "device_id", d.value as "value"
      FROM 
        tags AS t 
      INNER JOIN 
        data AS d 
          ON t.id=d.tag_id
    `)
    const devices = await db.any('SELECT * FROM devices')
    const data = {
      tags,
      devices
    }
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
        console.log(`[Command] Sending Command to component ${tag.id} with value ${value}`)
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
app.get('/reports-label', async (req, res) => {
  try {
    const data = await db.any("SELECT * FROM manual_labels");
    return res.json(apiResponse(true, data, 'getting data success.'));
  } catch (error) {
    console.error(error);
    return res.json(error);
  }
})
app.get('/reports', async (req, res) => {
  let date = req.query.date || undefined
  let month = (req.query.month * 1) || undefined
  let year = (req.query.year*1) || undefined
  try {
    let filtered = ``
    if (date) {
      const filterDate = moment(date).set({hour:0,minute:0,second:0,millisecond:0})
      filtered = `WHERE "reportDate" > '${filterDate.format("YYYY-MM-DD HH:mm:ss")}' AND "reportDate" < '${filterDate.add('days', 1).format("YYYY-MM-DD HH:mm:ss")}'`
    } else if (month && year) {
      const startMonth = moment().set({year: year, month: (month - 1), date: 1, hour:0,minute:0,second:0,millisecond:0});
      const lastDay = moment().set({year: year, month: (month ), date: 1, hour:0,minute:0,second:0,millisecond:0}).subtract(1, 'second')
      console.log(startMonth.format("YYYY-MM-DD HH:mm:ss"), lastDay.format("YYYY-MM-DD HH:mm:ss"))
      filtered = `WHERE "reportDate" > '${startMonth.format("YYYY-MM-DD HH:mm:ss")}' AND "reportDate" < '${lastDay.format("YYYY-MM-DD HH:mm:ss")}'`
    }
    const query = `
      SELECT
        "id", CAST("reportDate" AS DATE) as "reportDate", "label_id", "name" as "label_name", "tipe", "value"
      FROM
        manual m JOIN manual_labels ml ON m.label_id=ml.id
      ${filtered}
    `
    const data = await db.any(query);
    return res.json(apiResponse(true, data, 'getting data success.', { query }));
  } catch (error) {
    console.error(error);
    return res.json(error);
  }
});

app.get('/download', async (req, res) => {
  let tipe = req.query.tipe || undefined
  let month = (req.query.month * 1) || undefined
  let year = (req.query.year * 1) || undefined
  try {
    let filtered = ``
    if (month && year) {
      const startMonth = moment().set({year: year, month: (month - 1), date: 1, hour:0,minute:0,second:0,millisecond:0});
      const lastDay = moment().set({year: year, month: (month ), date: 1, hour:0,minute:0,second:0,millisecond:0}).subtract(1, 'second')
      console.log(startMonth.format("YYYY-MM-DD HH:mm:ss"), lastDay.format("YYYY-MM-DD HH:mm:ss"))
      filtered = `WHERE "reportDate" > '${startMonth.format("YYYY-MM-DD HH:mm:ss")}' AND "reportDate" < '${lastDay.format("YYYY-MM-DD HH:mm:ss")}'`
    }
    const query = `
      SELECT
        "id", CAST("reportDate" AS DATE) as "reportDate", "label_id", "name" as "label_name", "tipe", "value"
      FROM
        manual m JOIN manual_labels ml ON m.label_id=ml.id
      ${filtered}

      ORDER BY CAST("reportDate" AS DATE)
    `
    const data = await db.any(query);
    if( tipe == 'inlet' ) {
      let option = {
        title: `1. Data Inlet (${(month)}${year.toString().substr(-2)})`,
        data,
        month,
        year
      };
      var resultExcel = await excel.inlet(option);
      res.attachment(option.title + '.xlsx');
      res.send(resultExcel);
    } else if( tipe == 'outlet' ) {
      let option = {
        title: `2. Data Outlet (${(month)}${year.toString().substr(-2)})`,
        data,
        month,
        year
      };
      var resultExcel = await excel.outlet(option);
      res.attachment(option.title + '.xlsx');
      res.send(resultExcel);
    } else if( tipe == 'bpa' ) {
      let option = {
        title: `3. BPA Kinerja IPAL (${(month)}${year.toString().substr(-2)})`,
        data,
        month,
        year
      };
      var resultExcel = await excel.bpa(option);
      res.attachment(option.title + '.xlsx');
      res.send(resultExcel);
    } else {
      return res.json({
        tipe: 'unknown'
      });
    }
  } catch (error) {
    console.error(error);
    return res.json(error);
  }
});
// app.get('/reports', function(){});
// const newData = [2, 20.0, 0];
// const created = await db.oneOrNone(`INSERT INTO manual ("updatedAt", "label_id", "value", "reportDate", "tipe") VALUES (NOW(), $1, $2, NOW(), $3)`, newData, e => e);

// 
app.listen(port, () => {
  console.log(`Server running on :${port}`);
});