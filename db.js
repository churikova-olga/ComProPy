const mysql = require('mysql')
const db = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : '523896',
    database: 'churikova'
})

db.connect((err) => {
    if (err) {
        throw err
    } else {
        console.log('Connect ')
    }
})

module.exports = db