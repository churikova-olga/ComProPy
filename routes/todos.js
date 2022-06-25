express = require('express');
const router = express.Router()
const path = require('path')
const db = require('./../db')
const fs = require('fs');
const { spawnSync } = require('child_process');

function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the page
    res.redirect('/login');
}

// для выделения всех чекбоксов

module.exports = function (app, passport) {
    app.get('/login', (req, res)=>{

        res.render('login', { message: req.flash('loginMessage') });
    });

    app.post('/login', (req, res, next)=>{
        passport.authenticate('local-login', function (err, user){
            if(err){
                return next(err)
            }
            if(!user){
                return res.redirect('/login')
            }
            req.logIn(user, function(err){
                if(err){
                    return next(err)
                }
                req.session.userinfo = user
                return res.redirect(`/information/${user.login}`)
            })
        })(req, res, next)
    })


    app.get('/information/:login', isLoggedIn , (req, res)=>{
        let login = req.params.login
        let id = req.session.userinfo.idProfile

        let sql = 'SELECT * FROM `user` Where user.login = ?';

        db.query(sql, [login], (err, result) => {
            if (err) throw err;
        if (result.length) {
            db.query('SELECT tasks.title, tasks.idTasks FROM `solvedtask` INNER JOIN tasks ON solvedtask.idSolvedtaskTasks = tasks.idTasks WHERE solvedtask.idSolvedtaskUser = (SELECT user.idProfile FROM user WHERE login = ?)',
                [login], function (err, solvedtask) {
                    if (err) throw err;

                    db.query('SELECT * FROM `tasks` WHERE tasks.idCreator =  (SELECT user.idProfile FROM user WHERE login = ?)', [login], (err, taskCreator) => {
                        if (err) throw err;

                        let sqlSub = "SELECT subscriptions.idSubscriptionsUser FROM `subscriptions` WHERE subscriptions.idSubscriptionsUser = ? and subscriptions.idSubscriber = ? "

                        db.query(sqlSub, [result[0].idProfile, id], (err, result1) => {
                            if (err) throw err;
                            db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function (err, ratingRight) {
                                if (err) throw err;
                                let subuser = result1
                                if (err) throw err;

                                res.render('information', {
                                    ratingRight: ratingRight,
                                    arraySubscriber: subuser,
                                    loginUser: req.params.login,
                                    user: result,
                                    flag: false,
                                    taskCreator: taskCreator,
                                    myLogin: req.session.userinfo.login,
                                    solvedtask: solvedtask
                                })
                            })
                        })
                    })
                })
        }else{
            res.status(404);
            const content = '404 | not found';
            res.send(content);
        }
        })

    })

    app.get('/followers', isLoggedIn, (req, res) => {
        let id = req.session.userinfo.idProfile //подписчики люди что подписались на меня
        sql = "SELECT * FROM `user` WHERE user.idProfile IN( SELECT subscriptions.idSubscriber FROM `subscriptions` WHERE subscriptions.idSubscriptionsUser = ? )"
        db.query(sql,[id], (err, result) => {
            if (err) throw err;
            db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function(err, ratingRight) {
            if (err) throw err;
            res.render('followers', {ratingRight:ratingRight, flag: false, folUser:result, myLogin:req.session.userinfo.login})
                })
        })
    })

    app.get('/notifications',isLoggedIn,  (req, res) => {
        let id = req.session.userinfo.idProfile
        db.query('SELECT * FROM `notification` where notification.idRecipient = ?',[id], (err, result) => {
            if (err) throw err;

            db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function(err, ratingRight) {
                if (err) throw err;
                res.render('notifications', {
                    ratingRight: ratingRight,
                    notification: result,
                    flag: false,
                    myLogin: req.session.userinfo.login
                })
            })
        })
    })

    app.post("/subscriptions/delete/:id",isLoggedIn, function(req, res){
        const id = req.params.id;
        db.query("DELETE FROM subscriptions WHERE subscriptions.idSubscriptionsUser = ?", [id], function(err, data) {
            if(err) throw err;
            res.redirect("/subscriptions");
        });
    });


    app.post("/information/delete/:id",isLoggedIn, function(req, res){
        let id = req.params.id;
        let myId = req.session.userinfo.idProfile
        db.query("DELETE FROM subscriptions WHERE subscriptions.idSubscriber = ? and subscriptions.idSubscriptionsUser = ?",
            [myId, id], function(err, data) {
            if(err) throw err;
            db.query("SELECT * FROM `user` Where user.idProfile = ?", [id],function(err, data) {
                if(err) throw err;
                res.redirect(`/information/${data[0].login}`);
            })
        });
    });

    app.post("/information/add/:id",isLoggedIn, function(req, res){
        let id = req.params.id;
        let myId = req.session.userinfo.idProfile
        db.query("INSERT INTO `subscriptions`(`idSubscriptionsUser`, `idSubscriber`) VALUES (?,?)", [id, myId],
            function(err, data) {
            if(err) throw err;
            db.query("SELECT * FROM `user` Where user.idProfile = ?", [id],function(err, data) {
                if(err) throw err;
                res.redirect(`/information/${data[0].login}`);
            })
        });
    });


    app.post("/delete", isLoggedIn, function(req, res){
        let deleteall = req.body.delete
        db.query("DELETE FROM notification WHERE idNotification IN (?)", [deleteall], function(err, data) {
            if(err) throw err;
            res.redirect("/notifications");
        });
    });


    app.get('/rating/:id',isLoggedIn, (req, res) => {
        let page = Number(req.params.id)
        let num = 30

    if(typeof page === 'number' && isNaN(page)!==true && page>0){
            let start = (page - 1) * num
            db.query("SELECT * FROM `user` ORDER BY user.ratingProfile DESC", function (err, result1) {
                if (err) throw err;
                db.query("SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit ?, ?", [start, num], function (err, result) {
                    if (err) throw err;
                    db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function(err, ratingRight) {
                        if (err) throw err;
                        let counter = Math.ceil(result1.length / num) - 1
                        if (page > counter + 1) {
                            return res.redirect("/rating/1")
                        }
                        res.render('rating', {
                            counter,
                            ratingRight: ratingRight,
                            num,
                            flag: false,
                            user: result,
                            myLogin: req.session.userinfo.login,
                            page
                        });
                    })
                })
            })
        }else{return res.redirect("/rating/1")}

    })


    app.get('/subscriptions',isLoggedIn, (req, res) => {
        let id = req.session.userinfo.idProfile //вывести информацию о моем подписчике
        sql = "SELECT * FROM `user` WHERE user.idProfile IN( SELECT subscriptions.idSubscriptionsUser  FROM `subscriptions` WHERE subscriptions.idSubscriber = ? )"
        db.query(sql,[id], (err, result) => {
            if (err) throw err;
            db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function (err, ratingRight) {
                if (err) throw err;
                res.render('subscriptions', {
                    flag: false,
                    ratingRight: ratingRight,
                    subUser: result,
                    myLogin: req.session.userinfo.login
                })
            })
        })
    })


    app.get('/tasks',isLoggedIn, (req, res) => {

        db.query('SELECT *, DATE_FORMAT(datetimeTasks, "%d.%m.%Y %H:%i:%s") as new_date FROM tasks INNER JOIN user ON tasks.idCreator = user.idProfile ORDER BY datetimeTasks DESC', function(err, tasks) {
            if (err) throw err;

            db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function (err, ratingRight) {
                if (err) throw err;

                res.render('tasks', {flag: false, myLogin: req.session.userinfo.login, tasks: tasks, ratingRight: ratingRight})
            })
        })
    })


    app.get('/tasks/user/create/',isLoggedIn, (req, res) => {
        db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function (err, ratingRight) {
            if (err) throw err;
            res.render('createTask', {ratingRight: ratingRight,flag: false, myLogin: req.session.userinfo.login, message:req.flash('messageCreate')})
        })
    })


    app.post('/tasks/user/create/',isLoggedIn, (req, res) => {

        let data = req.body
        let urlTest = req.files.urlTest
        let InputData = req.files.InputData
        let outData = req.files.outData
        let loginNew = req.session.userinfo.login.replace(/\s/g, '')

        urlTest.name = 'test_' + urlTest.name.replace(/\s/g, '')
        InputData.name = 'input_' + InputData.name.replace(/\s/g, '')
        outData.name = 'out_' + outData.name.replace(/\s/g, '')


        let createTask = {
            idCreator: req.session.userinfo.idProfile,
            title: data.title,
            description: data.description,
            requirements: data.requirements,
            fieldInputData: data.fieldInputData,
            fieldOutData: data.fieldOutData,
            ratingTasks: 0,
            countVote: 0,
            urlTest: urlTest.name,
            InputData: InputData.name,
            outData: outData.name,
        }

        let sql ='INSERT INTO tasks (`idCreator`, `description`, `title`, `requirements`, `urlTest`, `InputData`, `outData`, `fieldInputData`, `fieldOutData`, `ratingTasks`, `countVote`) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        db.query(sql, [createTask.idCreator, createTask.description, createTask.title, createTask.requirements, createTask.urlTest,
            createTask.InputData,  createTask.outData, createTask.fieldInputData, createTask.fieldOutData,
            createTask.ratingTasks, createTask.countVote], function (err, task) {
            if (err) throw err;

            fs.mkdir(path.join(__dirname, `../tests/${task.insertId}/`), err => {
                if(err) throw err; // не удалось создать папку
                console.log('Папка успешно создана');
            });

            let pathUrlTest = path.join(__dirname, `../tests/${task.insertId}/` + urlTest.name)
            let pathInputData =  path.join(__dirname, `../tests/${task.insertId}/` + InputData.name)
            let pathOutData =   path.join(__dirname, `../tests/${task.insertId}/` + outData.name)

            urlTest.mv(pathUrlTest, (err)=> {
                if (err) {
                    return res.status(500).json({
                        ok: false,
                        err
                    });
                }
                InputData.mv(pathInputData, (err) => {
                    if (err) {
                        return res.status(500).json({
                            ok: false,
                            err
                        });
                    }

                    outData.mv(pathOutData, (err) => {
                        if (err) {
                            return res.status(500).json({
                                ok: false,
                                err
                            });
                        }
                        if (fs.existsSync(pathOutData)) {



                            let pathAnswer = path.join(__dirname, `../tests/answer.py`)

                            let pathInputDataTest = path.join(`${task.insertId}/${InputData.name}`)
                            console.log(task.insertId)
                            let pathOutDataTest = path.join(`${task.insertId}/${outData.name}`)

                            let pathSolutionTest = path.join(`${task.insertId}/${urlTest.name}`)

                            let MEDIA_ROOT = path.join(__dirname, `../tests/`)

                            let slug = loginNew


                            const pythonFile = spawnSync('python', [pathAnswer, pathInputDataTest, pathOutDataTest, pathSolutionTest, slug, MEDIA_ROOT]);

                            req.flash('messageCreate', `${pythonFile.stdout}`)

                            console.log(`${pythonFile.stderr}`)

                            let messageAnswer = `${pythonFile.stdout}`

                            if (messageAnswer.includes("SUCCESS")) {
                                return res.redirect("/tasks/")
                            } else {
                                db.query('DELETE FROM `tasks` WHERE tasks.idTasks = ?', [task.insertId], function (err, deleteTask) {
                                    fs.rm(path.join(__dirname, `../tests/${task.insertId}/`), {
                                        recursive: true,
                                        force: true
                                    }, err => {
                                        if (err) throw err; // не удалось удалить папку
                                        console.log('Папка успешно удалена');
                                    });
                                    return res.redirect("/tasks/user/create/")
                                })

                            }
                        }
                    })
                })
            })

        })
        })



    app.get('/edit', isLoggedIn, (req, res) => {
        let id = req.session.userinfo.idProfile

        let sql = 'SELECT * FROM `user` Where user.idProfile = ?';
        db.query(sql, [id], (err, result) => {
            if (err) throw err;
            db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function (err, ratingRight) {
                if (err) throw err;
                res.render('edit', {
                    flag: false,
                    user: result,
                    myLogin: req.session.userinfo.login,
                    ratingRight: ratingRight
                })
            })
        })

    })


    app.get('/tasks/:id/',isLoggedIn, (req, res) => {
        let idTask = req.params.id

        db.query('SELECT *, DATE_FORMAT(datetimeTasks, "%d.%m.%Y %H:%i:%s") as new_date FROM tasks INNER JOIN user ON tasks.idCreator = user.idProfile where tasks.idTasks = ?', [idTask], function (err, task) {
            if (err) throw err;
            if(task.length) {
                db.query('SELECT votes FROM `tasks` where tasks.idTasks = ?', [idTask], function (err, votes) {
                    if (err) throw err;
                    let checkVote = false
                    if (votes[0]['votes'] !== null) {
                        let vote = JSON.parse(votes[0]['votes'])
                        // console.log(vote['idx'])
                        let idVote = vote['idx']

                        for (let i = 0; i < idVote.length; i++) {

                            if (Number(idVote[i]) === Number(req.session.userinfo.idProfile)) {

                                checkVote = true
                                break
                            } else {
                                checkVote = false
                            }
                        }
                    }
                    db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function (err, ratingRight) {
                        if (err) throw err;
                        db.query('SELECT *, DATE_FORMAT(datatimeComment, "%d.%m.%Y %H:%i:%s") as new_date FROM comments INNER JOIN user ON comments.idCommentUser = user.idProfile where comments.idCommentTask = ? ORDER BY datatimeComment DESC', [idTask], function (err, comments) {
                            if (err) throw err;

                            res.render('oneTask', {
                                flag: false,
                                myLogin: req.session.userinfo.login,
                                task: task,
                                comments: comments,
                                ratingRight: ratingRight,
                                checkVote,
                                message: req.flash('message'),
                                messageNew: req.flash('messageNew')
                            })
                        })
                    })
                })
            }else{
                return res.redirect('/tasks/')
            }
        })

    })


    app.post('/tasks/:id/vote', isLoggedIn, (req, res) => {

        let idTask = req.params.id //
        let voteUser = req.body.rating
        console.log(req.body.rating, 'g')
        let idProfile = req.session.userinfo.idProfile

        db.query('SELECT votes, ratingTasks, countVote FROM `tasks` where tasks.idTasks = ?', [idTask], function (err, votes) {
            if (err) throw err;
            let a = `{"idx": "${idProfile}"}`
            let sumVote = (Number(votes[0]['ratingTasks']) * Number(votes[0]['countVote']) + Number(voteUser))

            if (votes[0]['votes'] !== null){
                db.query('UPDATE `tasks` SET `votes`= JSON_MERGE(?, ?), `ratingTasks` = ? WHERE idTasks = ?;', [votes[0]['votes'], a, sumVote, idTask],function (err, insert) {
                    if (err) throw err;
                })
            }
            else if (votes[0]['votes'] === null) {
                db.query('UPDATE `tasks` SET `votes`= JSON_OBJECT(?, JSON_ARRAY(?)), `ratingTasks` = ? WHERE idTasks = ?;', ['idx', `${idProfile}` ,sumVote, idTask], function (err, insert) {
                    if (err) throw err;
                })
            }

            let countVote = Number(votes[0]['countVote'])+1
            let ratingTasks = sumVote/countVote

            db.query('UPDATE `tasks` SET `ratingTasks`= ?, `countVote` = ? WHERE idTasks = ?;', [ratingTasks,countVote, idTask], function (err, insert) {
                if (err) throw err;
            })

            return res.redirect(`/tasks/${idTask}`)

        })
    })


    app.post('/comment/task/:id', isLoggedIn, (req, res) => {
        let {id} = req.params
        let idProfile = req.session.userinfo.idProfile
        let {message} = req.body
        let comment = {
            idCommentTask: id,
            idCommentUser: idProfile,
            messageComment: message,
        }

        db.query('INSERT INTO `comments`(`idCommentTask`, `idCommentUser`, `messageComment`) VALUES (?,?,?)',
            [comment.idCommentTask, comment.idCommentUser, comment.messageComment], function (err, comment){
                if (err) throw err;
        })
        return res.redirect(`/tasks/${id}`)

    })


    app.post('/edit', isLoggedIn, (req, res)=>{
        let file = ''
        let avatar = path.join('/default.jpg')

        let data = req.body
        let login = req.session.userinfo.login
        let id = req.session.userinfo.idProfile
        let updateUser = {
            lastname: data.lastName,
            firstname: data.firstName,
            city: data.city,
            skills: data.skills,
            info: data.info,
            avatar: avatar,
        }

        if(req.files) {
            file = req.files.avatar
            avatar = file.name
            avatar = avatar.replace(/\s/g, '')
            let date = new Date().toISOString().replace(/:/g, '-')
            let pathAvatar = path.join(__dirname, `../media/${login}/${date}-${avatar}`)

            file.mv(pathAvatar)
            updateUser.avatar = path.join(`/${login}/${date}-${avatar}`)
        }
        let updateSql = "UPDATE `user` SET `firstName`= ?,`lastName`= ?, `avatar`=?,`city`=?,`info`=?,`skills`=? where user.idProfile = ?"
        db.query(updateSql, [updateUser.firstname, updateUser.lastname, updateUser.avatar, updateUser.city, updateUser.info, updateUser.skills, id], (err, result1) => {
            if (err) throw err;
            return res.redirect(`/information/${login}`)
        })

    })


    app.get('/', (req, res) => {
        if (req.isAuthenticated()){
            let login = req.session.userinfo.login
            return res.redirect(`/information/${login}`)
        }else{
        res.render('home', {flag: true} )}
    })


    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
        });


    app.get('/signup', function(req, res) {
        if (req.isAuthenticated()){
            let login = req.session.userinfo.login
            return res.redirect(`/information/${login}`)
        }else{
        // render the page and pass in any flash data if it exists
        res.render('signup', { message: req.flash('signupMessage')});}
    });


    app.post('/signup', passport.authenticate('local-signup', {
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true, // allow flash messages
    }), (req, res) => {
        let data = req.body.login
        return res.redirect('/login')
    });


    app.get('/search', function(req, res) {
        let message = '%' + req.query.message + '%'
        db.query("SELECT * FROM `user` where user.login like ?", [message], function (err, searchUser) {
            if (err) throw err;
            db.query("SELECT * FROM `tasks` INNER JOIN user ON tasks.idCreator = user.idProfile where tasks.title like ?", [message], function (err, searchTask) {
                if (err) throw err;
                db.query('SELECT * FROM `user` ORDER BY user.ratingProfile DESC limit 5', function (err, ratingRight) {
                    if (err) throw err;
                    res.render('search', {flag: false, searchUser:searchUser, searchTask:searchTask, myLogin: req.session.userinfo.login, ratingRight: ratingRight});
                })
            })
        })
    })

    app.post('/solution/task/:id', function (req, res){

        let {id} = req.params
        let idProfile = req.session.userinfo.idProfile
        let login = req.session.userinfo.login
        let {solution} = req.body

        let date = new Date().toISOString().replace(/:/g, '-')
        let loginNew = login.replace(/\s/g, '')

        let pathDir = path.join(__dirname, `../tests/${id}/${loginNew}`)

        let pathFile = path.join(__dirname, `../tests/${id}/${loginNew}/${loginNew}-${date}.py`)

        let pathAnswer = path.join(__dirname, `../tests/answer.py`)

        db.query('SELECT InputData, outData FROM `tasks` WHERE idTasks = ?', [id], function(err, pathData) {
            db.query('SELECT DISTINCT lastName, firstName, idCreator FROM tasks INNER JOIN user ON  tasks.idCreator = user.idProfile where tasks.idTasks = ?',
                [id], function (err, userSender) {
                    if (!fs.existsSync(pathDir)) {
                        fs.mkdir(pathDir, err => {
                            if (err) throw err; // не удалось создать папку
                            console.log('Папка успешно создана');
                        });
                    }

                    fs.writeFileSync(pathFile, solution);

                    let pathInputData = path.join(`${id}/${pathData[0].InputData}`)
                    let pathOutData = path.join(`${id}/${pathData[0].outData}`)
                    let pathSolution = path.join(`${id}/${loginNew}/${loginNew}-${date}.py`)
                    let MEDIA_ROOT = path.join(__dirname, `../tests/`)
                    let slug = loginNew

                    const pythonFile = spawnSync('python', [pathAnswer, pathInputData, pathOutData, pathSolution, slug, MEDIA_ROOT]);
                    let messageAnswer = ''
                    console.log(`${pythonFile.stderr}`)
                    if (Number(idProfile) !== Number(userSender[0].idCreator)) {
                        req.flash('message', `${pythonFile.stdout}`)
                        messageAnswer = `${pythonFile.stdout}`
                    } else {
                        req.flash('message', 'Это ваша задача')
                        messageAnswer = "You solve your task"
                    }

                    if(messageAnswer.includes("SUCCESS")){
                        let solvedTask = {
                            idTasks: id,
                            idUser: idProfile,
                        }

                        db.query('SELECT DISTINCT `idSolvedtaskTasks`, `idSolvedtaskUser` FROM `solvedtask` WHERE solvedtask.idSolvedtaskTasks = ? and solvedtask.idSolvedtaskUser = ?',
                        [id, idProfile], function (err, checkSolvedtask){

                            if(checkSolvedtask.length) {

                                req.flash('messageNew', 'Вы не получаете рейтинг, так как уже решили эту задачу раньше')


                            }
                            else{
                                let notification = {
                                    idSender: idProfile,
                                    idRecipient: userSender[0].idCreator,
                                    messageNotification: `Пользователь ${login} решил вашу задачу`,
                                    typeNotificationMessage: `solved task`
                                }

                                db.query('INSERT INTO `notification`(`idSender`, `idRecipient`, `messageNotification`, `typeNotificationMessage`) VALUES (?,?,?,?)',
                                    [notification.idSender, notification.idRecipient, notification.messageNotification, notification.typeNotificationMessage],
                                    function (err, notification) {

                                        db.query('INSERT INTO `solvedtask`(`idSolvedtaskTasks`, `idSolvedtaskUser`) VALUES (?,?)',
                                            [solvedTask.idTasks, solvedTask.idUser], function (err, solvedtask) {
                                                if (err) throw err;

                                                db.query('SELECT ratingProfile FROM `user` WHERE idProfile = ?', [idProfile],
                                                    function (err, ratingProfile) {
                                                        if (err) throw err;
                                                        let ratingProfileEdit = ratingProfile[0].ratingProfile + 1
                                                        db.query('UPDATE `user` SET `ratingProfile`= ? WHERE idProfile = ?', [ratingProfileEdit, idProfile],
                                                            function (err, newRatingProfile) {
                                                                if (err) throw err;
                                                            })
                                                    })
                                            })
                                    })
                            }
                                return res.redirect(`/tasks/${id}`)
                        })
                    }
                    else{
                        return res.redirect(`/tasks/${id}`)
                    }

                })

        })
    })

    return router
}
