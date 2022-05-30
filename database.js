const mysql = require("mysql2");
const crypto = require("crypto");
const fs = require("fs");

class Database {
    static instance;

    constructor() {
        if (Database.instance) { // проверяет существует ли данный класс для существования в одном экземпляре
            return Database.instance;
        }
        const dbPass = fs.readFileSync("database-password.txt").toString().slice(0, 40);
        this.connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            database: "diplom",
            password: dbPass
        }).promise();
        this.openConnection();
        this.queue = [];
        Database.instance = this;
    }

    async tests() { // функция для тестирования: database.tests();
        this.addRows("users", "login, password", [["test1", "test2"],["test3", "test4"],["test5", "test6"]]);
        console.log(await this.readPage('users', 'ID', '', 0));
    }

    // DB CRUD
    async addRow(table, cols = "", values = []) {
        // добавляет в таблицу 'table' значение из массива 'values' в столбцы 'cols'
        // this.database.addRow("users", "login, salt, password, UUID, access", array)
        try {
            let params = "";
            for (let valuesKey in values) {
                params += "?,";
            }
            params = params.slice(0, -1);
            const sql = `INSERT INTO ${table}(${cols}) VALUES (${params})`;
            await this.connection.query(sql, values);
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async addRows(table, cols, values = [[]]) {
        // Добавляет множество значений: this.addRows("users", "login, password", [["test1", "test2"],["test3", "test4"],["test5", "test6"]]);
        try {
            const sql = `INSERT INTO ${table}(${cols}) VALUES ?`;
            await this.connection.query(sql, [values]);
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async readAll(table) {
        // возарвщает всю таблицу this.readAllSelect('users')
        try {
            let sql = `SELECT * FROM ${table}`;
            return this.connection.query(sql).then((res) => {
                return res[0];
            }).catch((err) => {
                console.error(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async readAllSelect(table, select) {
        // возарвщает таблицу с выбранными полями this.readAllSelect('users', 'ID, login, access');
        try {
            let sql = `SELECT ${select} FROM ${table}`;
            return this.connection.query(sql).then((res) => {
                return res[0];
            }).catch((err) => {
                console.log(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async readAllSelectLimit(table, select, escape, count) {
        // возарвщает таблицу с выбранными полями this.readAllSelect('users', 'ID, login, access');
        try {
            let sql = `SELECT ${select} FROM ${table} ORDER BY ID LIMIT ${escape}, ${count}`;
            return this.connection.query(sql).then((res) => {
                return res[0];
            }).catch((err) => {
                console.log(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async readAllWhere(table, filter, params) {
        // возвращает значения из таблицы с фильтрами: this.readAllWhere('users', 'ID=? AND login=?', [1,'testAdmin'])
        // this.readAllWhere('users', 'ID=?, 1)
        try {
            const sql = `SELECT * FROM ${table} WHERE ${filter}`;
            return this.connection.query(sql, params).then((res) => {
                return res[0];
            }).catch((err) => {
                console.error(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async readPage(table, filter, params, offset = 0) {
        // Берет страницу, где offset номер страницы
        // this.readPage('users', 'ID', '', 0)
        const pageLength = 1000; // количество строк на странице
        try {
            const sql = `SELECT * FROM ${table} WHERE ${filter} LIMIT ${pageLength} OFFSET ${offset}`;
            return this.connection.query(sql, params).then((res) => {
                return res[0];
            }).catch((err) => {
                console.error(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async update(table, set, filter, values = []) {
        // Обновляет значение: this.update('users', 'login=?', 'ID=?', ['newLogin', 2])
        try {
            const sql = `UPDATE ${table} SET ${set} WHERE ${filter}`;
            this.connection.query(sql, values).catch((err) => {
                console.error(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async delete(table, filter, params) {
        // удаляет строку: this.delete('users','ID=?', 7)
        // или строки: this.delete('users','ID>?', 2);
        // или несколько строк: this.deleteSome('users','id > ? and id < ?', [7,82])
        try {
            const sql = `DELETE FROM ${table} WHERE ${filter}`;
            return this.connection.query(sql, params).then((res) => {
                return res[0];
            }).catch((err) => {
                console.error(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    //DB UTILS
    async search(table, filter, param) {
        // Поиск по таблице: this.search('employees', ['fio','subdivision', 'position'], "Иван")
        try {
            let subStr = 'WHERE ';
            filter.forEach((e) => {
                subStr += `${e} LIKE "%${param}%" OR `;
            })
            subStr = subStr.slice(0, -3);
            const sql = `SELECT * FROM ${table} ${subStr}`;
            return this.connection.query(sql).then((res) => {
                return res[0];
            }).catch((err) => {
                console.error(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    async runQuery(sql) {
        // выполняет запрос sql this.runQuery("select * from users");
        try {
            return this.connection.query(sql).then((res) => {
                return res[0];
            }).catch((err) => {
                console.error(err);
                return err;
            });
        } catch (e) {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        } finally {
            // await this.connection.end();
        }
    }

    openConnection() {
        this.connection.connect().then((e) => {
            console.log("Подключение к серверу MySQL успешно установлено");
        }).catch((e) => {
            this.writeLog(`MySQL module error: ${e}`);
            console.error(`MySQL module error: ${e}`);
        })
    }

    closeConnection() {
        this.connection.end().then((e) => {
            console.log("Подключение закрыто", e);
        }).catch((e) => {
            console.error(`MySQL module error: ${e}`);
            this.writeLog(`MySQL module error: ${e}`);
        })
    }

    async runQueue() {
        if (this.queue.length > 0) {
            let func = this.queue.shift();
            // console.log('in queue', func, typeof func, this.queue.length);
            await func().then(await this.runQueue());
        }
    }

    writeLog(str, path = 'logs/database-errors.txt') { // записывает логи
        let date = new Date;
        fs.appendFile(path,`${str} | ${date.toLocaleString('en-GB')}\n`,'utf8',(err) => {
            if (err) throw err;
        });
    }
}

module.exports = Database;