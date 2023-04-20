const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const { Buffer } = require('node:buffer')
const cors = require('cors')
require('dotenv').config()

const app = express()
const port = 3000

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', async (req, res) => {
    let file
    try {
        file = await fs.promises.open('./public/home.html')
        let staticFile = await file.readFile()
        let stringFile = staticFile.toString()
        stringFile = stringFile.replace('{{API_KEY}}', process.env.API_KEY)
        res.send(stringFile)
    } catch (error) {
        throw new Error()
    } finally {
        file.close()
    }
})

app.post('/weather', async (req, res) => {

    const { data } = req.body
    const weatherUrl = 'http://api.weatherapi.com/v1/current.json'
    const requests = data.map(({Latitude,Longitude}) => fetch(`${weatherUrl}?key=${process.env.WEATHER_API_KEY}&q=${Latitude},${Longitude}`))
    const results = await Promise.all(requests).then(responses => Promise.all(responses.map(r => r.json())))
    console.log(results[0].current.condition)
    const response = results.map(({current: {condition: {text, code}, gust_kph, wind_kph}}) => { 
        return {weather: text, gust_kph, wind_kph, code}
    })
    res.json({data: JSON.stringify(response)})
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })

app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`)
})

