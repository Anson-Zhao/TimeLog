// routes/routes.js
const mysql = require('mysql');
// const bodyParser = require('body-parser');
const serverConfig = require('../config/serverConfig');
const bcrypt = require('bcrypt-nodejs');
const nodemailer = require('nodemailer');
// const cors = require('cors');
const async = require('async');
const crypto = require('crypto');
const con_CS = mysql.createConnection(serverConfig.commondb_connection);
const smtpTrans = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'aaaa.zhao@g.northernacademy.org',
        pass: "qwer1234"
    }
});

let myStat, myVal, myErrMsg, token, errStatus, mylogin;
let today, date2, date3, time2, time3, dateTime, tokenExpire;

con_CS.query('USE ' + serverConfig.Login_db); // Locate Login DB

module.exports = function (app, passport) {

    // app.use(bodyParser.urlencoded({extended: true}));
    // app.use(bodyParser.json());
    // app.use(cors({
    //     origin: '*',
    //     credentials: true
    // }));

    // =====================================
    // CS APP Home Section =================
    // =====================================

    app.get('/',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        // res.render('homepage.ejs');
        res.render('homepage.ejs', {
            message: req.flash('loginMessage'),
            error: "Your username and password don't match."
        })
    });


    // =====================================
    // LOGIN Section =======================
    // =====================================
    // show the login form
    app.get('/login', function (req, res) {
        // render the page and pass in any flash data if it exists
        res.render('login.ejs', {
            message: req.flash('loginMessage'),
            error: "Your username and password don't match."
        })
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
            successRedirect: '/authentication', // redirect to the secure profile section
            failureRedirect: '/login', // redirect to the login page if there is an error
            failureFlash: true // allow flash messages
        }),
        function (req, res) {
            if (req.body.remember) {
                req.session.cookie.maxAge = 1000 * 60 * 3;
                req.session.cookie.expires = false;
            }
            //res.redirect('/login');
        },);


    // //Detects if user is admin
    app.get('/authentication', function (req, res) {
        dateNtime();

        res.render('2step.ejs',{
            user:req.user,
            username: req.user.username
        });
    });

    // Update user login status
    app.get('/loginUpdate', isLoggedIn, function (req, res) {
        dateNtime();

        myStat = "UPDATE userlogin SET status = 'Active', lastLoginTime = ? WHERE username = ?";
        myVal = [dateTime, req.user.username];
        myErrMsg = "Please try to login again";
        updateDBNredir(myStat, myVal, myErrMsg, "login.ejs", "/userhome", res);
    });

    app.get('/forgot', function (req, res) {
        res.render('forgotPassword.ejs', {message: req.flash('forgotPassMessage')});

    });

    app.post('/email', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let statement = "SELECT * FROM userlogin WHERE username = '" + req.body.username + "';";

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else if (results.length === 0) {
                res.json({"error": true, "message": "Please verify your email address !"});
            } else {
                let username = req.body.username;
                let subject = "Password Reset";
                let text = 'the reset of the password for your account.';
                let url = "http://" + req.headers.host + "/reset/";
                sendToken(username, subject, text, url, res);
            }
        });
    });

    app.post('/eauth', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let statement = "SELECT * FROM userlogin WHERE username = '" + req.user.username + "';";

        let password = generator.generateMultiple(1, {
            length: 8,
            uppercase: true,
            excludeSimilarCharacters: true,
            numbers: true,
            symbols:false
        });

        password = password.toString().toUpperCase();

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else if (results.length === 0) {
                res.json({"error": true, "message": "Please verify your email address !"});
            } else {
                res.render('EmailAuth.ejs', {
                    user: req.user,
                    Code: password
                });
                let username = req.user.username;
                let subject = "Email Authentication for CitySmart";
                let text = 'an email authentication for logging in your admin account.';
                let url = ""+ password +"";
                console.log(url);
                sendToken3(username, subject, text, url, res);
            }
        });
    });

    app.post('/kauth', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT question1, question2, answer1, answer2 FROM userlogin WHERE username = '" + req.user.username + "'";

        con_CS.query(myStat, function (err, result) {
            console.log("Here is the result:");
            console.log(result);
            console.log(result[0].question1);

            if (err) {
                res.send('An unexpected error occurred.');
            } else {
                res.render('KnowledgeAuth.ejs', {
                    user: req.user,
                    question1: result[0].question1,
                    question2: result[0].question2,
                    answer1: result[0].answer1,
                    answer2: result[0].answer2

                });
            }
        });

    });

    app.post('/pauth', function (req, res) {
        let phoneNumber;
        res.setHeader("Access-Control-Allow-Origin", "*");

        myStat = "SELECT Phone_Number FROM userprofile WHERE username = '" + req.user.username + "'";

        con_CS.query(myStat, function (err, result) {
            console.log("Here is the result:");
            console.log(result);
            console.log(result[0].Phone_Number);

            if(result[0].Phone_Number === "" || result[0].Phone_Number === "null" || result[0].Phone_Number === "NULL") {
                phoneNumber = "NULL";
            } else {
                phoneNumber = result[0].Phone_Number;
            }

            res.render('PhoneAuthP1.ejs', {
                user: req.user,
                Phone_Number: phoneNumber,

            });

        });

    });

    app.post('/pcode', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        let result = Object.keys(req.body).map(function (key) {
            return [String(key)];
        });


        console.log('The code was successfully generated');
        console.log(result[0]);

        let password = generator.generateMultiple(1, {
            length: 8,
            uppercase: true,
            excludeSimilarCharacters: true,
            numbers: true,
            symbols: false,
        });

        password = password.toString().toUpperCase();

        console.log('password');
        console.log(password);
        console.log(req.user.Phone_Number);

        text.sendText(result[0], " Your verification code:   " + password + "   will be valid for 3 minutes. Please enter the code into the provided field.", undefined, function(err) {
            if (err) {
                console.log(err);
                res.send("An error has occurred.");
            } else{
                res.render('PhoneAuthP2.ejs', {
                    user: req.user,
                    Code: password,
                    Phone_Number: req.body.Phone_Number
                });
            }
        });

    });

    app.get('/reset/:token', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT * FROM userlogin WHERE resetPasswordToken = '" + req.params.token + "'";

        con_CS.query(myStat, function (err, user) {
            dateNtime();

            if (!user || dateTime > user[0].resetPasswordExpires) {
                res.send('Password reset token is invalid or has expired. Please contact Administrator.');
            } else {
                res.render('reset.ejs', {
                    user: user[0]
                });
            }
        });
    });

    app.post('/reset/:token', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        async.waterfall([
            function (done) {

                myStat = "SELECT * FROM userlogin WHERE resetPasswordToken = '" + req.params.token + "'";

                con_CS.query(myStat, function (err, user) {
                    let userInfo = JSON.stringify(user, null, "\t");

                    if (!user) {
                        res.json({"error": true, 'message': 'Password reset token is invalid or has expired. Please contact Administrator.'});
                    } else {
                        let newPass = {
                            Newpassword: bcrypt.hashSync(req.body.NewPassword, null, null),
                            confirmPassword: bcrypt.hashSync(req.body.Confirmpassword, null, null)
                        };

                        let passReset = "UPDATE userlogin SET password = '" + newPass.Newpassword + "' WHERE resetPasswordToken = '" + req.params.token + "'";
                        con_CS.query(passReset, function (err, rows) {
                            if (err) {
                                console.log(err);
                                res.json({"error": true, "message": "New Password Insert Fail!"});
                            } else {
                                let username = req.body.username;
                                let subject = "Your password has been changed";
                                let text = 'Hello,\n\n' + 'This is a confirmation that the password for your account, ' + changeMail(username) + ' has just been changed.\n';
                                done(err, username, subject, text);
                            }
                        });
                    }

                });
            }, function (user, done, err) {

                let message = {
                    from: 'FTAA <aaaa.zhao@g.northernacademy.org>',
                    to: req.body.username,
                    subject: 'Your password has been changed',
                    text: 'Hello,\n\n' +
                        'This is a confirmation that the password for your account, ' + changeMail(req.body.username) + ' has just been changed.\n'
                };

                smtpTrans.sendMail(message, function (error) {
                    if (error) {
                        console.log(error.message);
                        // alert('Something went wrong! Please double check if your email is valid.');
                        return;
                    } else {
                        res.redirect('/login');
                    }
                });
            }
        ]);
    });

    //show the signout form
    app.get('/signout', function (req, res) {
        req.session.destroy();
        req.logout();
        res.redirect('/');
    });

    // =====================================
    // USER Home Section ===================
    // =====================================

    app.get('/userhome', isLoggedIn, function (req, res) {
        let myStat = "SELECT userrole FROM userlogin WHERE username = '" + req.user.username + "';";
        let state2 = "SELECT firstName, lastName FROM userprofile WHERE username = '" + req.user.username + "';"; //define last name

        con_CS.query(myStat + state2, function (err, results) {
            // console.log("Users: ");
            // console.log(results);

            if (err) throw err;

            if (!results[0][0].userrole) {
                console.log("Error2");
            } else if (!results[1][0].firstName) {
                console.log("Error1")
            } else {
                // console.log("Yes");
                // console.log(req.user);
                res.render('userHome.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[1][0].firstName,
                    lastName: results[1][0].lastName,
                });
            }
        });
    });


    // =====================================
    // REQUEST QUERY   =====================
    // =====================================

    // show the data history ejs
    app.get('/dataHistory', isLoggedIn, function (req, res) {

        let state2 = "SELECT firstName FROM userprofile WHERE username = '" + req.user.username + "';";

        con_CS.query(state2, function (err, results, fields) {
            // console.log(results);
            if (!results[0].firstName) {
                console.log("Error2");
            } else {
                res.render('dataHistory.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[0].firstName //get the firstName our of session ans pass to template
                });
            }
        });

    });

    app.get('/dateStuff', function(req,res){
        let start = Number(req.query.startDate.slice(5, 7)) - 1;

        start = req.query.startDate.slice(0, 4) + '-' + start + "-" + req.query.startDate.slice(8);
        let end = Number(req.query.endDate.slice(5, 7)) - 1;

        end = req.query.endDate.slice(0, 4) + '-' + end + "-" + req.query.endDate.slice(8);
        let statement = "SELECT * FROM timelog WHERE logDate >= ? AND logDate <= ? AND username = '" + req.user.username + "';"
        con_CS.query(statement, [start, end], function (err, result){
            res.json(result);
        })
    })

    app.get('/filterQuery', isLoggedIn, function (req, res) {
        // console.log(req.query);
        let start = Number(req.query.startDate.slice(5, 7)) - 1;

        start = req.query.startDate.slice(0, 4) + '-' + start + "-" + req.query.startDate.slice(8);
        let end = Number(req.query.endDate.slice(5, 7)) - 1;

        end = req.query.endDate.slice(0, 4) + '-' + end + "-" + req.query.endDate.slice(8);
        // console.log(start)
        let name = req.query.firstName;
        let sqlStat = "SELECT * FROM timelog WHERE logDate >= ? AND logDate <= ? AND username = ?;"
        con_CS.query(sqlStat, [start, end, name], function(err, result){
            res.json(result);
        })
    });

    // =====================================
    // USER PROFILE  =======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    // Show user profile page
    app.get('/profile', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let userN = req.query.userN;
        con_CS.query("SELECT * FROM userprofile WHERE username = '" + userN + "'; SELECT question1, answer1, question2, answer2 FROM userlogin WHERE username = '" + userN + "';", function (err, results) {
            if (err) throw err;
            res.json(results);
        })
    });

    app.post('/checkpassword',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let password = req.body.pass;
        let statement = "SELECT password FROM userlogin WHERE username = '" + req.body.username + "';";
        // console.log(password);
        // console.log(statement);
        // console.log(req.body.username);
        con_CS.query(statement,function (err,results) {
            res.json((!bcrypt.compareSync(password, results[0].password)));
        });
    });

    app.get('/userProfile', isLoggedIn, function (req, res) {
        res.render('userProfile.ejs', {
            user: req.user,
        });
        // console.log(req.user);
    });

    app.post('/userProfile', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        // new password (User Login)
        let user = req.user;
        let newPass = {
            currentpassword: req.body.CurrentPassword,
            Newpassword: bcrypt.hashSync(req.body.NewPassword, null, null),
            confirmPassword: bcrypt.hashSync(req.body.ConfirmNewPassword, null, null)
        };

        let passComp = bcrypt.compareSync(newPass.currentpassword, user.password);

        if (!!req.body.NewPassword && passComp) {
            let passReset = "UPDATE userlogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

            con_CS.query(passReset, function (err, rows) {
                if (err) {
                    console.log(err);
                    res.json({"error": true, "message": "Fail !"});
                } else {
                    // res.json({"error": false, "message": "Success !"});
                    basicInformation();
                }
            });
        } else {
            basicInformation();
        }

        // User Profile
        function basicInformation() {
            let result = Object.keys(req.body).map(function (key) {
                return [String(key), req.body[key]];
            });

            let update1 = "UPDATE userprofile SET ";
            let update2 = "";
            let update3 = " WHERE username = '" + req.user.username + "';";
            let update4 = "UPDATE userlogin SET ";
            let update5 = "";
            let update6 = " WHERE username = '" + req.user.username + "';";
            for (let i = 1; i < result.length - 7; i++) {
                if (i === result.length - 8) {
                    update2 += result[i][0] + " = '" + result[i][1] + "'";
                } else {
                    update2 += result[i][0] + " = '" + result[i][1] + "', ";
                }
            }
            for (let i = result.length - 7; i < result.length - 3; i++) {
                if (i === result.length - 4) {
                    update5 += result[i][0] + " = '" + result[i][1] + "'";
                } else {
                    update5 += result[i][0] + " = '" + result[i][1] + "', ";
                }
            }
            let statement1 = update1 + update2 + update3 + update4 + update5 + update6;

            con_CS.query(statement1, function (err, result) {
                if (err) {

                    res.json({"error": true, "message": "Fail !"});
                } else {
                    // res.json({"error": false, "message": "Success !"});
                    let oldname = req.user.username;
                    let newname = req.body.username;

                    if (newname !== oldname) {
                        let statement = "UPDATE userlogin SET PendingUsername = '"+ newname + "' WHERE username = '" + oldname + "';";
                        con_CS.query(statement, function (err,result) {
                            if (err) {
                                console.log(err);
                                res.json({"error": true, "message": "An unexpected error occurred !"});
                            } else if (result.length === 0) {
                                res.json({"error": true, "message": "Please verify your email address !"});
                            } else {
                                let username = newname;
                                let subject = "Email verify";
                                let text = 'to verify the new username(email).';
                                let url = "http://" + req.headers.host + "/verifyemail/";
                                sendname(username, subject, text, url, res);
                            }
                        });
                    } else {
                        res.json({"error": false, "message": "Success !"});
                    }
                }
            });
        }
    });

    // Update user profile page
    app.post('/newPass', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let user = req.user;
        let newPass = {
            // firstname: req.body.usernameF,
            // lastname: req.body.usernameL,
            currentpassword: req.body.CurrentPassword,
            Newpassword: bcrypt.hashSync(req.body.NewPassword, null, null),
            confirmPassword: bcrypt.hashSync(req.body.ConfirmNewPassword, null, null)
        };

        let passComp = bcrypt.compareSync(newPass.currentpassword, user.password);

        if (!!req.body.NewPassword && passComp) {
            let passReset = "UPDATE userlogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

            con_CS.query(passReset, function (err, rows) {
                if (err) {
                    console.log(err);
                    res.json({"error": true, "message": "Fail !"});
                } else {
                    res.json({"error": false, "message": "Success !"});
                }
            });
        }
    });


    // =====================================
    // USER MANAGEMENT =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    // Show user management bak page
    app.get('/userManagement', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        myStat = "SELECT userrole FROM userlogin WHERE username = '" + req.user.username + "';";
        let state2 = "SELECT firstName FROM userprofile WHERE username = '" + req.user.username + "';";

        con_CS.query(myStat + state2, function (err, results, fields) {

            if (!results[0][0].userrole) {
                console.log("Error2");
            } else if (!results[1][0].firstName) {
                console.log("Error1")
            } else if (results[0][0].userrole === "Admin" || "Regular") {
                // process the signup form
                res.render('userManagement.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[1][0].firstName
                });
            }
        });
    });

    // show the signup form
    app.get('/signup', function (req, res) {
        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', {
            message: req.flash('signupMessage')
        });
    });

    app.post('/signup', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        // con_CS.query('USE ' + serverConfig.Login_db); // Locate Login DB

        let newUser = {
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: bcrypt.hashSync(req.body.password, null, null),  // use the generateHash function
            userrole: req.body.userrole,
            phoneNumber: req.body.phoneNumber,
            question1: req.body.question1,
            question2: req.body.question2,
            answer1: req.body.answer1,
            answer2: req.body.answer2,
            dateCreated: req.body.dateCreated,
            createdUser: req.body.createdUser,
            dateModified: req.body.dateCreated,
            status: req.body.status
        };

        myStat = "INSERT INTO userlogin ( username, password, userrole, question1, question2, answer1, answer2, dateCreated, dateModified, createdUser, status) VALUES ( '" + newUser.username + "','" + newUser.password+ "','" + newUser.userrole+ "','" + newUser.question1+ "','" + newUser.question2+ "','" + newUser.answer1+ "','" + newUser.answer2+ "','" + newUser.dateCreated+ "','" + newUser.dateModified+ "','" + newUser.createdUser + "','" + newUser.status + "');";
        mylogin = "INSERT INTO userprofile ( username, firstName, lastName, Phone_Number) VALUES ('"+ newUser.username + "','" + newUser.firstName+ "','" + newUser.lastName + "','" + newUser.phoneNumber + "');";
        console.log("mystat");
        console.log(myStat);
        console.log(mylogin);
        con_CS.query(myStat + '' + mylogin, function (err, rows) {
            // newUser.id = rows.insertId;
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred!"});
            } else {
                let username = req.body.username;
                let subject = "Sign Up";
                let text = 'to sign up an account with this email.';
                let url = "http://" + req.headers.host + "/verify/";
                sendToken(username, subject, text, url, res);
                res.redirect('/login');
                // res.render('login.ejs', {
                //     message: req.flash('loginMessage'),
                //     error: "Your username and password don't match."
                // });
            }
        });
    });

    // show the addUser form
    app.get('/addUser', isLoggedIn, function (req, res) {
        // render the page and pass in any flash data if it exists
        res.render('adduser.ejs', {
            user: req.user,
            message: req.flash('addUserMessage')
        });
    });

    app.post('/addUser', isLoggedIn, function (req, res) {

        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        // connection.query('USE ' + serverConfig.Login_db); // Locate Login DB

        let newUser = {
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: bcrypt.hashSync(req.body.password, null, null),  // use the generateHash function
            userrole: req.body.userrole,
            dateCreated: req.body.dateCreated,
            createdUser: req.body.createdUser,
            dateModified: req.body.dateCreated,
            status: req.body.status
        };

        myStat = "INSERT INTO userlogin ( username, password, userrole, dateCreated, dateModified, createdUser, status) VALUES ( '" + newUser.username + "','" + newUser.password+ "','" + newUser.userrole+ "','" + newUser.dateCreated+ "','" + newUser.dateModified+ "','" + newUser.createdUser + "','" + newUser.status + "');";
        mylogin = "INSERT INTO userprofile ( username, firstName, lastName) VALUES ('"+ newUser.username + "','" + newUser.firstName+ "','" + newUser.lastName + "');";
        con_CS.query(myStat + mylogin, function (err, rows) {
            //newUser.id = rows.insertId;
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                res.json({"error": false, "message": "Success"});
            }
        });
    });

    app.get('/verify/:token', function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        async.waterfall([
            function(done) {
                myStat = "SELECT * FROM userlogin WHERE resetPasswordToken = '" + req.params.token + "'";
                con_CS.query(myStat, function(err, results) {
                    dateNtime();

                    if (results.length === 0 || dateTime > results[0].expires) {
                        res.send('Password reset token is invalid or has expired. Please contact Administrator.');
                    } else {
                        done(err, results[0].username);
                    }
                });
            }, function(username, done) {
                myStat = "UPDATE userlogin SET status = 'Never Logged In' WHERE username = '" + username + "';";

                con_CS.query(myStat, function(err, user) {
                    if (err) {
                        console.log(err);
                        res.send("An unexpected error occurred !");
                    } else {
                        let subject = "Account Activated";
                        let text = 'Hello,\n\n' + 'This is a confirmation for your account, ' + changeMail(username) + ' has just been activated.\n';
                        done(err, username, subject, text);
                    }

                });
            }, function(username, subject, text) {
                successMail(username, subject, text, res);
            }
        ]);
    });

    app.get('/verifyemail/:token', function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        async.waterfall([
            function(done) {
                myStat = "SELECT * FROM userlogin WHERE resetPasswordToken = '" + req.params.token + "'";
                con_CS.query(myStat, function(err, results) {
                    dateNtime();
                    if (results.length === 0 || dateTime > results[0].expires) {
                        res.send('Password reset token is invalid or has expired. Please contact Administrator.');
                    } else {
                        done(err, results[0].PendingUsername);
                    }
                });
            }, function(PendingUsername, done) {
                myStat = "UPDATE userlogin SET username = '"+ PendingUsername  + "', PendingUsername = '' WHERE PendingUsername = '"+ PendingUsername + "';";
                // mylogin = "UPDATE userlogin SET PendingUsername = '' WHERE PendingUsername = '" + PendingUsername + "';";
                let myProfile = "UPDATE userprofile SET username = '" + PendingUsername + "' WHERE username = '" + req.user.username + "';";
                con_CS.query(myStat + myProfile, function(err, user) {
                    if (err) {
                        console.log(err);
                        res.send("An unexpected error occurred !");
                    } else {
                        let subject = "Account Activated";
                        let text = 'Hello,\n\n' + 'This is a confirmation for your account, ' + changeMail(PendingUsername) + ' has just been activated.\n';
                        done(err, PendingUsername, subject, text);
                    }

                });
            }, function(username, subject, text) {
                successMail(username, subject, text, res);
            }
        ]);
    });

    app.get('/filterUser', isLoggedIn, function (req, res) {
        // res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT userprofile.*, userlogin.* FROM userlogin INNER JOIN userprofile ON userlogin.username = userprofile.username";

        let myQuery = [
            {
                fieldVal: req.query.dateCreatedFrom,
                dbCol: "dateCreated",
                op: " >= '",
                adj: req.query.dateCreatedFrom
            },
            {
                fieldVal: req.query.dateCreatedTo,
                dbCol: "dateCreated",
                op: " <= '",
                adj: req.query.dateCreatedTo
            },
            {
                fieldVal: req.query.dateModifiedFrom,
                dbCol: "dateModified",
                op: " >= '",
                adj: req.query.dateModifiedFrom
            },
            {
                fieldVal: req.query.dateModifiedTo,
                dbCol: "dateModified",
                op: " <= '",
                adj: req.query.dateModifiedTo
            },
            {
                fieldVal: req.query.userrole,
                dbCol: "userrole",
                op: " = '",
                adj: req.query.userrole
            },
            {
                fieldVal: req.query.firstName,
                dbCol: "firstName",
                op: " = '",
                adj: req.query.firstName
            },
            {
                fieldVal: req.query.lastName,
                dbCol: "lastName",
                op: " = '",
                adj: req.query.lastName
            },
            {
                fieldVal: req.query.status,
                dbCol: "status",
                op: " = '",
                adj: req.query.status
            },
            {
                fieldVal: req.query.Phone_Number,
                dbCol: "Phone_Number",
                op: " = '",
                adj: req.query.Phone_Number
            }
        ];

        QueryStat(myQuery, myStat, res);
    });

    // // Retrieve user data from user management page
    let edit_User, edit_firstName, edit_lastName, edit_userrole, edit_status, edit_city;
    app.get('/editUserQuery', isLoggedIn, function (req, res) {

        edit_User = req.query.Username;
        edit_firstName = req.query.First_Name;
        edit_city = req.query.City;
        edit_lastName = req.query.Last_Name;
        edit_userrole = req.query.User_Role;
        edit_status = req.query.status;

        res.json({"error": false, "message": "/editUser"});
    });

    app.post('/edituserform',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        // new password (User Login)
        let user = req.body.Username;
        //Converts array to string
        let editingUser = req.user.username;
        // let editingUserPassword = req.user.password;

        // basicInformation();

        // let user = req.user;
        let newPass = {
            // currentpassword: req.body.CurrentPassword,
            Newpassword: bcrypt.hashSync(req.body.NewPassword, null, null),
            confirmPassword: bcrypt.hashSync(req.body.ConfirmNewPassword, null, null)
        };

        // let passComp = bcrypt.compareSync(newPass.currentpassword, user.password);

        if (!!req.body.NewPassword) {
            let passReset = "UPDATE userlogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

            con_CS.query(passReset, function (err, rows) {
                if (err) {
                    console.log(err);
                    res.json({"error": true, "message": "Fail!"});
                } else {
                    // res.json({"error": false, "message": "Success !"});
                    basicInformation();
                }
            });
        } else {
            basicInformation();
        }

        // if(user === editingUser) {
        //     let newEditPass = {
        //         currentpassword: req.body.CurrentPassword,
        //         Newpassword: bcrypt.hashSync(req.body.NewPassword, null, null),
        //         confirmPassword: bcrypt.hashSync(req.body.ConfirmNewPassword, null, null)
        //     };
        //
        //
        //     let passComp = bcrypt.compareSync(newEditPass.currentpassword, editingUserPassword);
        //

        //
        //     // if (!!req.body.NewPassword) {
        //         let passAdminReset = "UPDATE userlogin SET password = '" + newEditPass.Newpassword + "' WHERE username = '" + user + "'";
        //
        //         con_CS.query(passAdminReset, function (err, rows) {
        //             if (err) {
        //                 console.log(err);
        //                 res.json({"error": true, "message": "Fail !"});
        //             } else {
        //                 // res.json({"error": false, "message": "Success !"});
        //                 basicInformation();
        //             }
        //         });
        //     } else {
        //         basicInformation();
        //     }
        // } else {
        //     let newPass = {
        //         Newpassword: bcrypt.hashSync(req.body.NewPassword, null, null),
        //         confirmPassword: bcrypt.hashSync(req.body.ConfirmNewPassword, null, null)
        // };


        // if (!!req.body.NewPassword) {
        //     let passReset = "UPDATE userlogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user + "'";
        //
        //     con_CS.query(passReset, function (err, rows) {
        //         if (err) {
        //             console.log(err);
        //             res.json({"error": true, "message": "Fail !"});
        //             res.json({"error": true, "message": err});
        //         } else {
        //             // res.json({"error": false, "message": "Success !"});
        //             basicInformation();
        //         }
        //     });
        // } else {
        //     basicInformation();
        // }
        // }

        function basicInformation() {
            let result = Object.keys(req.body).map(function (key) {
                return [String(key), req.body[key]];
            });
            console.log(result);

            // let update3 = " WHERE username = '" + req.user.username + "'";
            let statement1 = "UPDATE userlogin SET userrole = '" + result[3][1] + "',   status = '" + result[4][1] + "', dateModified = '" + result[5][1] + "', modifiedUser = '" + result[6][1] + "'  WHERE username = '" + result[0][1]+ "';";
            let statement2 = "UPDATE userprofile SET firstName = '" + result[1][1] + "', lastName = '" + result[2][1] + "' WHERE username = '" + result[0][1] + "';";
            con_CS.query(statement1 + statement2, function (err, result) {
                if (err) throw err;
                res.json(result);
            });
        }
    });

    // Show user edit form
    app.get('/editUser', isLoggedIn, function (req, res) {

        res.render('userEdit.ejs', {
            user: req.user, // get the user out of session and pass to template
            username: req.body.username,
            // firstName: edit_firstName,
            // lastName: edit_lastName,
            // userrole: edit_userrole,
            // status: edit_status,
            message: req.flash('Data Entry Message')
        });
    });

    app.post('/editUser', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        if (req.body.newPassword !== "") {
            let updatedUserPass = {
                firstName: req.body.First_Name,
                lastName: req.body.Last_Name,
                userrole: req.body.User_Role,
                status: req.body.Status,
                newPassword: bcrypt.hashSync(req.body.newPassword, null, null)
            };
            mylogin = "UPDATE userprofile SET firstName = ?, lastName = ?";
            myStat = "UPDATE userlogin SET password = ?, userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "' WHERE username = ?";

            myVal = [updatedUserPass.firstName, updatedUserPass.lastName, updatedUserPass.newPassword, updatedUserPass.userrole, updatedUserPass.status, edit_User];
            updateDBNres(myStat + mylogin, myVal, "Update failed!", "/userManagement", res);
        } else {
            let updatedUser = {
                firstName: req.body.First_Name,
                lastName: req.body.Last_Name,
                userrole: req.body.User_Role,
                status: req.body.Status
            };
            mylogin = "UPDATE userprofile SET firstName = ?, lastName = ?";
            myStat = "UPDATE userlogin SET userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "'  WHERE username = ?";

            myVal = [updatedUser.firstName, updatedUser.lastName, updatedUser.userrole, updatedUser.status, edit_User];
            updateDBNres(myStat + mylogin, myVal, "Update failed!", "/userManagement", res);
        }

    });

    app.get('/suspendUser', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        dateNtime();

        let username = req.query.usernameStr.split(","); //they receive the username string from client side

        myStat = "UPDATE userlogin SET modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "',  status = 'Suspended'";

        for (let i = 0; i < username.length; i++) {
            if (i === 0) {
                myStat += " WHERE username = '" + username[i] + "'";
                if (i === username.length - 1) {
                    updateDBNres(myStat, "", "Suspension failed!", "/userManagement", res);
                }
            } else {
                myStat += " OR username = '" + username[i] + "'"; //is this assuming they don't try to suspend a faulty account more than twice?
                if (i === username.length - 1) {
                    updateDBNres(myStat, "", "Suspension failed!", "/userManagement", res);
                }
            }
        }
    });

    app.get('/recovery', isLoggedIn, function (req, res) {
        let state2 = "SELECT firstName FROM userprofile WHERE username = '" + req.user.username + "';";
        con_CS.query(state2, function (err, results, fields) {
            if (!results[0].firstName) {
                console.log("Error2");
            } else {
                res.render('recovery.ejs', {
                    user: req.user,
                    message: req.flash('restoreMessage'),
                    firstName: results[0].firstName,
                    lastName:results[0].lastName
                });
            }
        });
    });

    // =====================================
    // REQUEST FORM SECTION =================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    // app.get('/UsernameV',function (req,res) {
    //     res.setHeader("Access-Control-Allow-Origin", "*");//
    //     let oldname = req.user.username;
    //     let newname = req.query.UNS;
    //     let statement = "UPDATE userlogin SET PendingUsername = '"+ newname + "' WHERE username = '" + oldname + "';";
    //     con_CS.query(statement, function (err,result) {
    //         if (err) {
    //             console.log(err);
    //             res.json({"error": true, "message": "An unexpected error occurred !"});
    //         } else if (result.length === 0) {
    //             res.json({"error": true, "message": "Please verify your email address !"});
    //         } else {
    //             let username = newname;
    //             let subject = "Email verify";
    //             let text = 'to verify the new username(email).';
    //             let url = "http://" + req.headers.host + "/verifyemail/";
    //             sendname(username, subject, text, url, res);
    //         }
    //     })
    //
    // });

    app.post('/inTime', function(req, res) {
        console.log(req.body);
        let bruh = req.body.send;
        let lmao = req.body.send1;
        console.log(bruh + "  " + lmao);
        let statement = "INSERT INTO timelog.timelog(username, logDate, inTime, outTime, timeLeft) VALUES ('" + req.user.username + "', (?), (?), NULL,'" + req.user.minutesLeft + "' )"
        con_CS.query(statement, [bruh, lmao], function(err){
            if (err){
                console.log(err);
            } else {
                console.log("Cool");
            }
        })
        res.json("lol");
    })

    app.post('/time', async function(req, res){
        //console.log(req.body.cool);
        let lol = req.body.cool;
        let time = req.body.lmao;
        let theDiff;
        let stat = 'You have logged an out time please refresh the page and if the \'hours needed\' does not change even though you think it should have please contact an admin'
        //let start = '00:00:00'
        //console.log(time);
        //console.log(lol);
        let statement = "UPDATE timelog.timelog SET outTime = (?) WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"
        let statement1 = "SELECT inTime FROM timelog.timelog WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"
        let update = "UPDATE timelog.userlogin SET minutesLeft = (minutesLeft - (?)) WHERE username = '" + req.user.username + "';"
        let diff = "UPDATE timelog.timelog SET timeDiff = timediff((?), (?)) WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"
        let diffSelect = "SELECT timeDiff FROM timelog.timelog WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"

        con_CS.query(statement1, lol, function (err, result) {
            if (err) {
                console.log(err);
            } else if (result.length == 0) {
                //res.json("error");
                stat = "An error occurred there may not be an in time"
                console.log("bruh");
                res.json(stat);
            } else {
                console.log(result.length);
                let start = result[0].inTime;
                con_CS.query(diff, [time, start, lol], function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        con_CS.query(diffSelect, lol, function (err, result) {
                            if (err) {
                                console.log(err);
                            } else {
                                theDiff = result[0].timeDiff;
                                let hMin = theDiff.slice(0, 2) * 60;
                                let mMin = theDiff.slice(3, 5);
                                let sMin = theDiff.slice(6) / 60;
                                let total = Number(hMin) + Number(mMin) + Number(sMin);
                                con_CS.query(update, total, function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        con_CS.query(statement, [time, lol], function (err) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                res.json(stat);
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    })

    app.get('/display', function(req, res){
        let statement = "SELECT minutesLeft FROM timelog.userlogin WHERE username = '" + req.user.username + "';"
        con_CS.query(statement, function(err, results){
            if(err){
                console.log (err);
            } else {
                res.json(results[0].minutesLeft);
            }
        })
    })

    // =====================================
    // Others  =============================
    // =====================================
    app.get('Cancel', function (req, res) {
        res.redirect('/userHome');
        res.render('userHome', {
            user: req.user // get the user out of session and pass to template
        });
    });


// Customized Functions Below
    function isLoggedIn(req, res, next) {

        // if user is authenticated in the session, carry on
        if (req.isAuthenticated())
            return next();

        // if they aren't redirect them to the bak page
        res.redirect('/');
    }

    function dateNtime() {
        today = new Date();
        date2 = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        time2 = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        dateTime = date2 + ' ' + time2;
    }

    function tokenExpTime() {
        today = new Date();
        date3 = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + (today.getDate() + 1);
        time3 = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        tokenExpire = date3 + ' ' + time3;
    }

    function updateDBNres(SQLstatement, Value, ErrMsg, targetURL, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        con_CS.query(SQLstatement, Value, function (err, rows) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": ErrMsg});
            } else {
                res.json({"error": false, "message": targetURL});
            }
        })
    }

    function updateDBNredir(SQLstatement, Value, ErrMsg, failURL, redirURL, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        con_CS.query(SQLstatement, Value, function (err, rows) {
            if (err) {
                console.log(err);
                res.render(failURL, {message: req.flash(ErrMsg)});
            } else {
                res.redirect(redirURL);
                // render the page and pass in any flash data if it exists
            }
        })
    }

    function QueryStat(myObj, sqlStat, res) {
        let j = 0;
        let NewsqlStat = sqlStat;
        let aw;
        for (let i = 0; i < myObj.length; i++) {
            if (!!myObj[i].adj){

                if (j === 0) {
                    aw = " WHERE ";
                    j = 1;
                } else {
                    aw = " AND ";
                }

                sqlStat = editStat(sqlStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal); //scoutingStat is initial statement and the rest says if the column equals the value

                if (i === myObj.length - 1) {
                    NewsqlStat = sqlStat + "; ";
                    console.log(NewsqlStat);
                    dataList(NewsqlStat, res);
                }
            } else {
                // console.log(aw);
                if (i === myObj.length - 1) {
                    NewsqlStat = sqlStat + "; ";
                    // console.log(NewsqlStat);
                    dataList(NewsqlStat, res);
                }
            }
        }

        function editStat(stat, aw, dbCol, op, fieldVal) {
            stat += aw + dbCol + op + fieldVal + "'";
            return stat;
        }
    }

    function dataList(sqlStatement, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        // console.log("SQL:");
        console.log("SQL:" + sqlStatement);
        con_CS.query(sqlStatement, function (err, results) {

            if (err) {
                console.log(err);
                res.json({"errMsg": "fail"});
            } else if (results.length === 0) {
                res.json({"errMsg": "no data"});
            } else {
                res.json(results)
            }
        });
    }

    function changeMail(str) {
        let spliti = str.split("@");
        let letter1 = spliti[0].substring(0, 1);
        let letter2 = spliti[0].substring(spliti[0].length - 1, spliti[0].length);
        let newFirst = letter1;
        for (i = 0; i < spliti[0].length - 2; i++) {
            newFirst += "*";
        }
        newFirst += letter2;

        let letter3 = spliti[1].substring(0, 1);
        let extension = letter3;
        for (i = 0; i < spliti[1].split(".")[0].length - 1; i++) {
            extension += "*";
        }
        extension += "." + spliti[1].split(".")[1];
        let result = newFirst + "@" + extension;

        return result;
    }

    function sendToken(username, subject, text, url, res) {
        async.waterfall([
            function(done) {
                crypto.randomBytes(20, function(err, buf) {
                    token = buf.toString('hex');
                    tokenExpTime();
                    done(err, token, tokenExpire);
                });
            },
            function (token, tokenExpire, done) {
                myStat = "UPDATE userlogin SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE username = '" + username + "' ";
                myVal = [token, tokenExpire];
                con_CS.query(myStat, myVal, function (err, rows) {

                    if (err) {
                        console.log(err);
                        res.json({"error": true, "message": "Token Insert Fail !"});
                    } else {
                        done(err, token);
                    }
                });
            },
            function(token, done, err) {
                // Message object
                const message = {
                    from: 'FTAA <aaaa.zhao@g.northernacademy.org>', // sender info
                    to: username, // Comma separated list of recipients
                    subject: subject, // Subject of the message

                    // // plaintext body
                    // text: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                    //     'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    //     url + token + '\n\n' +
                    //     'If you did not request this, please ignore this email.\n'
                    html: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        '<p><a href="' + url + token + '" >'+ url + token + '</a></p>' + '\n\n' +
                        'If you did not request this, please ignore this email.\n'
                };

                smtpTrans.sendMail(message, function(error){
                    console.log("token: ");
                    console.log(message)
                    if(error){
                        console.log(error.message);
                        res.json({"error": true, "message": "An unexpected error occurred !"});
                    } else {
                        res.json({"error": false, "message": "Message sent successfully !"});
                        // alert('An e-mail has been sent to ' + req.body.username + ' with further instructions.');
                    }
                });
            }
        ], function(err) {
            if (err) return next(err);
            // res.redirect('/forgot');
            res.json({"error": true, "message": "An unexpected error occurred !"});
        });
    }

    function sendToken3(username, subject, text, url, res) {
        async.waterfall([

            function(done) {
                // Message object
                const message = {
                    from: 'FTAA <aaaa.zhao@g.northernacademy.org>', // sender info
                    to: username, // Comma separated list of recipients
                    subject: subject, // Subject of the message

                    // // plaintext body
                    // text: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                    //     'Please user the following code to complete the authentication:\n\n' +
                    //     url +'\n\n' +
                    //     'If you did not request this, please ignore this email.\n'
                    html: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        '<p><a href="' + url + token + '" >'+ url + token + '</a></p>' + '\n\n' +
                        'If you did not request this, please ignore this email.\n'

                };

                smtpTrans.sendMail(message, function(error){
                    console.log("token3: ");
                    console.log(message)
                    if(error){
                        console.log(error.message);
                        res.json({"error": true, "message": "An unexpected error occurred !"});
                    } else {
                        res.json({"error": false, "message": "Message sent successfully !"});
                        // alert('An e-mail has been sent to ' + req.body.username + ' with further instructions.');
                    }
                });
            }
        ], function(err) {
            if (err) return next(err);
            // res.redirect('/forgot');
            res.json({"error": true, "message": "An unexpected error occurred !"});
        });
    }

    function sendname(username, subject, text, url, res){
        async.waterfall([
            function(done) {
                crypto.randomBytes(20, function(err, buf) {
                    token = buf.toString('hex');
                    tokenExpTime();
                    done(err, token, tokenExpire);
                });
            },
            function (token, tokenExpire, done) {
                myStat = "UPDATE userlogin SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE PendingUsername = '" + username + "' ";
                myVal = [token, tokenExpire];
                con_CS.query(myStat, myVal, function (err, rows) {

                    if (err) {
                        console.log(err);
                        res.json({"error": true, "message": "Token Insert Fail !"});
                    } else {
                        done(err, token);
                    }
                });
            },
            function(token, done, err) {
                // Message object
                const message = {
                    from: 'FTAA <aaaa.zhao@g.northernacademy.org>', // sender info
                    to: username, // Comma separated list of recipients
                    subject: subject, // Subject of the message
                    // plaintext body
                    html: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        '<p><a href="' + url + token + '" >'+ url + token + '</a></p>' + '\n\n' +
                        'If you did not request this, please ignore this email.\n'
                };

                smtpTrans.sendMail(message, function(error){
                    console.log("sendname: ");
                    console.log(message)

                    if(error){
                        console.log(error.message);
                        res.json({"error": true, "message": "An unexpected error occurred !"});
                    } else {
                        res.json({"error": false, "message": "Message sent successfully !"});
                        // alert('An e-mail has been sent to ' + req.body.username + ' with further instructions.');
                    }
                });
            }
        ], function(err) {
            if (err) return next(err);
            res.json({"error": true, "message": "An unexpected error occurred !"});
        });
    }

    function successMail(username, subject, text, res) {
        const message = {
            from: 'FTAA <aaaa.zhao@g.northernacademy.org>',
            to: username,
            subject: subject,
            text: text
        };

        smtpTrans.sendMail(message, function (error) {
            if(error){
                console.log(error.message);
            } else {
                res.render('success.ejs', {});
            }
        });
    }
};
