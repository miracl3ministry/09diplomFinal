let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
const helmet = require('helmet');

let indexRouter = require('./routes/index');
let adminRouter = require('./routes/admin');
const fs = require("fs");

let app = express();
app.use(helmet());

// redirect to https
// app.enable('trust proxy')
// app.use((req, res, next) => {
//     req.secure ? next() : res.redirect('https://' + req.headers.host + req.url)
// })

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/bootstrap/css", express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use("/bootstrap/js", express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

app.use('/', indexRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
    writeLog(`${err.status} ${err}; ${err.message} ${req.url} ;\n\t${err.stack}`);
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

function writeLog(str) {
    let date = new Date;
    fs.appendFile('logs/errors.txt',`${str} | ${date.toLocaleString('en-GB')}\n`,'utf8',(err) => {
        if (err) throw err;
    });
}