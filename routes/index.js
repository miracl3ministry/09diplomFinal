let express = require('express');
let fs = require('fs');
let router = express.Router();

const usersModule = require("../usersClass");
const users = new usersModule();

users.firstLaunch();

/* GET home page. */
router.get('/', async (req, res, next) => {
    if (req.cookies.UUID) {
        let bool = await users.compareUuid(req.cookies.UUID);
        if (bool) res.redirect('/admin');
        else res.render('index', {error: false });
    } else res.render('index', {error: false });
});

router.post('/login', async (req, res) => {
    if (req.body.login || req.body.password) {
        const login = req.body.login.toString().slice(0, 40);
        const pass = req.body.password.toString().slice(0, 40);
        const uuid = await users.checkPassword(login, pass);
        if (uuid) {
            res.header({"Set-Cookie": `UUID=${uuid}; path=/; Max-Age=2592000; Secure`})
            res.redirect('/admin')
            writeLog(`POST /login 200 Login to system ${req.ip}. Login: "${req.body.login}"`);
        } else {
            res.render('index', {title: 'HRM', error: 'Данные не совпадают'});
            writeLog(`POST /login 200 Access denied ${req.ip}. Login: "${req.body.login}"`);
        }
    } else {
        writeLog(`POST /login 400 Invalid login/password ${req.ip}`);
        res.sendStatus(400);
    }
})

function writeLog(str) {
    let date = new Date;
    fs.appendFile('logs/login.txt',`${str} | ${date.toLocaleString('en-GB')}\n`,'utf8',(err) => {
        if (err) throw err;
    });
}

module.exports = router;
