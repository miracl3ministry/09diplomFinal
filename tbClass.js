const dbModule = require("./database");
const database = new dbModule();

class Tb {
    static instance;

    constructor() {
        if (Tb.instance) {
            return Tb.instance;
        }
        Tb.instance = this;
    }

    async tests() { // функция для тестов и проверок
        console.log('start test');
        // await this.createEmployee(['Зайцев Иван Иванович', 'Управление бухгалтерского учета', "Начальник управления", "2015-01-09", 1])
        // let a = await this.getEmployees();
        // this.deleteEmployee(4);
    }

    async getCategories () {
        let a = await database.readAll('categories');
        return a ?? [];
    }

    async addCategory(name, validYears) {
        await database.addRow("categories", "name, validYears", [name, validYears]);
    }

    async deleteCategory(name) {
        await database.delete("categories", "name=?", name);
    }

    async getTbTable() {
        let sql = `
        select employees.ID as employee_id, tb.ID, fio, subdivision, position, categories.name, tb.issued, tb.validUntil,  tb.group_name,  tb.scan_name,  tb.scan_href, tb.category_id from employees
        left join tb on employees.ID = tb.employee_id
        left join categories on categories.ID = tb.category_id
        order by employees.ID, categories.ID;`;
        let a = await database.runQuery(sql);
        return a ?? [];
    }

    async getTbTableSearch(str) { // поиск по таблице
        let sql = `
        select employees.ID as employee_id, tb.ID, fio, subdivision, position, categories.name, tb.issued, tb.validUntil,  tb.group_name,  tb.scan_name,  tb.scan_href, tb.category_id from employees
        left join tb on employees.ID = tb.employee_id
        left join categories on categories.ID = tb.category_id
        where fio like "%${str}%" or subdivision like "%${str}%" or position like "%${str}%" or tb.scan_name like "%${str}%" or tb.group_name like "%${str}%"
        order by employees.ID, categories.ID;`;
        let a = await database.runQuery(sql);
        return a ?? [];
    }

    async findCategoryByName(name) {
        let a = await database.readAllWhere('categories', 'name=?', name);
        return a ?? [];
    }

    async findCategoryById(id) {
        let a = await database.readAllWhere('categories', 'id=?', id);
        return a ?? [];
    }

    async addRow(arr) {
        await database.addRow("tb", "employee_id, category_id, issued, validUntil, group_name, scan_name, scan_href", arr);
    }

    async addRows(arr) {
        await database.addRows("tb", "employee_id, category_id, issued, validUntil, group_name, scan_name", arr);
    }

    async updateRow(id, arr) {
        arr.push(id);
        await database.update("tb", "issued=?, validUntil=?, group_name=?, scan_name=?, scan_href=?, validYears=?", 'ID=?', arr);
    }

    async deleteRow(categoryId, employeeId) {
        await database.delete('tb','category_id=? AND employee_id=?', [categoryId, employeeId]);
    }
}

module.exports = Tb;