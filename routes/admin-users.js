let express = require('express');
let router = express.Router();
let fs = require('fs');

const usersModule = require("../usersClass");
const users = new usersModule();

let currentUser = '';
let currentUserAccess = '';

const CAN_READ_USERS = 128;
const CAN_WRITE_USERS = 64;

// /admin/users route
router.get('/', async (req, res) => {
    // Проверка на наличие пользователя в res.locals
    if (res.locals.username) {
        currentUser = res.locals.username;
    } else {
        throw new Error('res.locals.username');
    }
    let user = await users.getUserByLogin(currentUser);
    currentUserAccess = user[0].access;

    if (currentUserAccess & CAN_READ_USERS) { // проверка доступа | CAN_READ_USERS = 128
        let links = users.createLinksFromAccess(currentUserAccess); // получаем доступные страницы
        users.getUsers().then((users) => {
            res.render('users', {users: users, login: currentUser, access: currentUserAccess, links: links})
        });
    } else res.sendStatus(403);
});
    /* route создание нового пользователя */
router.post('/create', async (req, res) => {
    if (currentUserAccess & CAN_WRITE_USERS) { // проверка доступа | CAN_WRITE_USERS = 64
        if (req.body.login || req.body.password) {
            const login = req.body.login.toString().slice(0, 40);
            const pass = req.body.password.toString().slice(0, 40);
            let a = await users.createUser(login, pass);
            writeLog(`POST /users/create Created new user, Login: ${login}, status: ${a}; Username: ${currentUser} ip: ${req.ip}`)
            res.redirect('/admin/users');
        } else res.send("Error");
    } else res.sendStatus(403);
});
    /* route смены пароля */
router.post('/change-pass', async (req, res) => {
    if (currentUserAccess & CAN_WRITE_USERS) {
        if (req.body.newPass1) {
            if ((req.body.newPass1 === req.body.newPass2) && req.body.ID) { // сверка паролей и последующее обновление
                if (req.body.ID !== '1' || currentUser === 'admin') {
                    const newPass1 = req.body.newPass1.toString().slice(0, 40);
                    await users.changePassword(req.body.ID, newPass1);
                    writeLog(`POST /users/change-pass Password changed for id: ${req.body.ID}; Username: ${currentUser} ip: ${req.ip}`)
                    res.redirect('/admin/users');
                } else res.send("Access denied");
            } else res.send("Error");
        } else res.send("Error");
    } else res.sendStatus(403);
});
    /* route удаления пользователя */
router.post('/delete-user', async (req, res) => {
    if (currentUserAccess & CAN_WRITE_USERS) {
        if (req.body.ID) {
            let username = await users.getUserById(req.body.ID);
            if (username[0].login !== 'admin') {
                await users.deleteUser(req.body.ID);
                writeLog(`POST /users/delete-user User '${username[0].login}'(id: ${req.body.ID}) deleted by: ${currentUser} ip: ${req.ip}`)
                res.redirect('/admin/users');
            } else res.send("Error");
        } else res.send("Error");
    } else res.sendStatus(403);
});
    /* route изменения доступов */
router.post('/change-access', async (req, res) => {
    await checkAccess(currentUserAccess, currentUser);
    if (currentUserAccess & CAN_WRITE_USERS) {
        if (req.body.ID) {
            let username = await users.getUserById(req.body.ID);
            if (username[0].login !== 'admin') {
                let access = 0;
                if (req.body.access0) access+=1;
                if (req.body.access1) access+=2;
                if (req.body.access2) access+=4;
                if (req.body.access3) access+=8;
                if (req.body.access4) access+=16;
                if (req.body.access5) access+=32;
                if (req.body.access6) access+=64;
                if (req.body.access7) access+=128;
                await users.changeUserAccess(access, req.body.ID);
                writeLog(`POST /users/change-access User '${username[0].login}'(id: ${req.body.ID}) changed by: ${currentUser} ip: ${req.ip}`)
                res.redirect('/admin/users');
            } else res.send("Error");
        } else res.send("Error");
    } else res.sendStatus(403);
});
    /* функция записи в логи */
function writeLog(str, path = 'logs/users.txt') {
    let date = new Date;
    fs.appendFile(path,`${str} | ${date.toLocaleString('en-GB')}\n`,'utf8',(err) => {
        if (err) throw err;
    });
}
    /* проверка наличия переменных и запись ошибок в logs/strange-errors.txt*/
async function checkAccess(userAccess, userName) {
    if (userAccess === '') {
        if (userName === ''){
            console.error('Missed current user | check logs logs/strange-errors.txt');
            writeLog('Missed current user', 'logs/strange-errors.txt');
        } else {
            let user = await users.getUserByLogin(userName);
            userAccess = user[0].access;
            return userAccess;
        }
    } else {
        if (userAccess < 256 && userAccess >= 0) {
            return userAccess;
        } else {
            console.error('Invalid access | check logs logs/strange-errors.txt');
            writeLog('Invalid access', 'logs/strange-errors.txt');
        }
    }
}
module.exports = router;