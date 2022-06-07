const dbModule = require("./database");
const database = new dbModule();

class Employees {
    static instance;

    constructor() {
        if (Employees.instance) {
            return Employees.instance;
        }
        Employees.instance = this;
    }

    async addEmployee(arr) { // создает нового рабоника, принимает массив в формате [fio, subdivision, position, dateOfHiring]
        await database.addRow("employees", "fio, subdivision, position, dateOfHiring", arr);
    }

    async addEmployees(arr) { // добавляет массив значений в бд в формате [fio, subdivision, position]
        await database.addRows("employees", "fio, position, subdivision", arr);
    }

    async deleteEmployee(id) { // удаляет сотрудника
        await database.delete("employees", "ID=?", id);
    }

    async deleteSomeEmployees(from, to) { // удаляет несколько сотрудников
        let a = await database.readAllSelectLimit('employees', 'ID', from-1, to-from+1);
        let arr = [a[0].ID, a[a.length - 1].ID];
        await database.delete("employees", "id >= ? and id <= ?", arr);
    }

    async getEmployees() { // возвращает всю таблицу пользователей
        let employees = await database.readAll('employees');
        return employees ?? [];
    }

    async getEmployeesSearch(str) { // поиск по таблице
        let employees = await database.search('employees', ['fio','subdivision', 'position'], str);
        return employees ?? [];
    }

    async updateEmployee(id, arr) { // обновляет данные о сотруднике
        arr.push(id);
        await database.update("employees", "fio=?, subdivision=?, position=?, dateOfHiring=?", 'ID=?', arr);
    }
}

module.exports = Employees;