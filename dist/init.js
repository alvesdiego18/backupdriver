require('dotenv').config()
const mysqldump = require('mysqldump')
const fs = require('fs')
const moment = require('moment')
const sendFile = require('./file')

async function init() {

    /** delete old items */
    await deleteOldFiles()

    /** Format file name */
    const fileName = `${process.env.BACKUP_DRIVE_DATABASE}_backup_${moment().format('YYYY-MM-DD_HH_mm-ss')}.sql`
    const folderfileName = `./backup/${fileName}`

    /** Confi the access database */
    const config = {
        connection: {
            host: process.env.BACKUP_DRIVE_HOST,
            user: process.env.BACKUP_DRIVE_USER,
            password: process.env.BACKUP_DRIVE_PASSWORD,
            database: process.env.BACKUP_DRIVE_DATABASE,
        },
        dumpToFile: folderfileName,
    }

    /** backup */
    await mysqldump(config);

    /** send file to google drive */
    sendFile.send(fileName, folderfileName, (data) => {

        setTimeout(async () => {
            await fs.renameSync(folderfileName, `./backup/${data}.sql`)
        }, 2000);

        fs.appendFileSync('./backup/db.json', `${data}\n`, (err) => {
            if (err) throw err;
        });
    })
}

async function deleteOldFiles() {

    if (fs.existsSync('./backup/db.json')) {
        fs.readFile('./backup/db.json', 'utf8', function readFileCallback(err, data) {
            if (err) {
                console.log(err);
            } else {

                const list = data.split('\n')
                const keepFiles = process.env.BACKUP_DRIVE_KEEP_FILES ? process.env.BACKUP_DRIVE_KEEP_FILES : 2

                if (list.length > Number(keepFiles)) {
                    sendFile.delete(list[0], async (data) => {

                        let newList = ''
                        let index = 0
                        for (const fileDelete of list) {

                            if (fileDelete === '')
                                continue

                            if (index === 0) {

                                if (await fs.existsSync(`./backup/${fileDelete}.sql`))
                                    await fs.unlinkSync(`./backup/${fileDelete}.sql`)

                                index++
                                continue
                            }

                            newList += `${fileDelete}\n`
                            index++
                        }

                        await fs.writeFileSync('./backup/db.json', newList)
                    })
                }
            }
        });
    }
}

module.exports = init