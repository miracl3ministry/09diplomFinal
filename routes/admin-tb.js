const express = require('express');
const router = express.Router();
const fs = require('fs');
const busboy = require("busboy");
const {randomFillSync} = require("crypto");
const path = require("path");

const tbModule = require("../tbClass");
const tb = new tbModule();

const usersModule = require("../usersClass");
const users = new usersModule();

const excelModule = require("../excelClass");
const xlsx = new excelModule();

const employeesModule = require("../employeesClass");
const employees = new employeesModule();

const CAN_READ_TB = 8;
const CAN_WRITE_TB = 4;

let currentUser, currentUserAccess = '';

// /admin/tb route
router.get('/', async (req, res) => {
    // Проверка на наличие пользователя в res.locals
    if (res.locals.username) {
        currentUser = res.locals.username;
    } else {
        throw new Error('res.locals.username');
    }
    let user = await users.getUserByLogin(currentUser);
    currentUserAccess = user[0].access;

    if (currentUserAccess & CAN_READ_TB) { // проверка доступа | CAN_READ_TB = 8
        let links = users.createLinksFromAccess(currentUserAccess); // получаем доступные страницы
        let categories = await tb.getCategories();
        let table = await tb.getTbTable();
        res.render('tb', {login: currentUser, access: currentUserAccess, links: links, categories: categories, table: table})
    } else res.sendStatus(403);
});
// добавление категории
router.post('/add-category', async (req, res) => {
    if (currentUserAccess & CAN_WRITE_TB) { // проверка доступа | CAN_WRITE_TB = 4
        if (req.body.categoryName) {
            const name = req.body.categoryName.toString().slice(0, 100);
            let validYears = Number(req.body.categoryValidYears);
            if (validYears < 0 || validYears > 255) {
                validYears = null;
            }
            await tb.addCategory(name, validYears);
            res.redirect('/admin/tb');
        } else res.send("Error");
    } else res.sendStatus(403);
});
// удаление категории
router.post('/delete-category', async (req, res) => {
    if (currentUserAccess & CAN_WRITE_TB) { // проверка доступа | CAN_WRITE_TB = 4
        if (req.body.categoryName_delete) {
            const name = req.body.categoryName_delete.toString().slice(0, 100);
            await tb.deleteCategory(name);
            res.redirect('/admin/tb');
        } else res.send("Error");
    } else res.sendStatus(403);
});
// Добавление сведений о проверках знаний требований ОТ
router.post('/add-in-row', async (req, res) => {
    if (currentUserAccess & CAN_WRITE_TB) { // проверка доступа | CAN_WRITE_TB = 4
        if (req.body.tbCategory_add && req.body.tbValidUntil_add) {
            const employeeId = req.body.employeeId_add.toString().slice(0, 100);
            const categoryName = req.body.tbCategory_add.toString().slice(0, 100);
            const dateOfIssue = req.body.tbDateOfIssue_add.toString().slice(0, 10);
            const validUntil = req.body.tbValidUntil_add.toString().slice(0, 10);
            const group = req.body.tbGroup_add.toString().slice(0, 100);
            const scanName = req.body.tbScanName_add.toString().slice(0, 100);
            const scanHref = req.body.tbScanHref_add.toString().slice(0, 100);
            let categoryId = await tb.findCategoryByName(categoryName);
            if (categoryId[0]) {
                let categoryValidYears = categoryId[0]?.validYears ?? null;
                categoryId = categoryId[0].ID;
                if (req.body.tbId_add) { // - обновление данных
                    const tbId = req.body.tbId_add.toString().slice(0, 100);
                    await tb.updateRow(tbId,[dateOfIssue, validUntil, group, scanName, scanHref, categoryValidYears]);
                } else {
                    await tb.addRow([employeeId, categoryId, dateOfIssue, validUntil, group, scanName, scanHref]);
                }
                res.redirect('/admin/tb');
            } else res.send("Категория не найдена или не существует");
        } else res.send("Error");
    } else res.sendStatus(403);
});
// Удаление сведений о проверках знаний требований ОТ
router.post('/delete-from-row', async (req, res) => {
    if (currentUserAccess & CAN_WRITE_TB) { // проверка доступа | CAN_WRITE_TB = 4
        if (req.body.tbCategoryId_delete && req.body.tbEmployeeId_delete) {
            const employeeId = req.body.tbEmployeeId_delete.toString().slice(0, 100);
            const categoryId = req.body.tbCategoryId_delete.toString().slice(0, 100);

            let category = await tb.findCategoryById(categoryId);
            if (category[0]) {
                await tb.deleteRow(categoryId, employeeId);
                res.redirect('/admin/tb');
            } else res.send("Категория не найдена или не существует");
        } else res.send("Error");
    } else res.sendStatus(403);
});
// парсер из экселя
router.post('/upload-xls', (req, res) => {
    if (currentUserAccess & CAN_WRITE_TB) { // проверка доступа | CAN_WRITE_TB = 4
        const bb = busboy({headers: req.headers, defCharset: 'utf8'});
        bb.on('file', (name, file, info) => {
            if (info.filename) {
                let fileName = 'upload-xlsx-' + randomFillSync(Buffer.alloc(5)).toString('hex') + '.xlsx';
                let filePath = path.resolve(__dirname, '../user-upload/xlsx/', fileName);
                file.pipe(fs.createWriteStream(filePath));
                file.on('close', async () => {
                    console.log(`File ${fileName} done`);
                    // добавление сотрудников в бд
                    let employeesFromExcel = xlsx.parseXslForEmployeesTable(filePath);
                    let employeesFromDb = await employees.getEmployees();
                    let employeesFromDbArrayOfNames = [],
                        employeesNotInDb = [];
                    employeesFromDb.forEach((employee) => {
                        employeesFromDbArrayOfNames.push(employee.fio);
                    })
                    employeesFromExcel.forEach((employee) => {
                        let i = employeesFromDbArrayOfNames.indexOf(employee[0]);
                        if (i === -1) employeesNotInDb.push(employee);
                    })
                    if (employeesNotInDb.length !== 0) {// добавлем тех, кого нет в бд
                        employees.addEmployees(employeesNotInDb);

                        employeesFromDb = await employees.getEmployees();
                        employeesFromDbArrayOfNames = [];
                        employeesFromDb.forEach((employee) => {
                            employeesFromDbArrayOfNames.push(employee.fio);
                        })
                        employeesFromExcel.forEach((employee) => {
                            let i = employeesFromDbArrayOfNames.indexOf(employee[0]); // employee[0] - fio
                            // console.log('id:', employeesFromDb[i].ID); // employeesFromDb[i].ID - id
                        })
                    }

                    // ID, employee_id, category_id, issued, validUntil, group_name, scan_name, scan_href, validYears
                    let tbArr = []
                    let tbData = await xlsx.parseXslForTbTable(filePath);
                    tbData.forEach((row) => {
                        let employeeId = employeesFromDb[employeesFromDbArrayOfNames.indexOf(row.fio)].ID;
                        let categoryId = row.categoryId;
                        let issued = row.issued ?? null;
                        let validUntil = row.validUntil ?? null;
                        let group = row.group ?? null;
                        let scan = row.scan ?? null;
                        let arr = [employeeId, categoryId, issued, validUntil, group, scan];
                        tbArr.push(arr);
                    })
                    tb.addRows(tbArr);
                    fs.unlink(filePath, () => res.redirect('/admin/tb'));
                });
                file.on('error', (e) => {
                    console.error(e);
                    writeLog(`POST /tb/upload-xls busboy error \nError: ${e};`,
                        'logs/strange-errors.txt');
                    res.send('Error');
                })
            }
        });
        req.pipe(bb);
    } else res.sendStatus(403);
});
// скачать xls
router.get('/download-xls', async (req, res) => {
    if (currentUserAccess & CAN_READ_TB) { // проверка доступа | CAN_READ_TB = 8
        let fileName = 'download-xlsx-' + randomFillSync(Buffer.alloc(5)).toString('hex') + '.xlsx';
        let filePath = path.resolve(__dirname, '../user-upload/xlsx/', fileName);
        let categories = await tb.getCategories();
        let excelHeader1 = ['','','']
        let excelHeader2 = ['ФИО', 'Должность', 'Отдел'];
        categories.forEach((category) => {
            excelHeader1.push(category.name, '', '', '');
            excelHeader2.push('Выдан', 'Действует до', 'Группа', 'Скан');
        });

        let table = await tb.getTbTable();
        let arr = [], tbArr = [excelHeader1,excelHeader2], pos = 0;
        for (let i = 0; i < table.length; i++) {
            if (table[i].skip) {
                /* если прошлая строка пропускается, то продолжаем цикл с j-той категории (дописывает строку) */
                for (let j = pos; j < categories.length; j++) {
                    if (categories[j].ID === table[i].category_id) {
                        /* выводим значения катерии и останавливаем цикл data-find= необходим для поиска значений */
                        arr.push(table[i].issued?.toLocaleDateString("ru"), table[i].validUntil?.toLocaleDateString("ru"), table[i].group_name, table[i].scan_name);
                        pos = j + 1;
                        break;
                    } else {
                        arr.push('','','','');
                    }
                }
                if (table[i].employee_id === table[i + 1]?.employee_id) {
                    /* если в след. строке этот же сотрудник */
                    table[i + 1].skip = true;
                } else {
                    /* иначе выводим до конца строки пустые td (закрываем строку) */
                    for (let j = pos; j < categories.length; j++) {
                        arr.push('','','','');
                    }
                    pos = 0;
                    tbArr.push(arr);
                    arr = [];
                }
            } else {
                /* если начинается новая строка */
                pos = 0;
                if (table[i].employee_id === table[i + 1]?.employee_id) {
                    table[i + 1].skip = true;
                    arr.push(table[i].fio, table[i].position, table[i].subdivision);
                    for (let j = 0; j < categories.length; j++) {
                        if (categories[j].ID === table[i].category_id) {
                            arr.push(table[i].issued?.toLocaleDateString("ru"), table[i].validUntil?.toLocaleDateString("ru"), table[i].group_name, table[i].scan_name);
                            pos = j + 1;
                            break;
                        } else {
                            arr.push('','','','');
                        }
                    }
                } else {
                    /* если у сотрудника одна запить по ТБ; */
                    arr.push(table[i].fio, table[i].position, table[i].subdivision);
                    categories.forEach((category) => {
                        if (category.ID === table[i].category_id) {
                            arr.push(table[i].issued?.toLocaleDateString("ru"), table[i].validUntil?.toLocaleDateString("ru"), table[i].group_name, table[i].scan_name);
                        } else {
                            arr.push('','','','');
                        }
                    });
                    tbArr.push(arr);
                    arr = [];
                }
            }
        }
        xlsx.write(filePath, tbArr);
        res.sendFile(filePath);
        setTimeout(() => {fs.unlink(filePath, () => {})}, 1000);
    } else res.sendStatus(403);
});

router.get('/search', async (req, res) => {
    if (currentUserAccess & CAN_READ_TB) { // проверка доступа | CAN_READ_TB = 8
        if (req.query.s) {
            let search = req.query.s.slice(0, 100);
            let links = users.createLinksFromAccess(currentUserAccess); // получаем доступные страницы
            let categories = await tb.getCategories();
            let table = await tb.getTbTableSearch(search);
            res.render('tbSearch', {login: currentUser, access: currentUserAccess, links: links, categories: categories, table: table, searchValue: search});
        } else res.redirect('/admin/employees');
    } else res.sendStatus(403);
});
/* функция записи в логи */
function writeLog(str, path = 'logs/tb.txt') {
    let date = new Date;
    fs.appendFile(path,`${str} | ${date.toLocaleString('en-GB')}\n`,'utf8',(err) => {
        if (err) throw err;
    });
}

module.exports = router;