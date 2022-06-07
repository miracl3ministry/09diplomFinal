const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const busboy = require('busboy');
const {randomFillSync} = require('crypto');

const employeesModule = require("../employeesClass");
const employees = new employeesModule();

const usersModule = require("../usersClass");
const users = new usersModule();

const excelModule = require("../excelClass");
const xlsx = new excelModule();

const CAN_READ = 32;
const CAN_WRITE = 16;

let currentUser, currentUserAccess, currentUserId;
let subdivisionDatalist = [], positionDatalist = [];

router.get('/', async (req, res) => {
    // Проверка на наличие пользователя в res.locals
    if (res.locals.username) {
        currentUser = res.locals.username;
    } else {
        throw new Error('res.locals.username');
    }
    let user = await users.getUserByLogin(currentUser);
    currentUserAccess = user[0].access;
    currentUserId = user[0].ID;
    if (currentUserAccess & CAN_READ) { // проверка доступа | CAN_READ = 32
        let links = users.createLinksFromAccess(currentUserAccess); // получаем доступные страницы
        employees.getEmployees().then((employees) => {
            // создаем массивы не повторяющихся positions и subdivision
            let subdivisions = [], positions = [];
            employees.forEach((e) => {
                subdivisions.push(e.subdivision);
                positions.push(e.position);
            })
            subdivisions.sort();
            positions.sort();
            subdivisionDatalist = [];
            positionDatalist = [];
            for (let i = 1; i <= employees.length; i++) {
                if (subdivisions[i - 1] !== subdivisions[i]) subdivisionDatalist.push(subdivisions[i - 1])
                if (positions[i - 1] !== positions[i]) positionDatalist.push(positions[i - 1])
            }

            res.render('employees', {
                employees: employees, login: currentUser, access: currentUserAccess, links: links,
                subdivisionDatalist: subdivisionDatalist, positionDatalist: positionDatalist
            })
        })
    } else res.sendStatus(403);
});

router.post('/add', async (req, res) => {
    if (currentUserAccess & CAN_WRITE) { // проверка доступа | CAN_WRITE = 16
        if (req.body.fio) {
            const fio = req.body.fio.toString().slice(0, 100);
            const subdivision = req.body.subdivision.toString().slice(0, 100) ?? '';
            const position = req.body.position.toString().slice(0, 100) ?? '';
            const dateOfHiring = req.body.dateOfHiring || null;
            let arr = [];
            arr.push(fio, subdivision, position, dateOfHiring);
            await employees.addEmployee(arr);
            res.redirect('/admin/employees');
        } else res.send("Error");
    } else res.sendStatus(403);
});

router.post('/update', async (req, res) => {
    if (currentUserAccess & CAN_WRITE) { // проверка доступа | CAN_WRITE = 16
        if (req.body.fio && req.body.ID) {
            const fio = req.body.fio.toString().slice(0, 100);
            const subdivision = req.body.subdivision.toString().slice(0, 100) ?? '';
            const position = req.body.position.toString().slice(0, 100) ?? '';
            const dateOfHiring = req.body.dateOfHiring || null;
            let arr = [];
            arr.push(fio, subdivision, position, dateOfHiring);
            await employees.updateEmployee(req.body.ID, arr);
            res.redirect('/admin/employees');
        } else res.send("Error");
    } else res.sendStatus(403);
});

router.post('/delete', async (req, res) => {
    if (currentUserAccess & CAN_WRITE) { // проверка доступа | CAN_WRITE = 16
        if (req.body.ID) {
            await employees.deleteEmployee(req.body.ID);
            res.redirect('/admin/employees');
        } else res.send("Error");
    } else res.sendStatus(403);
});
router.post('/upload-xls', async (req, res) => {
    if (currentUserAccess & CAN_WRITE) { // проверка доступа | CAN_WRITE = 16
        const bb = busboy({headers: req.headers, defCharset: 'utf8'});
        bb.on('file', (name, file, info) => {
            let fileName = 'upload-xlsx-' + randomFillSync(Buffer.alloc(5)).toString('hex') + '.xlsx';
            let filePath = path.resolve(__dirname, '../user-upload/xlsx/', fileName);
            file.pipe(fs.createWriteStream(filePath));
            file.on('close', () => {
                console.log(`File ${fileName} done`);
                let data = xlsx.parseXslForEmployeesTable(filePath);
                employees.addEmployees(data);
                fs.unlink(filePath, () => res.redirect('/admin/employees'));
            });
            file.on('error', (e) => {
                console.error(e);
                writeLog(`POST /employees/upload-xls busboy error \nError: ${e};`,
                    'logs/strange-errors.txt');
                res.send('Error');
            })
        });
        req.pipe(bb);
    } else res.sendStatus(403);
});

router.get('/download-xls', async (req, res) => {
    if (currentUserAccess & CAN_READ) { // проверка доступа | CAN_READ = 32
        let fileName = 'download-xlsx-' + randomFillSync(Buffer.alloc(5)).toString('hex') + '.xlsx';
        let filePath = path.resolve(__dirname, '../user-upload/xlsx/', fileName);
        let data = await employees.getEmployees();
        let formatted = [['ФИО', 'Подразделение', 'Должность', 'Дата приема']];
        data.forEach((e) => {
            formatted.push([e.fio, e.subdivision, e.position, e.dateOfHiring?.toLocaleDateString("ru")])
        })
        xlsx.write(filePath, formatted);
        res.sendFile(filePath);
        setTimeout(() => {fs.unlink(filePath, () => {})}, 1000);
    } else res.sendStatus(403);
});

router.post('/delete-some-employees', async (req, res) => {
    if (currentUserAccess & CAN_READ) { // проверка доступа | CAN_READ = 32
        if (req.body.deleteSomeEmployeesFrom && req.body.deleteSomeEmployeesTo) {
            let from = Number(req.body.deleteSomeEmployeesFrom);
            let to = Number(req.body.deleteSomeEmployeesTo);
            if (from > to) res.send("Error")
            else {
                await employees.deleteSomeEmployees(from, to);
                res.redirect('/admin/employees');
            }
        } else res.send("Error");
    } else res.sendStatus(403);
});

router.get('/search', async (req, res) => {
    if (currentUserAccess & CAN_READ) { // проверка доступа | CAN_READ = 32
        if (req.query.s) {
            let search = req.query.s.slice(0, 100);
            let links = users.createLinksFromAccess(currentUserAccess); // получаем доступные страницы
            employees.getEmployeesSearch(search).then((employees) => {
                res.render('employeesSearch', {
                    employees: employees, login: currentUser, access: currentUserAccess, links: links,
                    subdivisionDatalist: subdivisionDatalist, positionDatalist: positionDatalist, searchValue: search
                })
            })
        } else res.redirect('/admin/employees');
    } else res.sendStatus(403);
});

function writeLog(str, path = 'logs/employees.txt') {
    let date = new Date;
    fs.appendFile(path, `${str} | ${date.toLocaleString('en-GB')}\n`, 'utf8', (err) => {
        if (err) throw err;
    });
}

module.exports = router;