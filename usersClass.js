const crypto = require("crypto");
const dbModule = require("./database");
const database = new dbModule();

class Users {
    static instance;

    constructor() {
        if (Users.instance) {
            return Users.instance;
        }
        Users.instance = this;
    }

    async tests() { // функция для тестов и проверок
        // let a = await this.addRow("users", "login, password, salt, UUID", ["testLogin", "test", "test", "uuid"]);
        // console.log("a = ", a)
        // let b = await this.readAll("users");
        // console.log("b = ", b)
        // let c = await this.checkExistence('testAdmin');
        // console.log("c = ", c);
        // await this.createUser("admin", "admin");
        // let d = await this.checkPassword("testAdmin2", "123");
        // console.log("d = ",d);
        // let e = await this.compareUuid("02f2ec18-7a3a-41ef-8323-fb938e8da653");
        // console.log("e =", e);
        // this.deleteUser('testAdmin');
    }

    async deleteUser(id) { // удаляет пользователя
        await database.delete("users", "ID=?", id);
    }

    async changePassword(id, newPass) { // меняет пароль
        let arr = [];
        arr.push(crypto.randomBytes(128).toString("base64")); // salt
        arr.push(crypto.pbkdf2Sync(newPass, arr[0], 10000, 512, "sha512").toString("hex"));
        arr.push('');
        arr.push(id);
        await database.update("users", "salt=?,password=?,UUID=?", "ID=?", arr);
    }

    async compareUuid(uuid) { // сравнивает UUID со значением из бд
        if (uuid) {
            let a = await database.readAllWhere("users", "UUID = ?", uuid);
            return a.length !== 0 ? a[0].login : false;
        } else {
            return false;
        }
    };

    async checkPassword(login, password) { // сравнивает хэш пароля, возвращает false или UUID
        if (login && password) {
            let a = await database.readAllWhere("users", "login = ?", login);
            if (a.length !== 0) {
                let passHashed = crypto.pbkdf2Sync(password, a[0].salt, 10000, 512, "sha512").toString("hex");
                if (passHashed === a[0].password) {
                    let newUUID = crypto.randomUUID();
                    await database.update("users", "UUID=?", "ID=?", [newUUID, a[0].ID]);
                    return newUUID;
                } else {
                    console.log(`Access denied`);
                    return false;
                }
            } else {
                console.log(`User "${login}" doesn't exist`);
                return false;
            }
        } else {
            console.log("Users module error: wrong data")
            return false;
        }
    };

    async createUser(login, password) { // создает нового пользователя
        if (login && password) {
            let bool = await this.checkExistence(login);
            if (!bool) {
                let arr = [login];
                arr.push(crypto.randomBytes(128).toString("base64")); // salt
                arr.push(crypto.pbkdf2Sync(password, arr[1], 10000, 512, "sha512").toString("hex"));
                arr.push(crypto.randomUUID());
                if (login === 'admin') arr.push(255)
                else arr.push(252)
                await database.addRow("users", "login, salt, password, UUID, access", arr);
                return 'Ok';
            } else {
                console.log(`User "${login}" exists`);
                return `User "${login}" exists`;
            }
        } else {
            console.log("Users module error: wrong user data");
            return "Users module error: wrong user data";
        }
    }

    async checkExistence(userLogin) { // проверка существует ли пользователь, возвращает true или false
        let a = await database.readAllWhere("users", "login = ?", userLogin);
        return a.length !== 0;
    }

    async logout(UUID) { // Удаляет UUID
        await database.update("users", "UUID=?", 'UUID=?', ['', UUID]);
    }

    async getUsers() { // возвращает всю таблицу пользователей
        let users = await database.readAllSelect('users', 'ID, login, access');
        return users ?? [];
    }

    async getUserByLogin(login) { // возвращает данные пользователя
        let user = await database.readAllWhere('users', 'login=?', login);
        return user ?? [];
    }

    async getUserById(id) { // возвращает данные пользователя
        try {
            let idNumber = Number(id);
            let user = await database.readAllWhere('users', 'ID=?', idNumber);
            return user ?? null;
        } catch (e) {
            console.log('Ошибка в функции getUserById, id не приведен к числу');
            console.error(e);
            return false;
        }
    }

    async firstLaunch() {// Проверка на первый запуск
        let adminIsExists = await this.getUserByLogin('admin');
        if (!adminIsExists[0]) {
            this.createUser('admin', 'admin');
        }
    }

    createLinksFromAccess(access) {
        // проверка на доступы и создание доступных ссылок, где
        //     11            11         11       1      1    = 255
        // R/W users   R/W employees  R/W tb  settings logs
        if (access < 256 && access >= 0) {
            let links = [];
            if (access & 128) links.push({href: 'users', name: 'Пользователи'})
            if (access & 32) links.push({href: 'employees', name: 'Сотрудники'})
            if (access & 8) links.push({href: 'tb', name: 'Учет ТБ'})
            if (access & 2) links.push({href: 'settings', name: 'Настройки/календарь/сессии(фича не готова)'})
            if (access & 1) links.push({href: 'logs', name: 'Логи'})
            return links;
        } else return [{href: 'error', name: 'error'}];
    }

    async changeUserAccess(access = 0, id) { // меняет доступы у пользователя
        if (access < 256 && access >= 0) {
            await database.update('users', 'access=?', 'ID=?', [access, id]);
        } else return false;
    }
}

module.exports = Users;