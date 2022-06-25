const LocalStrategy = require('passport-local').Strategy
let db = require('./db')
const bcrypt = require('bcrypt-nodejs');
const path = require("path");
const fs = require("fs");

module.exports = function(passport) {
    passport.serializeUser(function (user, done){
        console.log('Сериализация: ', user.idProfile)
        done(null, user.idProfile)
    });


    passport.deserializeUser(function(idProfile, done) {
        db.query("SELECT * FROM user WHERE idProfile = ? ",[idProfile], function(err, result){ //переделать
            done(err, result[0]);
        });
    });

    passport.use(
        'local-signup',
        new LocalStrategy({
                usernameField : 'email',
                passwordField : 'password',
                passReqToCallback : true // allows us to pass back the entire request to the callback
            },

            function(req, email, password, done) {

                let data = req.body
                console.log(data)
                let avatar = path.join('/default.jpg')
                let file = ''

                console.log(file)
                db.query("SELECT * FROM user WHERE email = ? or login = ?", [email, data.login], function (err, result) {
                    if (err) {
                        return done(err);
                    }
                    if (result.length) {
                        if(result[0].email === email){
                            return done(null, false, req.flash('signupMessage', 'Такой email уже зарегестрирован'));
                        }
                        else if(result[0].login === data.login){
                            return done(null, false, req.flash('signupMessage', 'Такой логин уже зарегестрирован'));
                        }
                    } else {

                        let newUserMysql = {
                            ratingProfile: 0,
                            city: data.city,
                            firstname: data.firstName,
                            lastname: data.lastName,
                            login: data.login,
                            avatar: avatar,
                            info: data.info,
                            skills: data.skills,
                            email: email,
                            password: bcrypt.hashSync(password, null, null),  // use the generateHash function in our user model
                        };

                        fs.mkdir(path.join(__dirname, `/media/${newUserMysql.login}/`), err => {
                            console.log()
                            if (err) throw err; // не удалось создать папку
                            console.log('Папка успешно создана');
                        });

                        if(req.files) {
                            file = req.files.avatar
                            avatar = file.name
                            avatar = avatar.replace(/\s/g, '')

                            let date = new Date().toISOString().replace(/:/g, '-')
                            let pathAvatar = path.join(__dirname, `/media/${newUserMysql.login}/${date}-${avatar}`)
                            file.mv(pathAvatar)
                            newUserMysql.avatar = path.join(`/${newUserMysql.login}/${date}-${avatar}`)


                        }


                        let insertQuery = "INSERT INTO user (firstname, ratingProfile, lastname, city, login, email, password, avatar, info, skills) values (?,?,?,?,?,?,?,?,?,?)";
                        db.query(insertQuery, [newUserMysql.firstname, newUserMysql.ratingProfile, newUserMysql.lastname,
                                newUserMysql.city, newUserMysql.login, newUserMysql.email, newUserMysql.password, newUserMysql.avatar,
                                newUserMysql.info, newUserMysql.skills],
                            function (err, result) {
                                console.log(result)
                                newUserMysql.idProfile = result.insertId

                                return done(null, newUserMysql);
                            });

                    }

                });
            })
    )

    passport.use(
        'local-login',
        new LocalStrategy({
                // by default, local strategy uses username and password, we will override with email
                usernameField : 'email',
                passwordField : 'password',
                passReqToCallback : true // allows us to pass back the entire request to the callback
            },
            function(req, email, password, done) { // callback with email and password from our form
                db.query("SELECT * FROM user WHERE email = ?", [email], function (err, result) {

                    if (err)

                        return done(err);
                    if (!result.length) {
                        return done(null, false, req.flash('loginMessage', 'Неправильный логин или пароль')); // req.flash is the way to set flashdata using connect-flash
                    }

                    // if the user is found but the password is wrong
                    // if (password !== result[0].password)
                    if (!bcrypt.compareSync(password, result[0].password))
                        return done(null, false, req.flash('loginMessage', 'Неправильный пароль')); // create the loginMessage and save it to session as flashdata

                    // all is well, return successful user
                    return done(null, result[0]);
                });
            })
    );


};
