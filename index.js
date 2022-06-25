const express = require('express')
const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const flash = require('connect-flash');
const path = require('path')
const passport = require('passport')
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const db = require('./db')
const fileUpload = require('express-fileupload')
const PORT = process.env.PORT || 3000
const app = express()


const errorMiddleware = require('./middleware/error');


app.use(fileUpload({}))
app.use(expressLayouts)
app.set("view engine", "ejs");
app.set('layout', './layouts/main')


app.use(cookieParser()); // read cookies (needed for auth)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'media')))
app.use(express.static(path.join(__dirname, 'tests')))


app.use(
    session({
        secret: 'Asdfga',
        key: 'course',
        cookie: {
            path: '/',
            httpOnly: true,
            maxAge: 60 * 60 * 1000
        },
        store: new MySQLStore({expiration: 10800000, createDatabaseTable: true,
            schema: {
                tableName: 'sessiontbl',
                columnNames: {
                    session_id: 'session_id',
                    expires: 'expires',
                    data: 'data'
                }
            }},db),
        resave: false,
        saveUninitialized: true
    })
)


app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


require('./passport-config')(passport);
require('./routes/todos.js')(app, passport);

app.use(errorMiddleware)

app.listen(PORT, ()=> {
    console.log('Server has been started...')
})


