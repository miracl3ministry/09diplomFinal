let express = require('express');
let router = express.Router();

const usersModule = require("../usersClass");
const users = new usersModule();
let currentUser = '';

/* Проверка на наличие UUID в куках. */
router.use(async (req, res, next) => {
    if (req.cookies.UUID) {
        currentUser = await users.compareUuid(req.cookies.UUID);
        if (currentUser) {
            res.locals.username = currentUser;
            next();
        } else res.redirect('../');
    } else res.redirect('../');
})

/* GET home page. */
router.get('/', async (req, res, next) => {
    let user = await users.getUserByLogin(currentUser);
    let currentUserAccess = user[0].access;
    let links = users.createLinksFromAccess(currentUserAccess); // создает массив ссылок из байта доступов
    res.render('admin', {login: currentUser, links: links});
});

router.get('/logout', (req, res) => {
    users.logout(req.cookies.UUID);
    res.clearCookie('UUID');
    res.redirect("./");
});

let usersRouter = require('../routes/admin-users');
let employeesRouter = require('../routes/admin-employees');
let tbRouter = require('../routes/admin-tb');
let logsRouter = require('../routes/admin-logs');
router.use('/users', usersRouter);
router.use('/employees', employeesRouter);
router.use('/tb', tbRouter);
router.use('/logs', logsRouter);

module.exports = router;