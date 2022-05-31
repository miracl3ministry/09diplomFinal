const fs = require('fs');
const xlsx = require('node-xlsx');

const dbModule = require("./database");
const database = new dbModule();

class Csv {
    static instance;

    constructor() {
        if (Csv.instance) {
            return Csv.instance;
        }
        Csv.instance = this;
    }

    write(path, data) { /* записывает файл */
        let buffer = xlsx.build([{name: "Персонал НИПО", data: data}]);
        fs.writeFileSync(path, buffer, (e, res) => {
            if (e) {
                console.error(e.message);
                throw e;
            }
        });
    }

    async parseXslForTbTable(filePath = "") { /* принимает путь до xls и возвращает массив json-ов */
        const excelParsed = xlsx.parse(filePath);
        let excelSheet = excelParsed[0],
            replaceRules = {},
            categories = {}, currenCategory;
        categories.length = excelSheet.data[2].length;
        categories.array = [];
        excelSheet.data[1].forEach((el) => {
            categories.array.push(el);
        })
        await this.compareCategoriesWithDb(categories.array); // MySQL module error: Error: Column count doesn't match value count at row 1
        for (let i = 0; i < categories.length; i++) { // строим объект с правилами перестановки, т.е. узнаем что и в каком столбце
            if (excelSheet.data[2][i] === 'Фамилия, имя, отчество' || excelSheet.data[2][i] === 'ФИО') replaceRules.fio = i;
            if (excelSheet.data[2][i] === 'Должность') replaceRules.position = i;
            if (excelSheet.data[2][i] === 'Отдел') replaceRules.subdivision = i;
            if (excelSheet.data[1][i]) {
                currenCategory = excelSheet.data[1][i];
                replaceRules[currenCategory] = {};
            }
            if (excelSheet.data[2][i] === 'выдан' || excelSheet.data[2][i] === 'Дата выдачи') replaceRules[currenCategory].issued = i;
            if (excelSheet.data[2][i] === 'действителен до' || excelSheet.data[2][i] === 'Действительно до'
                || excelSheet.data[2][i] === 'действилен до' || excelSheet.data[2][i] === 'действительно до') replaceRules[currenCategory].validUntil = i;
            if (excelSheet.data[2][i] === 'скан' || excelSheet.data[2][i] === 'Скан') replaceRules[currenCategory].scan = i;
            if (excelSheet.data[2][i] === 'группа' || excelSheet.data[2][i] === 'Группа') replaceRules[currenCategory].group = i;
        }

        // получаем ид категорий
        let categoriesFromDb = await database.readAllSelect('categories', 'name, ID'),
            categoriesFromDbNames = [];
        categoriesFromDb.forEach((e) => {
            categoriesFromDbNames.push(e.name.trim().toLowerCase());
        })
        categories.ids = [];
        for (let i = 0; i < categories.array.length; i++) {
            let b = categoriesFromDbNames.indexOf(categories.array[i].trim().toLowerCase());
            // console.log('find index for', categories.array[i].trim().toLowerCase(), '; founded:', categoriesFromDb[b]);
            categories.ids.push(categoriesFromDb[b].ID);
        }

        // создаем массив значений для бд
        let tb = [];
        // console.log('categories', categories);
        // console.log('replace', replaceRules);
        for (let i = 3; i <= excelSheet.data.length; i++) {
            let row = excelSheet.data[i];
            if (row && row.length !== 0 && row[2]) {
                let max = Math.max(replaceRules.fio, replaceRules.position, replaceRules.subdivision) + 1; // убираем из перебора эти значения
                let obj = {};
                for (let j = max; j < categories.length; j++) {
                    if (row[j]) {
                        // парсим строку в объект
                        for (let l = 0; l < categories.array.length; l++) {
                            obj.fio = row[replaceRules.fio];
                            if (j === replaceRules[categories.array[l]]?.issued) {
                                obj.categoryId = categories.ids[l];
                                let days = Number(row[replaceRules[categories.array[l]].issued]) ?? null;
                                if (!Number.isNaN(days)) obj.issued = new Date(0, 0, days)?.toISOString().slice(0,10) ?? null;
                                continue;
                            }
                            if (j === replaceRules[categories.array[l]]?.validUntil) {
                                obj.categoryId = categories.ids[l];
                                let days = Number(row[replaceRules[categories.array[l]].validUntil]) ?? null;
                                if (!Number.isNaN(days)) obj.validUntil = new Date(0, 0, days)?.toISOString().slice(0,10) ?? null;
                                continue;
                            }
                            if (j === replaceRules[categories.array[l]]?.scan) {
                                obj.categoryId = categories.ids[l];
                                obj.scan = row[replaceRules[categories.array[l]].scan];
                                continue;
                            }
                            if (j === replaceRules[categories.array[l]]?.group) {
                                obj.categoryId = categories.ids[l];
                                obj.group = row[replaceRules[categories.array[l]].group];
                                continue;
                            }
                        }
                    }
                }
                if (Object.keys(obj).length !== 0) {
                    tb.push(obj);
                }
            }
        }
        // console.log('tb', tb);
        return tb;
    }

    parseXslForEmployeesTable(filePath = "") { // принимает путь до xls и возвращает массив
        const excelParsed = xlsx.parse(filePath);
        let data = {};
        data.length = excelParsed[0].data[2].length;
        for (let i = 0; i < data.length; i++) {
            if (excelParsed[0].data[2][i] === 'Фамилия, имя, отчество' || excelParsed[0].data[2][i] === 'ФИО') data.fio = i;
            if (excelParsed[0].data[2][i] === 'Должность') data.position = i;
            if (excelParsed[0].data[2][i] === 'Отдел') data.subdivision = i;
        }
        data.rows = excelParsed[0].data.length;
        /* фильтруем и переводим массив в json */
        let arr = [];
        for (let i = 0; i < data.rows; i++) {
            if (excelParsed[0].data[i] && excelParsed[0].data[i].length !== 0 && excelParsed[0].data[i][2]) {
                arr.push([excelParsed[0].data[i][data.fio],excelParsed[0].data[i][data.position], excelParsed[0].data[i][data.subdivision]]);
            }
        }
        return arr;
    }

    async compareCategoriesWithDb(categories) { // сравниваем категории из экселя с категориями их бд, если нету, то добавляем в бд
        let categoriesFromDb = await database.readAllSelect('categories', 'name'),
            categoriesFromDbArr = [], added = [];
        categoriesFromDb.forEach((e) => {
            categoriesFromDbArr.push(e.name.trim().toLowerCase());
        })
        for (let i = 0; i < categories.length; i++) {
            let b = categoriesFromDbArr.includes(categories[i].trim().toLowerCase());
            if (!b) added.push(categories[i]);
        }
        if (added.length !== 0) await database.addRows('categories', 'name', [added]);
        return added;
    }
}

module.exports = Csv;