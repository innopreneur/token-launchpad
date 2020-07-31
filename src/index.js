import Binance from 'binance-api-node'
import { logger } from './logger'
import axios from 'axios'
import moment from 'moment'
require('dotenv').config()
import fs from 'fs'
let dir = 'assets'
let path = `${dir}/ binance - assets.txt`

// Authenticated client, can make signed calls
const binance = Binance({
    apiKey: process.env.binance_API_KEY,
    apiSecret: process.env.binance_SECRET
})

async function startLoop() {

    while (true) {
        try {
            logger.info(`Starting next loop at ${moment(Date.now()).format('DD/MM/YYYY HH:mm:ss')} `)
            let { balances } = await binance.accountInfo()
            let newAssets = await Promise.all(balances.map(item => item.asset))
            logger.info(" -----  New Assets -------")
            logger.info(newAssets)
            let prevAssets = getAssets(newAssets)
            logger.info(" -----  Prev Assets -------")
            logger.info(prevAssets)
            if (prevAssets) {
                let assetDiff = getAssetDiff(prevAssets, newAssets)
                if (assetDiff.length) {
                    await sendMessage(`
                            xxx[Binance] NEW SYMBOL FOUND xxxx
                            ${ assetDiff}
                                `)
                    fs.writeFileSync(path, newAssets)
                } else {
                    logger.info(`No new symbol found`)
                }

            }
            await sleep(4)
        } catch (err) {
            if (!err.message.includes("failed to meet quorum")) {
                await sendMessage(`
xxxxx ERROR xxxxxx
[Launchpad]
${ err.message}
`)
            }
            console.error(err)

        }
    }

}

function getAssets(assets) {

    //check if prev asset file exists
    if (!fs.existsSync(path)) {
        //if not, make a new assets dir
        fs.mkdirSync(dir)
        // and write a new assets file
        fs.writeFileSync(path, assets)
        return null
    } else {
        //if exists, read prev assets file
        let prevAssets = fs.readFileSync(path, 'utf8')
        return prevAssets.split(',')
    }
}

async function sendMessage(message) {
    try {
        console.log(`Sending message::
${ message} `)
        let response = await axios({
            url: process.env.NIMROD_API_URL,
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            data: JSON.stringify({
                "api_key": process.env.NIMROD_API_KEY,
                "message": message
            })
        })
        if (response.status == 200) {
            return response.data
        } else {
            throw new Error(response.status)
        }

    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

function getAssetDiff(prevAssets, newAssets) {
    return newAssets.filter(a => !prevAssets.includes(a))
}


startLoop()