let express = require('express');
let router = express.Router();
let fs = require('fs');

const usersModule = require("../usersClass");
const users = new usersModule();

let currentUser = '';

const CAN_READ_LOGS = 1;

// /admin/logs route
router.get('/', async (req, res) => {
    // Проверка на наличие пользователя в res.locals
    if (res.locals.username) {
        currentUser = res.locals.username;
    } else {
        throw new Error('res.locals.username');
    }
    let user = await users.getUserByLogin(currentUser);
    let currentUserAccess = user[0].access;
    if (currentUserAccess & CAN_READ_LOGS) { // проверка доступа | CAN_READ_LOGS = 1
        let links = users.createLinksFromAccess(currentUserAccess); // создает массив ссылок из байта доступов
        let logs = [];
        if (req.query.clear) {
            let name = req.query.clear.slice(0, 100);
            let files = ['logs/database-errors.txt', 'logs/errors.txt', 'logs/login.txt', 'logs/logs.txt', 'logs/strange-errors.txt', 'logs/users.txt']
            console.log(req.query, name);
            if (files.includes(name)){
                try {
                    fs.writeFileSync(name, '');
                    writeLog(`GET clear logs /logs?clear=${name} opened by: ${currentUser} ip: ${req.ip}`);
                } catch (err) {
                    console.error(err);
                    writeLog(`GET /logs?clear=${name} opened by: ${currentUser} ip: ${req.ip}\nError: ${err}\nError msg: ${err.message}`);
                }
            }
        }

        try {
            logs.push(fs.readFileSync("logs/database-errors.txt"));
            logs.push(fs.readFileSync("logs/errors.txt"));
            logs.push(fs.readFileSync("logs/login.txt"));
            logs.push(fs.readFileSync("logs/logs.txt"));
            logs.push(fs.readFileSync("logs/strange-errors.txt"));
            logs.push(fs.readFileSync("logs/users.txt"));
        } catch (err) {
            console.error(err);
            writeLog(`GET /logs opened by: ${currentUser} ip: ${req.ip}\nError: ${err}\nError msg: ${err.message}`);
        }
        res.render('logs', {login: currentUser, links: links, logs: logs});
    } else res.sendStatus(403);
});
/* функция записи в логи */
function writeLog(str, path = 'logs/logs.txt') {
    let date = new Date;
    fs.appendFile(path,`${str} | ${date.toLocaleString('en-GB')}\n`,'utf8',(err) => {
        if (err) throw err;
    });
}

module.exports = router;