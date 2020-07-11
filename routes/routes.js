// routes/routes.js
const mysql = require('mysql');
const bodyParser = require('body-parser');
const serverConfig = require('../config/serverConfig');
// const fs = require("fs");
// const fsextra = require('fs-extra');
const request = require("request");
const bcrypt = require('bcrypt-nodejs');
const nodemailer = require('nodemailer');
const cors = require('cors');
const async = require('async');
const crypto = require('crypto');
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const multiparty = require('multiparty');
const path    = require('path');
// const ExpressBrute = require('express-brute');
const rateLimit = require("express-rate-limit");
const text = require('textbelt');
const generator = require('generate-password');

// const store = new ExpressBrute.MemoryStore(); // stores state locally, don't use this in production
// const bruteforce = new ExpressBrute(store);

const geoServer = serverConfig.geoServer;
const Download_From = serverConfig.Download_From;

const copySource = path.resolve(__dirname, serverConfig.Download_To); //the path of the source file
const copyDestDir = path.resolve(__dirname, serverConfig.Backup_Dir);
const num_backups = serverConfig.num_backups;
const download_interval = serverConfig.download_interval;

const Approve_Dir = path.resolve(__dirname, "../" + serverConfig.Approve_Dir);
const Pending_Dir = path.resolve(__dirname, "../" + serverConfig.Pending_Dir);
const Reject_Dir = path.resolve(__dirname, "../" + serverConfig.Reject_Dir);
const Delete_Dir = path.resolve(__dirname, "../" + serverConfig.Delete_Dir);

const fileInputName = process.env.FILE_INPUT_NAME || "qqfile";
const maxFileSize = process.env.MAX_FILE_SIZE || 0; // in bytes, 0 for unlimited

const con_CS = mysql.createConnection(serverConfig.commondb_connection);
const smtpTrans = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'aaaa.zhao@g.northernacademy.org',
        pass: "qwer1234"
    }
});

const Limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
});

let exec = require('child_process').exec;
let transactionID, myStat, myVal, myErrMsg, token, errStatus, mylogin;
let today, date2, date3, time2, time3, dateTime, tokenExpire, child;
let downloadFalse = null ;

con_CS.query('USE ' + serverConfig.Login_db); // Locate Login DB

module.exports = function (app, passport) {

    removeFile();
    setInterval(copyXML, download_interval); // run the function one time a (day

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(cors({
        origin: '*',
        credentials: true
    }));

    app.use(Limiter);

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

    app.get('/homepageLI', isLoggedIn, function (req, res) {
        let myStat = "Select userrole From UserLogin WHERE username = ? ;";
        let state = "SELECT firstName FROM UserProfile WHERE username = ? ;";
        con_CS.query(myStat + state, [req.user.username, req.user.username], (err, results) => {
            if (!results[0][0].userrole) {
                console.log("User Role is missing!");
            } else if (!results[1][0].firstName) {
                console.log("First Name is missing!")
            } else {
                res.render('homepageUSER.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[1][0].firstName
                });
            }
        });
    });

    app.get('/position',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let layername = req.query.layername;
        let parsedLayers = layername.split(",");
        // console.log("Parsed Layers: ");
        // console.log(parsedLayers);

        con_CS.query('SELECT LayerName, Longitude, Latitude, Altitude, ThirdLayer FROM LayerMenu WHERE LayerName = ?', parsedLayers[0], function (err, results) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "no result found!"});
            } else {
                res.json(results);
            }
        });
        // con_CS.query("SELECT LayerName, Longitude, Latitude, Altitude, ThirdLayer FROM LayerMenu Where LayerName = ?", parsedLayers[0], function (err, results) {
        //     console.log (results);
        //     res.json({"Longitude": results[0].Longitude, "Latitude" : results[0].Latitude, "Altitude" : results[0].Altitude, "ThirdLayer": results[0].ThirdLayer, "LayerName":results[0].LayerName});
        // })
    });

    app.get('/csPK', function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let select = "SELECT * FROM CitySmart2.LayerMenu WHERE LayerType = 'CS_PKLayer'";
        con_CS.query( select, function (err, result) {
            if (err) { throw err }
            else { res.json({"err": false, "data": result})}
        });
    });

    app.get('/currentLayer',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let thirdlayer = req.query.thirdlayer;
        let queryState = 'SELECT FirstLayer, SecondLayer, ThirdLayer, Longitude, Latitude, Altitude FROM LayerMenu WHERE ThirdLayer = ?';
        con_CS.query(queryState, thirdlayer, function (err, results) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                res.json(results);
                // console.log(results);
            }
        });
    });

    app.get('/firstLayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT FirstLayer FROM LayerMenu WHERE Status ='Approved' GROUP BY FirstLayer ", function (err, result) {
            // let JSONresult = JSON.stringify(result, null, "\t");
            if (err) { throw err } else {
                res.json(result);
            }
        });
    });

    app.get('/secondLayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let firstlayerValue = req.query.FirstLayer;
        con_CS.query("SELECT SecondLayer,FirstLayer FROM LayerMenu WHERE Status ='Approved' and FirstLayer =? GROUP BY SecondLayer", firstlayerValue ,function (err, result) {
            // let JSONresult = JSON.stringify(result, null, "\t");
            if (err) { throw err } else {
                res.json(result);
            }
        });

    });

    app.get('/thirdLayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let secondLayerValue = req.query.SecondLayer;
        con_CS.query("SELECT LayerType,SecondLayer,ThirdLayer,CityName,StateName,CountryName, GROUP_CONCAT(LayerName) as LayerName FROM LayerMenu WHERE Status ='Approved' and SecondLayer =? GROUP BY ThirdLayer,CityName,StateName,CountryName,SecondLayer,LayerType", secondLayerValue ,function (err, result) {
            // let JSONresult = JSON.stringify(result, null, "\t");
            //All layer?
            //WHERE cityname = ''?
            if (err) { throw err } else {
                res.json(result);
            }
        });
    });

    app.get('/mrdsDataP', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        let commodity = req.query.layerName;
        let commodity2 = commodity.split("_");

        let commName = commodity2[2];

        //Converts array to string
        let statement = "SELECT * FROM mrds_sample WHERE commod1 LIKE '" + commName +"' OR commod2 LIKE '" + commName +"' OR commod3 LIKE '" + commName +"';";

        con_CS.query(statement, function (err, result) {
            if (err) throw err;
            res.json({"error": false, "commN": result});
        });

    });

    app.get('/mrdsData', function (req, res) {
        // console.log( "A: " + new Date());

        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        // let statement = "SELECT p_name, xlong, ylat, p_year_color, p_avgcap_color, t_ttlh_color FROM USWTDB INNER JOIN USWTDB_COLOR ON USWTDB.case_id = USWTDB_COLOR.case_id ORDER BY p_name;";
        let statement = "SELECT url, mrds_id, site_name, latitude, longitude, country, state, dev_stat, commod1, commod2, commod3 FROM mrds_sample;";

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                res.json({"error": false, "data": results});
            }
        });
    });

    app.get('/placemarktP', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        let commodity = req.query.layerName;
        let commodity2 = commodity.split("_");

        let commName = commodity2[2];
        console.log(commName);

        //Converts array to string
        let statement = "SELECT * FROM Mineral_Deposits WHERE commodity LIKE '" + commName +"';";

        con_CS.query(statement, function (err, result) {
            if (err) throw err;
            res.json({"error": false, "commN": result});
        });

    });

    app.get('/placemarkt', function (req, res) {
        // console.log( "A: " + new Date());

        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        // let statement = "SELECT p_name, xlong, ylat, p_year_color, p_avgcap_color, t_ttlh_color FROM USWTDB INNER JOIN USWTDB_COLOR ON USWTDB.case_id = USWTDB_COLOR.case_id ORDER BY p_name;";
        let statement = "SELECT * FROM Mineral_Deposits;";

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                // console.log("success: " + new Date());
                // console.log(results);
                res.json({"error": false, "data": results});
            }
        });
    });


    app.get('/placemarkt', function (req, res) {
        // console.log("A: " + new Date());

        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        // var statement = "SELECT p_name, xlong, ylat, p_year_color, p_avgcap_color, t_ttlh_color FROM USWTDB INNER JOIN USWTDB_COLOR ON USWTDB.case_id = USWTDB_COLOR.case_id ORDER BY p_name;";
        var statement = "SELECT * FROM Mineral_Deposits;";

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                // console.log("success: " + new Date());
                // console.log(results);
                res.json({"error": false, "data": results});
            }
        });
    });


    // app.get('/request',function (req,res) {
    //     res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
    //     res.render('login.ejs');
    // });

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

        myStat = "UPDATE UserLogin SET status = 'Active', lastLoginTime = ? WHERE username = ?";
        myVal = [dateTime, req.user.username];
        myErrMsg = "Please try to login again";
        updateDBNredir(myStat, myVal, myErrMsg, "login.ejs", "/userhome", res);
    });

    app.get('/forgot', function (req, res) {
        res.render('forgotPassword.ejs', {message: req.flash('forgotPassMessage')});

    });

    app.post('/email', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let statement = "SELECT * FROM UserLogin WHERE username = '" + req.body.username + "';";

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
        let statement = "SELECT * FROM UserLogin WHERE username = '" + req.user.username + "';";

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

        myStat = "SELECT question1, question2, answer1, answer2 FROM UserLogin WHERE username = '" + req.user.username + "'";

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

        myStat = "SELECT Phone_Number FROM UserProfile WHERE username = '" + req.user.username + "'";

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





    app.get('/emailRequest', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let requester = req.query.requester;
        console.log("Email request initiated");
        console.log(requester);

        let statement = "SELECT username FROM UserLogin WHERE userrole = 'Admin';";

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(statement + "ERROR");
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else if (results.length === 0) {
                console.log(statement);
                res.json({"error": true, "message": "Please verify your email address !"});
            } else {
                console.log(requester);
                let username = 'julial.zhu@g.feitianacademy.org';
                let subject = "New User Request By " + requester;
                let text = 'requested to publish a new layer.';
                let url = "http://" + req.headers.host + "/userhome/";
                sendToken2(username, subject, text, url, res);
            }
        });
    });

    app.get('/reset/:token', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT * FROM UserLogin WHERE resetPasswordToken = '" + req.params.token + "'";

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

                myStat = "SELECT * FROM UserLogin WHERE resetPasswordToken = '" + req.params.token + "'";

                con_CS.query(myStat, function (err, user) {
                    let userInfo = JSON.stringify(user, null, "\t");

                    if (!user) {
                        res.json({"error": true, 'message': 'Password reset token is invalid or has expired. Please contact Administrator.'});
                    } else {
                        let newPass = {
                            Newpassword: bcrypt.hashSync(req.body.NewPassword, null, null),
                            confirmPassword: bcrypt.hashSync(req.body.Confirmpassword, null, null)
                        };

                        let passReset = "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE resetPasswordToken = '" + req.params.token + "'";
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
        let myStat = "SELECT userrole FROM UserLogin WHERE username = '" + req.user.username + "';";
        let state2 = "SELECT firstName, lastName FROM UserProfile WHERE username = '" + req.user.username + "';"; //define last name

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

    app.get('/deleteRow', isLoggedIn, function (req, res) { //this is what I have been experiencing thus far
        del_recov("Deleted", "Deletion failed!", "/userHome", req, res);
    });

    // function del_recov(StatusUpd, ErrMsg, targetURL, req, res) {
    //
    //     transactionID = req.query.transactionIDStr.split(",");
    //     // console.log(transactionID);
    //     let statementGeneral = "UPDATE Request_Form SET Current_Status = '" + StatusUpd + "'"; //this is where the problem is
    //
    //     for (let i = 0; i < transactionID.length; i++) {
    //         if (i === 0) {
    //             statementGeneral += " WHERE RID = '" + transactionID[i] + "'";
    //             // statementDetailedS += " WHERE transactionID = '" + transactionID[i] + "'";
    //             // statementDetailedT += " WHERE transactionID = '" + transactionID[i] + "'";
    //
    //             if (i === transactionID.length - 1) {
    //                 statementGeneral += ";";
    //                 // statementDetailedS += ";";
    //                 // statementDetailedT += ";";
    //                 myStat = statementGeneral;
    //                 updateDBNres(myStat, "", ErrMsg, targetURL, res);
    //             }
    //         } else {
    //             statementGeneral += " OR RID = '" + transactionID[i] + "'";
    //             // statementDetailedS += " OR transactionID = '" + transactionID[i] + "'";
    //             // statementDetailedT += " OR transactionID = '" + transactionID[i] + "'";
    //
    //             if (i === transactionID.length - 1) {
    //                 statementGeneral += ";";
    //                 // statementDetailedS += ";";
    //                 // statementDetailedT += ";";
    //                 myStat = statementGeneral;
    //                 updateDBNres(myStat, "", ErrMsg, targetURL, res);
    //             }
    //         }
    //     }
    // }

    // function updateDBNres(SQLstatement, Value, ErrMsg, targetURL, res) {
    //     res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
    //     con_CS.query(SQLstatement, Value, function (err, rows) {
    //         if (err) {
    //             console.log(err);
    //             res.json({"error": true, "message": ErrMsg});
    //         } else {
    //             res.json({"error": false, "message": targetURL});
    //         }
    //     })
    // }
    //Copy the record directly to Layer Menu if the PStatus was approved.

    app.get('/recoverRow', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let pictureStr = req.query.pictureStr.split(',');
        let transactionPrStatusStr = req.query.transactionStatusStr.split(',');
        let layerNameStr = req.query.layerName.split(',');

        // mover folder
        for(let i = 0; i < pictureStr.length; i++) {//the length of pictureStr and Prior_status may not be the same since some layer may not have picture with it
            console.log("tran:"+transactionPrStatusStr[i]);

            if(transactionPrStatusStr[i] === 'NULL'){
                if(i===pictureStr.length-1){
                    res.json({"error": true, "message": "Recover Failed, error occur,Prior Statue undefined"});
                }

            }

            if (transactionPrStatusStr[i] === 'Pending') {
                console.log('pending');

                fs.rename(''+ Delete_Dir + '/' + pictureStr[i] + '' , '' + Pending_Dir + '/' + pictureStr[i] + '', function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Recovery process is successful");
                    }
                });

                // del_recov("Pending", "Recover Failed!", "/userHome", req, res);

                let statementpractice = "UPDATE Request_Form SET Layer_Uploader = ?, Current_Status = 'Pending' WHERE ThirdLayer = ?;";
                // console.log(statementpractice);
                // let statement1 = "UPDATE Request_Form SET Current_Status = 'Delete' WHERE ThirdLayer = '" + layerNameStr[i]  + "';";

                con_CS.query(statementpractice, [Pending_Dir, layerNameStr[i]], (err, results)=> {
                    if(i ===pictureStr.length - 1){
                        if (err) {
                            throw err;
                            // console.log(err);
                            // res.json({"error": true, "message": "Recover Failed"});
                        } else {
                            res.json({"error": false, "message": "Recover successful, jump to UserHome"});
                        }
                    }
                });
            }

            if(transactionPrStatusStr[i] === 'Approved'){
                console.log('Approved');

                fs.rename(''+ Delete_Dir + '/' + pictureStr[i] + '' , '' + Approve_Dir + '/' + pictureStr[i] + '', function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Recovery process is successful");
                    }
                });

                // del_recov("Approved", "Recover Failed!", "/userHome", req, res);

                let statement1 = "UPDATE Request_Form SET Layer_Uploader = 'approvedfolder/',Current_Status = 'Approved' WHERE ThirdLayer ='"+ layerNameStr[i] +"';";
                let statement2 = "UPDATE LayerMenu SET Status = 'Approved' WHERE ThirdLayer = '" + layerNameStr[i]  + "';";
                console.log(statement2);
                console.log('statement: '+statement1+statement2);
                console.log(i);
                console.log(pictureStr.length);
                con_CS.query(statement1+statement2, function (err, results) {
                    if(i === pictureStr.length - 1){
                        console.log('last one');
                        if (err) {
                            throw err;
                            // res.json({"error": true, "message": "Recover Failed"});
                        } else {
                            res.json({"error": false, "message": "Recover successful, jump to UserHome"});
                        }
                    }
                    // res.json(results[i]);
                });
            }
            //
            if(transactionPrStatusStr[i] === 'Rejected'){

                console.log('reject');
                fs.rename(''+ Delete_Dir + '/' + pictureStr[i] + '' , '' + Reject_Dir + '/' + pictureStr[i] + '', function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Recovery process is successful");
                    }
                });

                // let statement = "UPDATE Request_Form SET Layer_Uploader = 'rejectfolder/',Current_Status = 'Rejected' WHERE ThirdLayer ='"+ layerNameStr[i] +"';";
                let statement = "UPDATE Request_Form SET Layer_Uploader = 'rejectfolder/',Current_Status = 'Rejected' WHERE ThirdLayer = ?;";

                // let statement2 = "SELECT * FROM LayerMenu WHERE ThirdLayer = '" + layerNameStr[i]  + "';";

                // let statement3 = "UPDATE LayerMenu SET Status = 'Rejected' WHERE ThirdLayer in (SELECT LayerName FROM LayerMenu WHERE ThirdLayer = ?);";
                let statement3 = "UPDATE LayerMenu SET Status = 'Rejected' WHERE ThirdLayer = ?";
                // console.log(statement3);
                con_CS.query(statement+ statement3, [layerNameStr[i],layerNameStr[i]] , function (err, results) {

                    if(i === pictureStr.length - 1){
                        if (err) {
                            throw err
                            // res.json({"error": true, "message": "Recover Failed, err"});
                        } else {
                            res.json({"error": false, "message": "Recover successful, go to UserHome"});
                        }
                    }
                });
            }
        }
    });


    // =====================================
    // REQUEST QUERY   =====================
    // =====================================

    // show the data history ejs
    app.get('/dataHistory', isLoggedIn, function (req, res) {

        let state2 = "SELECT firstName FROM UserProfile WHERE username = '" + req.user.username + "';";

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

    app.get('/disapprove',function (req,res) { //maybe this is the successful server side code for record deletion; should ask Mr.Anson
        res.setHeader("Access-Control-Allow-Origin", "*");
        let transactionID = req.query.transactionIDStr.split(',');
        let pictureStr = req.query.pictureStr.split(',');
        let LayerName = req.query.LayerName.split(',');
        for (let i = 0; i < transactionID.length; i++) {
            let statement = "UPDATE Request_Form SET Current_Status = 'Rejected', Layer_Uploader_name = '" + pictureStr[i] + "' WHERE RID = '" + transactionID[i] + "';";
            let statement1 = "UPDATE LayerMenu SET Status = 'Disapproved' WHERE ThirdLayer = '" + LayerName  + "';";
            fs.rename(''+ Approve_Dir + '/' + pictureStr[i] + '' , '' + Pending_Dir + '/' + pictureStr[i] + '',  function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Rejected successfully!");
                }
            });
            con_CS.query(statement + statement1, function (err, results) {
                if (err) throw err;
                res.json(results[i]);
            });
        }
    });

    // app.get('/filterQuery', isLoggedIn, function (req, res) {
    //     // console.log(req.query);
    //     let sqlStat = "SELECT UserProfile.firstName, UserProfile.lastName, Request_Form.* FROM Request_Form INNER JOIN UserProfile ON UserProfile.username = Request_Form.UID";
    //     let myQueryObj = [ //change everything because we need to make sure it matches what we want to happen in client side
    //         {
    //             fieldVal: req.query.firstName,
    //             dbCol: "firstName",
    //             op: " = '",
    //             adj: req.query.firstName,
    //             table: 1
    //         },
    //         {
    //             fieldVal: req.query.lastName,
    //             dbCol: "lastName",
    //             op: " = '",
    //             adj: req.query.lastName,
    //             table: 1
    //         },
    //         {
    //             fieldVal: req.query.startDate,
    //             dbCol: "date",
    //             op: " >= '",
    //             adj: req.query.startDate,
    //             table: 1
    //         },
    //         {
    //             fieldVal: req.query.endDate,
    //             dbCol: "date",
    //             op: " <= '",
    //             adj: req.query.endDate,
    //             table: 1
    //         },
    //         {
    //             fieldVal: req.query.Current_Status1,
    //             dbCol: req.query.Current_Status,
    //             op: " = '",
    //             adj: req.query.Current_Status1,
    //             table: req.query.filter1
    //         },
    //         {
    //             fieldVal: req.query.Current_Status2,
    //             dbCol: req.query.Current_Status,
    //             op: " = '",
    //             adj: req.query.Current_Status2,
    //             table: req.query.filter2
    //         },
    //         {
    //             fieldVal: req.query.UID,
    //             dbCol: req.query.UID,
    //             op: " = '",
    //             adj: req.query.UID,
    //             table: req.query.filter3
    //         }
    //     ];
    //     QueryStat(myQueryObj, sqlStat, res)
    // });

    app.get('/stuff', function(req, res){
        let sqlStat = "SELECT * FROM timelog WHERE username = '" + req.user.username + "';"
        con_CS.query(sqlStat, function(err, result){
            res.json(result);
        })
    })

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
        console.log(req.query);
        let start = Number(req.query.startDate.slice(5, 7)) - 1;

        start = req.query.startDate.slice(0, 4) + '-' + start + "-" + req.query.startDate.slice(8);
        let end = Number(req.query.endDate.slice(5, 7)) - 1;

        end = req.query.endDate.slice(0, 4) + '-' + end + "-" + req.query.endDate.slice(8);
        console.log(start)
        let name = req.query.firstName;
        let sqlStat = "SELECT * FROM timelog WHERE logDate >= ? AND logDate <= ? AND username = ?;"
        con_CS.query(sqlStat, [start, end, name], function(err, result){
            res.json(result);
        })
        //let sqlStat = "SELECT username, logDate, inTime, outTime, timeLeft, timeDiff * FROM timelog WHERE username = '" + req.user.username + "';";
        // let myQueryObj = [ //change everything because we need to make sure it matches what we want to happen in client side
        //     {
        //         fieldVal: req.query.username,
        //         dbCol: "username",
        //         op: " = '",
        //         adj: req.query.username,
        //         table: 1
        //     },
        //     {
        //         fieldVal: req.query.inTime,
        //         dbCol: "inTime",
        //         op: " = '",
        //         adj: req.query.inTime,
        //         table: 1
        //     },
        //     {
        //         fieldVal: req.query.startDate,
        //         dbCol: "date",
        //         op: " >= '",
        //         adj: req.query.startDate,
        //         table: 1
        //     },
        //     {
        //         fieldVal: req.query.endDate,
        //         dbCol: "date",
        //         op: " <= '",
        //         adj: req.query.endDate,
        //         table: 1
        //     },
        //     {
        //         fieldVal: req.query.outTime,
        //         dbCol: req.query.outTime,
        //         op: " = '",
        //         adj: req.query.outTime,
        //         table: req.query.outTime
        //     },
        //     {
        //         fieldVal: req.query.timeDiff,
        //         dbCol: req.query.timeDiff,
        //         op: " = '",
        //         adj: req.query.timeDiff,
        //         table: req.query.timeDiff
        //     },
        //     {
        //         fieldVal: req.query.timeLeft,
        //         dbCol: req.query.timeLeft,
        //         op: " = '",
        //         adj: req.query.timeLeft,
        //         table: req.query.timeLeft
        //     }
        // ];
        // QueryStat(myQueryObj, sqlStat, res)
    });


    app.get('/layerReqQuery', isLoggedIn, function (req, res) {
        console.log('Layer query: ');
        console.log(req.query);
        let iniStat = "SELECT * FROM Request_Form";
        let myQueryObj = [ //change everything because we need to make sure it matches what we want to happen in client side
            //one big object that stores everything and the QueryStat creates the full statement request//work to display everything in User Home
            {
                fieldVal: req.query.UID,
                dbCol: "UID",
                op: " = '",
                adj: req.query.UID,
                // table: 1
            },
            {
                fieldVal: req.query.Current_Status,
                dbCol: "Current_Status",
                op: " = '",
                adj: req.query.Current_Status,
                // table: 1
            },
            {
                fieldVal: req.query.firstName,
                dbCol: "firstName",
                op: " = '",
                adj: req.query.firstName,
                // table: req.query.filter2
            },
            {
                fieldVal: req.query.lastName,
                dbCol: "lastName",
                op: " = '",
                adj: req.query.lastName,
                // table: req.query.filter3
            },
            {
                fieldVal: req.query.startDate,
                dbCol: "date",
                op: " >= '",
                adj: req.query.startDate,
                // table: 1
            },
            {
                fieldVal: req.query.endDate,
                dbCol: "date",
                op: " <= '",
                adj: req.query.endDate,
                // table: 1
            }
        ];
        // console.log("MyQueryObj: ");
        // console.log(myQueryObj);
        QueryStat(myQueryObj, iniStat, res)
        //this loop creates the exact statement depending on request; it tells the conditions for different pages and different required conditions
        //we do not need UID b/c empty so we just use Date

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
        con_CS.query("SELECT * FROM UserProfile WHERE username = '" + userN + "'; SELECT question1, answer1, question2, answer2 FROM UserLogin WHERE username = '" + userN + "';", function (err, results) {
            if (err) throw err;
            res.json(results);
        })
    });

    app.post('/checkpassword',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let password = req.body.pass;
        let statement = "SELECT password FROM UserLogin WHERE username = '" + req.body.username + "';";
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
            let passReset = "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

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

            let update1 = "UPDATE UserProfile SET ";
            let update2 = "";
            let update3 = " WHERE username = '" + req.user.username + "';";
            let update4 = "UPDATE UserLogin SET ";
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
                        let statement = "UPDATE UserLogin SET PendingUsername = '"+ newname + "' WHERE username = '" + oldname + "';";
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
            let passReset = "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

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

        myStat = "SELECT userrole FROM UserLogin WHERE username = '" + req.user.username + "';";
        let state2 = "SELECT firstName FROM UserProfile WHERE username = '" + req.user.username + "';";

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

        myStat = "INSERT INTO UserLogin ( username, password, userrole, question1, question2, answer1, answer2, dateCreated, dateModified, createdUser, status) VALUES ( '" + newUser.username + "','" + newUser.password+ "','" + newUser.userrole+ "','" + newUser.question1+ "','" + newUser.question2+ "','" + newUser.answer1+ "','" + newUser.answer2+ "','" + newUser.dateCreated+ "','" + newUser.dateModified+ "','" + newUser.createdUser + "','" + newUser.status + "');";
        mylogin = "INSERT INTO UserProfile ( username, firstName, lastName, Phone_Number) VALUES ('"+ newUser.username + "','" + newUser.firstName+ "','" + newUser.lastName + "','" + newUser.phoneNumber + "');";
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

        myStat = "INSERT INTO UserLogin ( username, password, userrole, dateCreated, dateModified, createdUser, status) VALUES ( '" + newUser.username + "','" + newUser.password+ "','" + newUser.userrole+ "','" + newUser.dateCreated+ "','" + newUser.dateModified+ "','" + newUser.createdUser + "','" + newUser.status + "');";
        mylogin = "INSERT INTO UserProfile ( username, firstName, lastName) VALUES ('"+ newUser.username + "','" + newUser.firstName+ "','" + newUser.lastName + "');";
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
                myStat = "SELECT * FROM UserLogin WHERE resetPasswordToken = '" + req.params.token + "'";
                con_CS.query(myStat, function(err, results) {
                    dateNtime();

                    if (results.length === 0 || dateTime > results[0].expires) {
                        res.send('Password reset token is invalid or has expired. Please contact Administrator.');
                    } else {
                        done(err, results[0].username);
                    }
                });
            }, function(username, done) {
                myStat = "UPDATE UserLogin SET status = 'Never Logged In' WHERE username = '" + username + "';";

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
                myStat = "SELECT * FROM UserLogin WHERE resetPasswordToken = '" + req.params.token + "'";
                con_CS.query(myStat, function(err, results) {
                    dateNtime();
                    if (results.length === 0 || dateTime > results[0].expires) {
                        res.send('Password reset token is invalid or has expired. Please contact Administrator.');
                    } else {
                        done(err, results[0].PendingUsername);
                    }
                });
            }, function(PendingUsername, done) {
                myStat = "UPDATE UserLogin SET username = '"+ PendingUsername  + "', PendingUsername = '' WHERE PendingUsername = '"+ PendingUsername + "';";
                // mylogin = "UPDATE UserLogin SET PendingUsername = '' WHERE PendingUsername = '" + PendingUsername + "';";
                let myProfile = "UPDATE UserProfile SET username = '" + PendingUsername + "' WHERE username = '" + req.user.username + "';";
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

    //AddData to table
    app.get('/AddData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT * FROM Request_Form', function (err, results) {
            if (err) throw err;
            res.json(results);
            //there are no filters here so the whole table shows up in client side
            //this means in server side we should filter
        })
    });
    // Filter by search criteria
    app.get('/filterUser', isLoggedIn, function (req, res) {
        // res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT UserProfile.*, UserLogin.* FROM UserLogin INNER JOIN UserProfile ON UserLogin.username = UserProfile.username";

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
            let passReset = "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

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
        //         let passAdminReset = "UPDATE UserLogin SET password = '" + newEditPass.Newpassword + "' WHERE username = '" + user + "'";
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
        //     let passReset = "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user + "'";
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
            let statement1 = "UPDATE UserLogin SET userrole = '" + result[3][1] + "',   status = '" + result[4][1] + "', dateModified = '" + result[5][1] + "', modifiedUser = '" + result[6][1] + "'  WHERE username = '" + result[0][1]+ "';";
            let statement2 = "UPDATE UserProfile SET firstName = '" + result[1][1] + "', lastName = '" + result[2][1] + "' WHERE username = '" + result[0][1] + "';";
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
            mylogin = "UPDATE UserProfile SET firstName = ?, lastName = ?";
            myStat = "UPDATE UserLogin SET password = ?, userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "' WHERE username = ?";

            myVal = [updatedUserPass.firstName, updatedUserPass.lastName, updatedUserPass.newPassword, updatedUserPass.userrole, updatedUserPass.status, edit_User];
            updateDBNres(myStat + mylogin, myVal, "Update failed!", "/userManagement", res);
        } else {
            let updatedUser = {
                firstName: req.body.First_Name,
                lastName: req.body.Last_Name,
                userrole: req.body.User_Role,
                status: req.body.Status
            };
            mylogin = "UPDATE UserProfile SET firstName = ?, lastName = ?";
            myStat = "UPDATE UserLogin SET userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "'  WHERE username = ?";

            myVal = [updatedUser.firstName, updatedUser.lastName, updatedUser.userrole, updatedUser.status, edit_User];
            updateDBNres(myStat + mylogin, myVal, "Update failed!", "/userManagement", res);
        }

    });

    app.get('/suspendUser', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        dateNtime();

        let username = req.query.usernameStr.split(","); //they receive the username string from client side

        myStat = "UPDATE UserLogin SET modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "',  status = 'Suspended'";

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
        let state2 = "SELECT firstName FROM UserProfile WHERE username = '" + req.user.username + "';";
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

    app.post('/upload', onUpload);

    app.post('/submit', function (req, res) {
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });
        res.setHeader("Access-Control-Allow-Origin", "*");

        let update1 = "UPDATE UserProfile SET ";
        let update2 = "";
        let update3 = " WHERE username = '" + req.user.username + "'";
        for (let i = 0; i < result.length - 3; i++) {
            if (i === result.length - 4) {
                update2 += result[i][0] + " = '" + result[i][1] + "'";
            } else {
                update2 += result[i][0] + " = '" + result[i][1] + "', ";
            }
        }
        let statement1 = update1 + update2 + update3;

        con_CS.query(statement1, function (err, result) {
            if (err) {
                throw err;
            } else {
                res.json("Connected!")
            }
        });
    });

    app.get('/UsernameV',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");//
        let oldname = req.user.username;
        let newname = req.query.UNS;
        let statement = "UPDATE UserLogin SET PendingUsername = '"+ newname + "' WHERE username = '" + oldname + "';";
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
        })

    });

    //Submit Request form//
    app.post('/submitL', function (req, res) {
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });

        res.setHeader("Access-Control-Allow-Origin", "*");

        let name = "";
        let valueSubmit = "";

        for (let i = 0; i < result.length; i++) {
            if (i === result.length - 1) {
                name += result[i][0];
                valueSubmit += '"' + result[i][1] + '"';
            } else {
                name += result[i][0] + ", ";
                valueSubmit += '"' + result[i][1] + '"' + ", ";
            }
        }
        let newImage = {
            Layer_Uploader: Pending_Dir + "/",
            Layer_Uploader_name: responseDataUuid
        };
        name += ", Layer_Uploader, Layer_Uploader_name";
        valueSubmit += ", '" + newImage.Layer_Uploader + "','" + newImage.Layer_Uploader_name + "'";
        let filepathname = Pending_Dir + "/" + responseDataUuid;

        let statement2 = "INSERT INTO Request_Form (" + name + ") VALUES (" + valueSubmit + ");";
        let statement = "UPDATE Request_Form SET ThirdLayer = '" + result[7][1] + "' WHERE RID = '" + result[1][1] + "';";
        console.log('statement2&1');
        console.log(statement2);
        console.log(statement);

        con_CS.query(statement2 + statement, function (err, result) {
            if (err) {
                throw err;
            } else {
                res.json("Connected!")
            }
        });
    });

    app.get('/RID', isLoggedIn, function (req, res) {
    });

    //Request ID
    app.get('/newRequest', isLoggedIn, function (req, res) {
        let d = new Date();
        let utcDateTime = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2);
        let queryRID = "SELECT COUNT(RID) AS number FROM Special_ID WHERE RID LIKE '" + utcDateTime + "%';";

        con_CS.query(queryRID, function (err, results, fields) {
            RID = utcDateTime + "_" + ('000' + (results[0].number + 1)).slice(-4);
            if (err) {
                console.log(err);
            } else {
                let insertRID = "INSERT INTO Special_ID (RID, UID) VALUE (" + "'" + RID + "', '" + req.user + "');";

                con_CS.query(insertRID, function (err, results, fields) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.render('LayerRequestForm.ejs', {
                            user: req.user, // get the user out of session and pass to template
                            RID: RID
                        });
                    }
                });
            }
        });
    });

    //Request form layer category//
    app.get('/MainCategory', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT FirstLayer, SecondLayer FROM LayerCategories GROUP BY FirstLayer, SecondLayer", function (err, results) {
            if (err) throw err;
            res.json(results);
        });
    });

    //thr submit function for regular users
    app.post('/rsubmit',function (req,res) {
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });
        res.setHeader("Access-Control-Allow-Origin", "*");
        let status = req.body.status;

        let update1 = "UPDATE Request_Form SET " ;
        let update3 = " WHERE RID = '" + result[1][1] + "';";
        let update2 = "";

        for (let i = 0; i < result.length; i++) {
            if (i === result.length - 1) {
                update2 += result[i][0] + " = '" + result[i][1]+ "'";
            } else {
                update2 += result[i][0] + " = '" + result[i][1] + "', " ;
            }
        }
        let Layer_Uploader = Pending_Dir + "/" + responseDataUuid;
        let Layer_Uploader_name = responseDataUuid;
        // let filepathname = Pending_Dir + "/" + responseDataUuid;
        let statement1 = update1+update2+update3;
        let statement2 = "UPDATE Request_Form SET Layer_Uploader = '" + Layer_Uploader + "', Layer_Uploader_name = '" + Layer_Uploader_name + "';";
        let statement3 = "UPDATE Request_Form SET ThirdLayer = '" + result[7][1] + "' WHERE RID = '" + result[1][1] + "';";
        let statement4 = "UPDATE Request_Form SET Current_Status = 'Pending' WHERE RID = '" + result[1][1] + "'";
        if(status === "Reject"){
            con_CS.query(statement1 + statement2 + statement3 + statement4, function (err, result) {
                if (err) {
                    throw err;
                } else {
                    res.json("Connected!")
                }
            });
        }else{
            con_CS.query(statement1 + statement2 + statement3, function (err, result) {
                if (err) {
                    throw err;
                } else {
                    res.json("Connected!")
                }
            });
        }

    });

    //check if the layer name is available
    app.get('/SearchLayerName', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT LayerName FROM Request_Form", function (err, results) {
            if (err) throw err;
            res.json(results);
        });
    });

    app.get('/SearchUsername', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT username FROM CitySmart2.UserLogin", function (err, results) {
            if (err) throw err;
            res.json(results);
        });
    });

    app.get('/SearchThirdLayer',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT ThirdLayer FROM Request_Form", function (err, results) {
            if (err) throw err;
            res.json(results);

        });
    });

    app.delete("/deleteFiles/:uuid", onDeleteFile1);
    app.delete("/deleteFiles",onDeleteFile2);

    let geoName = "";
    app.get('/approve', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let approveIDStr = req.query.tID;
        let approvepictureStr = req.query.LUN.split(',');
        let format = req.query.lForm;
        let fName = req.query.fName;
        let layerName;

        console.log("RID: " + approveIDStr);

        let myState1 = "UPDATE Request_Form SET Current_Status = 'Approved' WHERE RID = '" + approveIDStr + "'";


        // mover folder
        for(let i = 0; i < approvepictureStr.length; i++) {
            fs.rename(''+ Pending_Dir +'/' + approvepictureStr[i] + '' , '' + Approve_Dir + '/' + approvepictureStr[i] + '',  function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Approval success");
                }
            });
            con_CS.query(myState1, function (err, results) {
                if (err) throw err;
                // console.log(results);

                if (format === "ShapeFile") {
                    console.log("name of file: " + approvepictureStr[0]);
                    let type = "Content-type: application/zip";
                    let datastore = "datastore" + fName;

                    let uploadStat1 = "curl -u julia:123654 -v -XPUT -H '" + type + "' --data-binary @approvedfolder/" + approvepictureStr[0] + " " + geoServer + "rest/workspaces/Approved/datastores/" + datastore +"/file.shp";

                    child = exec(uploadStat1,
                        function (error, stdout, stderr) {
                            console.log(uploadStat1);
                            console.log('stdout: ' + stdout);
                            console.log('stderr: ' + stderr);
                            if (error !== null) {
                                console.log('exec error: ' + error);
                            } else {
                                setTimeout( function () {
                                    let uploadStat2 = "curl -u julia:123654 -v -XGET " + geoServer + "rest/workspaces/Approved/datastores/" + datastore + "/featuretypes.json";
                                    let jsonF;
                                    child = exec(uploadStat2,
                                        function (error, stdout, stderr) {
                                            console.log(uploadStat2);
                                            console.log('stdout: ' + stdout);
                                            console.log('stderr: ' + stderr);

                                            jsonF = JSON.parse(stdout);
                                            if (error !== null) {

                                                console.log('exec error: ' + error);
                                            } else {
                                                setTimeout( function () {
                                                    layerName = "Approved:" + jsonF.featureTypes.featureType[0].name;
                                                    console.log(layerName);
                                                    geoName = layerName;
                                                    // let lname = jsonF.featureTypes.featureType[0].name;

                                                    let myState2 = "UPDATE Request_Form SET LayerName = '" + geoName +"' WHERE RID = '" + approveIDStr + "';";
                                                    let myState3 = "UPDATE LayerMenu SET LayerName = '" + geoName +"' WHERE RID = '" + approveIDStr + "'";

                                                    con_CS.query(myState2 + myState3, function (err, results) {
                                                        if (err) {
                                                            throw err;
                                                        } else {
                                                            setTimeout( function () {
                                                                //res.json(results);
                                                                let uploadStat3 = "curl -u julia:123654 -v -H 'Accept: text/xml' -XGET -H 'Content-type: text/json' " + geoServer + "rest/workspaces/Approved/datastores/" + datastore + "/featuretypes/"+ jsonF.featureTypes.featureType[0].name +".json";
                                                                let jsonL;
                                                                child = exec(uploadStat3,
                                                                    function (error, stdout, stderr) {
                                                                        console.log(uploadStat3);
                                                                        console.log('stdout: ' + stdout);
                                                                        console.log('stderr: ' + stderr);

                                                                        jsonL = JSON.parse(stdout);
                                                                        if (error !== null) {

                                                                            console.log('exec error: ' + error);
                                                                        } else {
                                                                            let minx, maxx, miny, maxy, avgx, avgy;
                                                                            minx = jsonL.featureType.latLonBoundingBox.minx;
                                                                            maxx = jsonL.featureType.latLonBoundingBox.maxx;
                                                                            miny = jsonL.featureType.latLonBoundingBox.miny;
                                                                            maxy = jsonL.featureType.latLonBoundingBox.maxy;
                                                                            avgx = (minx + maxx)/2;
                                                                            avgy = (miny + maxy)/2;
                                                                            console.log(minx);
                                                                            console.log(maxx);
                                                                            console.log(avgx);
                                                                            console.log(miny);
                                                                            console.log(maxy);
                                                                            console.log(avgy);

                                                                            let myState4 = "UPDATE LayerMenu SET Latitude = '" + avgy +"', Longitude = '" + avgx +"', Altitude = '1' WHERE RID = '" + approveIDStr + "'";

                                                                            con_CS.query(myState4, function (err, results) {
                                                                                if (err) {
                                                                                    throw err;
                                                                                } else {
                                                                                    //res.json(results);
                                                                                }
                                                                            });
                                                                        }}, 5000);
                                                            });
                                                        }}, 5000);
                                                });

                                            }}, 5000);
                                });
                            }
                        });
                } else if (format === "GeoTIFF") {
                    console.log("name of file: " + approvepictureStr[0]);
                    let fileName = approvepictureStr[0].slice(0, -4);
                    type = "Content-type: text/plain";
                    let coveragestore = "coveragestore" + fName;

                    let uploadStat4 = "curl -u julia:123654 -v -XPUT -H '" + type + "' -d 'file:/var/www/cs/v2/approvedfolder/" + approvepictureStr[0] + "' " + geoServer + "rest/workspaces/Approved/coveragestores/" + coveragestore +"/external.geotiff";

                    child = exec(uploadStat4,
                        function (error, stdout, stderr) {
                            console.log(uploadStat4);
                            console.log('stdout: ' + stdout);
                            console.log('stderr: ' + stderr);
                            if (error !== null) {
                                console.log('exec error: ' + error);
                            } else {
                                setTimeout( function () {
                                    let statement = "curl -u julia:123654 -v -XGET " + geoServer + "rest/workspaces/Approved/coveragestores/" + coveragestore + "/coverages/" + fileName + ".json";
                                    let jsonF;
                                    child = exec(statement,
                                        function (error, stdout, stderr) {
                                            console.log(statement);
                                            console.log('stdout: ' + stdout);
                                            console.log('stderr: ' + stderr);

                                            jsonF = JSON.parse(stdout);
                                            if (error !== null) {

                                                console.log('exec error: ' + error);
                                            } else {
                                                layerName = "Approved:" + jsonF.coverage.name;
                                                console.log(layerName);

                                                let minx, maxx, miny, maxy, avgx, avgy;
                                                minx = jsonF.coverage.latLonBoundingBox.minx;
                                                maxx = jsonF.coverage.latLonBoundingBox.maxx;
                                                miny = jsonF.coverage.latLonBoundingBox.miny;
                                                maxy = jsonF.coverage.latLonBoundingBox.maxy;
                                                avgx = (minx + maxx)/2;
                                                avgy = (miny + maxy)/2;
                                                console.log(minx);
                                                console.log(maxx);
                                                console.log(avgx);
                                                console.log(miny);
                                                console.log(maxy);
                                                console.log(avgy);

                                                let statementNext = "UPDATE Request_Form SET LayerName = '" + layerName +"' WHERE RID = '" + approveIDStr + "';";
                                                let statementNext2 = "UPDATE LayerMenu SET LayerName = '" + layerName +"' WHERE RID = '" + approveIDStr + "';";
                                                let statementNext3 = "UPDATE LayerMenu SET Latitude = '" + avgy +"', Longitude = '" + avgx +"', Altitude = '1' WHERE RID = '" + approveIDStr + "';";

                                                con_CS.query(statementNext + statementNext2 + statementNext3, function (err, results) {
                                                    if (err) {
                                                        throw err;
                                                    } else {
                                                        console.log("Here are the statements: "+statementNext + statementNext2 + statementNext3);
                                                        //res.json(results);
                                                        // let statement = "curl -u julia:123654 -v -H 'Accept: text/xml' -XGET -H 'Content-type: text/json' " + geoServer + "rest/workspaces/Approved/datastores/" + datastore + "/featuretypes/"+ lname +".json";
                                                        // let jsonL;
                                                        // child = exec(statement,
                                                        //     function (error, stdout, stderr) {
                                                        //         console.log(statement);
                                                        //         console.log('stdout: ' + stdout);
                                                        //         console.log('stderr: ' + stderr);
                                                        //
                                                        //         jsonL = JSON.parse(stdout);
                                                        //         if (error !== null) {
                                                        //
                                                        //             console.log('exec error: ' + error);
                                                        //         } else {
                                                        //             let minx, maxx, miny, maxy, avgx, avgy;
                                                        //             minx = jsonL.featureType.nativeBoundingBox.minx;
                                                        //             maxx = jsonL.featureType.nativeBoundingBox.maxx;
                                                        //             miny = jsonL.featureType.nativeBoundingBox.miny;
                                                        //             maxy = jsonL.featureType.nativeBoundingBox.maxy;
                                                        //             avgx = (minx + maxx)/2;
                                                        //             avgy = (miny + maxy)/2;
                                                        //             console.log(minx);
                                                        //             console.log(maxx);
                                                        //             console.log(avgx);
                                                        //             console.log(miny);
                                                        //             console.log(maxy);
                                                        //             console.log(avgy);
                                                        //
                                                        //             let statementNext3 = "UPDATE LayerMenu SET Latitude = '" + avgy +"', Longitude = '" + avgx +"' WHERE RID = '" + approveIDStr + "'";
                                                        //
                                                        //             con_CS.query(statementNext3, function (err, results) {
                                                        //                 if (err) {
                                                        //                     throw err;
                                                        //                 } else {
                                                        //                     //res.json(results);
                                                        //                 }
                                                        //             });
                                                        //         }
                                                        //     });
                                                    }
                                                });

                                            }}, 5000);
                                });
                            }
                        });
                }

                res.json(results[i]);
            });
        }
    });

    app.post('/testB', function (req, res) {
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });

        console.log(result);

        let statement = "curl -u julia:123654 -v -XPUT -H 'Content-type: text/plain' -d 'file:data_dir/data/Approved/coveragestore/marbles.tif' " + geoServer + "rest/workspaces/Approved/coveragestore/newCov2/external.geotiff";
        // let jsonF;
        child = exec(statement,
            function (error, stdout, stderr) {
                console.log(statement);
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);

                // jsonF = JSON.parse(stdout);
                if (error !== null) {

                    console.log('exec error: ' + error);
                } else {
                    // console.log(jsonF.featureTypes.featureType[0].name);
                }
            });

    });

    app.post('/replace', function (req, res) { //puts everything from a request form into LayerMenu once it has been approved
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });

        console.log('result');
        console.log(result);
        res.setHeader("Access-Control-Allow-Origin", "*");

        let update1 = "UPDATE Request_Form SET " ;
        let update3 = " WHERE RID = '" + result[1][1] + "';";
        let update2 = "";
        // let layerName;
        // let datastore = "datastore" + result[7][1];
        //
        console.log(update1);
        console.log(update3);
        // console.log(datastore);
        // console.log(result[6][1]);
        // console.log(result[7][1]);
        // console.log(datastore);
        //
        for (let i = 0; i < result.length; i++) {
            if (i === result.length - 1) {
                update2 += result[i][0] + " = '" + result[i][1]+ "'";
            } else {
                update2 += result[i][0] + " = '" + result[i][1] + "', " ;
            }
        }

        let Layer_Uploader = Pending_Dir + "/" + responseDataUuid;
        let Layer_Uploader_name = responseDataUuid;
        let filepathname = Pending_Dir + "/" + responseDataUuid;
        let statement1 = update1+update2+update3;
        let statement2 = "UPDATE Request_Form SET Layer_Uploader = '" + Layer_Uploader + "', Layer_Uploader_name = '" + result[14][1] + "' WHERE RID = '" + result[1][1] + "';";
        let statement3 = "UPDATE Request_Form SET ThirdLayer = '" + result[8][1] + "' WHERE RID = '" + result[1][1] + "';";
        //
        console.log('s1');
        console.log(statement1);
        console.log("statement2");
        console.log(statement2);
        console.log(statement3);
        if(result[3][1] === "other"){
            let statement = " INSERT INTO LayerMenu (LayerName, LayerType, FirstLayer, SecondLayer, ThirdLayer, Picture_Location, ContinentName, CountryName, StateName, CityName, Site_Description, Status, RID) VALUES ('" + result[7][1] + "', 'WmsLayer', '" + result[4][1] + "','" + result[6][1] + "','" + result[8][1] + "','" + result[14][1] + "','" + result[9][1] + "','" + result[10][1] + "','" + result[11][1] + "','" + result[12][1] + "','" + result[13][1] + "', 'Approved', '" + result[1][1] + "') ON DUPLICATE KEY UPDATE LayerName ='" + result[7][1] + "', FirstLayer = '" + result[4][1] + "', SecondLayer = '" + result[6][1] + "', ThirdLayer = '" + result[8][1] + "', Picture_Location = '" + result[14][1] + "', Status = 'Approved'; ";
            con_CS.query(statement1 + statement + statement2 + statement3, function (err, result) {
                console.log(statement);
                if (err) {
                    throw err;
                } else {
                    res.json("Connected!");
                }
            });
        }else{
            let statement = " INSERT INTO LayerMenu (LayerName, LayerType, FirstLayer, SecondLayer, ThirdLayer, Picture_Location, ContinentName, CountryName, StateName, CityName, Site_Description, Status, RID) VALUES ('" + result[7][1] + "', 'WmsLayer', '" + result[3][1] + "','" + result[5][1] + "','" + result[8][1] + "','" + result[14][1] + "','" + result[9][1] + "','" + result[10][1] + "','" + result[11][1] + "','" + result[12][1] + "','" + result[13][1] + "', 'Approved', '" + result[1][1] + "') ON DUPLICATE KEY UPDATE LayerName ='" + result[7][1] + "', FirstLayer = '" + result[3][1] + "', SecondLayer = '" + result[5][1] + "', ThirdLayer = '" + result[8][1] + "', Picture_Location = '" + result[14][1] + "', Status = 'Approved'; ";
            con_CS.query(statement1 + statement + statement2 + statement3, function (err, result) {
                console.log(statement);
                if (err) {
                    throw err;
                } else {
                    res.json("Connected!");
                }
            });
        }
        // mv('/uploadfolder', 'dest/file', {mkdirp: true}, {clobber: false}, function(err) {
        //     //This is supposed to do the following:
        //     //Tries fs.rename first, then falls back to
        //     // piping the source file to the dest file (destination)  then unlinking
        //     // the source file.
        // });
    });

    app.get('/reject',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let rejectID = req.query.reject;
        let comment = req.query.comment;
        let pictureStr = req.query.picturePath.split(',');

        let statement = "UPDATE Request_Form SET Current_Status = 'Rejected', Comments = '" + comment + "' WHERE RID = '" + rejectID + "';";
        let statement2 = "UPDATE LayerMenu SET Status = 'Rejected' WHERE ThirdLayer = '" + rejectID  + "';";

        console.log(statement + statement2);

        con_CS.query(statement + statement2,function (err,results) {
            if (err) {
                console.log(err);
                // res.json({"error": true, "message": "Reject Failed"});
            } else {
                res.json({"error": false, "message": "Reject successful, jump to UserHome"});
            }
        });


        for (let i = 0; i< pictureStr.length; i++) {

            fs.rename('' + Pending_Dir + '/' + pictureStr[i] + '', '' + Reject_Dir + '/' + pictureStr[i] + '', function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Reject process is successful");
                }
            });
        }
    });

    app.post('/add', function(req, res) {
        console.log(req.body);
        let min = (Number(req.body.hours) * 60) + Number(req.body.minutes);
        let diff = req.body.hours + ":" + req.body.minutes + ":00";
        let initial = "SELECT * FROM timelog WHERE username = '" + req.body.user + "';"
        let statement = "INSERT INTO timelog(username, logDate, inTime, outTime, timeLeft, timeDiff, method) VALUES ('" + req.body.user + "','" + req.body.day + "', '00:00:00', '00:00:00', ('" + req.user.minutesLeft + "' + ?), ?, 'added')"
        let statement1 = "UPDATE citysmart2.userlogin SET minutesLeft = (minutesLeft + (?)) WHERE username = '" + req.body.user + "';"
        con_CS.query(initial, function(err, result){
            if(err){
                console.log(err);
            } else if(result.length < 1){
                res.json('There were no logs with that username please make sure you have entered it correctly');
            } else {
                con_CS.query(statement, [min, diff], function(err, result){
                    if(err){
                        console.log(err);
                    } else {
                        console.log('cool');
                        con_CS.query(statement1, min, function(err){
                            if(err){
                                console.log(err);
                            } else {
                                console.log('my guy');
                                res.json("successfully added hours to user's log");
                            }
                        })
                    }
                })
            }
        })
    })

    app.post('/remove', function(req, res){
        console.log(req.body);
        let min = (Number(req.body.hours) * 60) + Number(req.body.minutes);
        let diff = req.body.hours + ":" + req.body.minutes + ":00";
        let initial = "SELECT * FROM timelog WHERE username = '" + req.body.user + "';"
        let statement = "INSERT INTO timelog(username, logDate, inTime, outTime, timeLeft, timeDiff, method) VALUES ('" + req.body.user + "','" + req.body.day + "', '00:00:00', '00:00:00', ('" + req.user.minutesLeft + "' - ?), ?, 'removed')"
        let statement1 = "UPDATE citysmart2.userlogin SET minutesLeft = (minutesLeft - (?)) WHERE username = '" + req.body.user + "';"
        con_CS.query(initial, function(err, result){
            if(err){
                console.log(err);
            } else if(result.length < 1){
                res.json('There were no logs with that username please make sure you have entered it correctly');
            } else {
                con_CS.query(statement, [min, diff], function(err, result){
                    if(err){
                        console.log(err);
                    } else {
                        console.log('cool');
                        con_CS.query(statement1, min, function(err){
                            if(err){
                                console.log(err);
                            } else {
                                console.log('my guy');
                                res.json("successfully removed hours from user's log");
                            }
                        })
                    }
                })
            }
        })
    })

    app.post('/inTime', function(req, res) {
        console.log(req.body);
        let bruh = req.body.send;
        let lmao = req.body.send1;
        console.log(bruh + "  " + lmao);
        let statement = "INSERT INTO citysmart2.timelog(username, logDate, inTime, outTime, timeLeft) VALUES ('" + req.user.username + "', (?), (?), NULL,'" + req.user.minutesLeft + "' )"
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
        let statement = "UPDATE citysmart2.timelog SET outTime = (?) WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"
        let statement1 = "SELECT inTime FROM citysmart2.timelog WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"
        let update = "UPDATE citysmart2.userlogin SET minutesLeft = (minutesLeft - (?)) WHERE username = '" + req.user.username + "';"
        let diff = "UPDATE citysmart2.timelog SET timeDiff = timediff((?), (?)) WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"
        let diffSelect = "SELECT timeDiff FROM citysmart2.timelog WHERE outTime IS NULL AND logDate = (?) AND username = '" + req.user.username + "';"

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
        let statement = "SELECT minutesLeft FROM citysmart2.userlogin WHERE username = '" + req.user.username + "';"
        con_CS.query(statement, function(err, results){
            if(err){
                console.log (err);
            } else {
                res.json(results[0].minutesLeft);
            }
        })
    })

    app.get('/rejected', isLoggedIn, function (req, res) {
        let myStat = "SELECT userrole FROM UserLogin WHERE username = '" + req.user.username + "';";
        let state2 = "SELECT firstName, lastName FROM UserProfile WHERE username = '" + req.user.username + "';"; //define last name

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
                res.render('rejected.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[1][0].firstName,
                    lastName: results[1][0].lastName,
                });
            }
        });
    });


    let olduuid;
    //Put back the photo in the form
    app.get('/edit', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let editIDSr = req.query.editIDSr;
        let myStat = "SELECT Layer_Uploader, Layer_Uploader_name FROM Request_Form WHERE RID = '" + editIDSr + "'";

        let filePath0;
        con_CS.query(myStat, function (err, results) {
            if (!results[0].Layer_Uploader && !results[0].Layer_Uploader_name) {
                console.log("Error");
            } else {
                filePath0 = results[0];
                let JSONresult = JSON.stringify(results, null, "\t");
                olduuid = results;
                res.send(JSONresult);
            }
        });
    });

    //Delete button
    app.get('/deleteData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let transactionID = req.query.transactionIDStr.split(',');
        let pictureStr = req.query.pictureStr.split(',');
        let LayerName = req.query.LayerName.split(',');

        for (let i = 0; i < transactionID.length; i++) {
            // console.log('hh');
            console.log(LayerName[i]);
            let statement = "UPDATE Request_Form SET Layer_Uploader = 'trashfolder/', Prior_Status = Current_Status, Current_Status = 'Deleted'  WHERE RID = '" + transactionID[i] + "';";
            let statement1 = "UPDATE LayerMenu SET Status = 'Deleted' WHERE ThirdLayer = '" + LayerName[i] + "';";

            console.log("Statement1:  " + statement1);
            // let statement1 = "DELETE FROM LayerMenu WHERE ThirdLayer = '" + LayerName[i]  + "';"; // the [i] is converting the array back to string so it can be used
            ////transferred value from client side to server side and then be used in SQL
            fs.rename(''+ Pending_Dir + '/' + pictureStr[i] + '' , ''  + Delete_Dir + '/' + pictureStr[i] + '',  function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Delete button working fine!");
                }
            });
            con_CS.query(statement + statement1, function (err, results) {
                if (err){
                    throw err;
                }else{
                    res.json({"error": false, "message": "Delete successful"});
                }
            });
        }
    });

    app.get('/editdata',function (req,res){
        // let d = new Date();
        // let utcDateTime = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2);
        // let queryRID = "SELECT COUNT(RID) AS number FROM Special_ID WHERE RID LIKE '" + utcDateTime + "%';";
        res.render('LayerRequestForm_edit.ejs', {
            user: req.user
        });
    });

    // =====================================
    // CitySmart Menu Filter SECTION =======
    // =====================================

    //Country level
    app.get('/CountryList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT CountryName FROM LayerMenu GROUP BY CountryName', function (err, results) {
            if (err) throw err;
            res.json(results);
        });
    });

    // Class for menu
    app.get('/ClassName', function (req, res) {

        res.setHeader("Access-Control-Allow-Origin", "*");
        let recieveCitylist = req.query.citylevel;
        let my2statement = "SELECT FirstLayer, SecondLayer, ThirdLayer FROM LayerMenu WHERE StateName = ? ;";
        let receiveStatelist = req.query.statelevel;

        if (recieveCitylist === 'All Cities') {
            con_CS.query( my2statement , receiveStatelist, function(err, results) {
                res.json(results);
            })
        }
        else {
            con_CS.query("SELECT FirstLayer, SecondLayer, ThirdLayer FROM LayerMenu WHERE CityName = ? ;", recieveCitylist, function (err, results) {
                res.json(results);
                //select every city where state is =
            })

        }
    });

    let stat;
    app.get('/CountryClassName', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        // console.log(stat);
        let recieveCountrylist = req.query.countrylevel;
        con_CS.query("SELECT FirstLayer, SecondLayer, ThirdLayer FROM LayerMenu WHERE CountryName = ? ;", recieveCountrylist, function (err, results) {
            res.json(results);
        });
    });
    //state level

    app.get('/StateList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        const recieveCountrylist = req.query.countrylevel;
        stat = "Kodiak";
        con_CS.query("SELECT StateName FROM LayerMenu WHERE StateName <> 'All States' AND CountryName = ? GROUP BY StateName", recieveCountrylist, function (err, results, fields) {
            res.json(results);
        });
    });
    //city level
    app.get('/CityList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        const recieveCitylist = req.query.statelevel;
        con_CS.query("SELECT CityName FROM LayerMenu WHERE CityName <> 'All Cities' AND StateName = ? GROUP BY CityName" , recieveCitylist, function (err, results, fields) {
            res.json(results);
        });
    });

    app.get('/layerRequestContinent',function(req,res){
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT Continent,Continent_name  FROM Country group by Continent,Continent_name", function (err, results) {
            // console.log(results);
            if (err) throw err;
            res.json(results);
        });
    });

    app.get('/layerRequestCountry',function(req,res){
        res.setHeader("Access-Control-Allow-Origin", "*");
        // console.log(req.query);
        const recieveCountryData = req.query.country;
        // console.log(recieveCountryData);
        con_CS.query("SELECT Country_name FROM Country WHERE Continent = ?", recieveCountryData, function (err, results) {
            console.log(results);
            if (err) throw err;
            res.json(results);
        });
    });

//AddData in table
    app.get('/AddData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT * FROM Request_Form", function (err, results) {
            // console.log('hh');
            if (err) throw err;
            res.json(results);
        })
    });

    // app.get('/EditData', function (req, res) {
    //     res.setHeader("Access-Control-Allow-Origin", "*");
    //     con_CS.query("SELECT Full Name, Address Line 1, Address Line 2, City, State/Province/Region, Postal Code/ZIP, Country, Email, Phone Number, Layer Name, Layer Category, Layer Description, Layer Uploader FROM GeneralFormDatatable", function (err, results) {
    //         if (err) throw err;
    //     })
    // });

    app.get('/SearchLayerName', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT ThirdLayer FROM LayerMenu", function (err, results) {
            if (err) throw err;
            res.json(results);

        });
    });

    // =====================================
    // CitySmart Dynamic Menu SECTION ======
    // =====================================

    app.get('/layername', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT LayerName From LayerMenu", function (err, result) {
            let JSONresult = JSON.stringify(result, null, "\t");
            res.send(JSONresult);
        });
    });

    app.get('/autoMenu',function (req,res) {
        // res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let queryState = "SELECT FirstLayer, SecondLayer, ThirdLayer, " +
            "GROUP_CONCAT(LayerName) as LayerName, LayerType, CountryName, StateName, CityName " +
            "FROM CitySmart2.LayerMenu WHERE Status = 'Approved' and Available = 'Yes' " +
            "GROUP BY FirstLayer, SecondLayer, ThirdLayer, LayerType, CountryName, StateName, CityName";

        con_CS.query(queryState, function (err, results) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                res.json(results);
            }
        });
    });

    app.get('/allLayerMenu', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT * From LayerMenu WHERE Status = 'Approved' and Available = 'Yes'", function (err, results) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                res.json({"error": false, "data": results});
            }
        });

    });

    app.get('/usgsWT', function (req, res) {
        // console.log("A: " + new Date());

        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        // var statement = "SELECT p_name, xlong, ylat, p_year_color, p_avgcap_color, t_ttlh_color FROM USWTDB INNER JOIN USWTDB_COLOR ON USWTDB.case_id = USWTDB_COLOR.case_id ORDER BY p_name;";
        let statement = "SELECT USWTDB_Sample.case_id, t_state, p_name, xlong, ylat, p_year, p_tnum, " +
            "p_cap, p_avgcap, t_ttlh, p_year_color as Year_Color, p_avgcap_color as Capacity_Color, " +
            "t_ttlh_color as Height_Color FROM USWTDB_Sample INNER JOIN USWTDB_COLOR_Sample " +
            "ON USWTDB_Sample.case_id = USWTDB_COLOR_Sample.case_id ORDER BY p_name;";

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else {
                res.json({"error": false, "data": results});
            }
        });
    });

    // =====================================
    // Others  =============================
    // =====================================
    app.get('Cancel', function (req, res) {
        res.redirect('/userHome');
        res.render('userHome', {
            user: req.user // get the user out of session and pass to template
        });
    });

    app.get('/reDownload', () => predownloadXml());


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

    function del_recov(StatusUpd, ErrMsg, targetURL, req, res) {

        transactionID = req.query.transactionIDStr.split(",");
        // console.log(transactionID);
        let statementGeneral = "UPDATE Request_Form SET Status = '" + StatusUpd + "'"; //this is where the problem is

        for (let i = 0; i < transactionID.length; i++) {
            if (i === 0) {
                statementGeneral += " WHERE RID = '" + transactionID[i] + "'";
                // statementDetailedS += " WHERE transactionID = '" + transactionID[i] + "'";
                // statementDetailedT += " WHERE transactionID = '" + transactionID[i] + "'";

                if (i === transactionID.length - 1) {
                    statementGeneral += ";";
                    // statementDetailedS += ";";
                    // statementDetailedT += ";";
                    myStat = statementGeneral;
                    updateDBNres(myStat, "", ErrMsg, targetURL, res);
                }
            } else {
                statementGeneral += " OR RID = '" + transactionID[i] + "'";
                // statementDetailedS += " OR transactionID = '" + transactionID[i] + "'";
                // statementDetailedT += " OR transactionID = '" + transactionID[i] + "'";

                if (i === transactionID.length - 1) {
                    statementGeneral += ";";
                    // statementDetailedS += ";";
                    // statementDetailedT += ";";
                    myStat = statementGeneral;
                    updateDBNres(myStat, "", ErrMsg, targetURL, res);
                }
            }
        }
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
                    console.log(NewsqlStat);
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

    function onUpload(req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        let form = new multiparty.Form();

        form.parse(req, function (err, fields, files) {
            let partIndex = fields.qqpartindex;

            // text/plain is required to ensure support for IE9 and older
            res.set("Content-Type", "text/plain");

            if (partIndex == null) {
                onSimpleUpload(fields, files[fileInputName][0], res);
            }
            else {
                onChunkedUpload(fields, files[fileInputName][0], res);
            }
        });
    }

    let responseDataUuid = "",
        responseDataName = "",
        responseDataUuid2 = "",
        responseDataName2 = "";

    function onSimpleUpload(fields, file, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        responseDataUuid = "";

        let d = new Date(),
            uuid = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2) + "T" + ('0' + d.getUTCHours()).slice(-2) + ":" + ('0' + d.getUTCMinutes()).slice(-2) + ":" + ('0' + d.getUTCSeconds()).slice(-2) + "Z",
            responseData = {
                success: false,
                newuuid: uuid + "_" + fields.qqfilename
                // newuuid2: uuid + "_" + fields.qqfilename
            };

        responseDataUuid = responseData.newuuid;
        // responseDataUuid2 = responseData.newuuid2;

        file.name = fields.qqfilename;
        responseDataName = file.name;
        responseDataName2 = file.name;

        if (isValid(file.size)) {
            moveUploadedFile(file, uuid, function () {
                    responseData.success = true;
                    res.send(responseData);
                },
                function () {
                    responseData.error = "Problem copying the file!";
                    res.send(responseData);
                });
        }
        else {
            failWithTooBigFile(responseData, res);
        }
    }

    function onChunkedUpload(fields, file, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        let size = parseInt(fields.qqtotalfilesize),
            uuid = fields.qquuid,
            index = fields.qqpartindex,
            totalParts = parseInt(fields.qqtotalparts),
            responseData = {
                success: false
            };

        file.name = fields.qqfilename;

        if (isValid(size)) {
            storeChunk(file, uuid, index, totalParts, function () {
                    if (index < totalParts - 1) {
                        responseData.success = true;
                        res.send(responseData);
                    }
                    else {
                        combineChunks(file, uuid, function () {
                                responseData.success = true;
                                res.send(responseData);
                            },
                            function () {
                                responseData.error = "Problem conbining the chunks!";
                                res.send(responseData);
                            });
                    }
                },
                function (reset) {
                    responseData.error = "Problem storing the chunk!";
                    res.send(responseData);
                });
        }
        else {
            failWithTooBigFile(responseData, res);
        }
    }

    function failWithTooBigFile(responseData, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        responseData.error = "Too big!";
        responseData.preventRetry = true;
        res.send(responseData);
    }
    //delete new photo
    function onDeleteFile1(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        //console.log("result=" + req.params.uuid);
        let uuid = req.params.uuid,
            dirToDelete = Delete_Dir + '/' + uuid;
        rimraf(dirToDelete, function(error) {
            if (error) {
                console.error("Problem deleting file! " + error);
                res.status(500);
            }
            res.send();
        });
    }
    //delete old photo
    function onDeleteFile2(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let dirToDelete = Pending_Dir + '/' + olduuid[0].Layer_Uploader_name;
        rimraf(dirToDelete, function(error) {
            if (error) {
                console.error("Problem deleting file! " + error);
                res.status(500);
            }
            res.send();
        });
    }

    function isValid(size) {
        return maxFileSize === 0 || size < maxFileSize;
    }

    function moveFile(destinationDir, sourceFile, destinationFile, success, failure) {
        //console.log(destinationDir);
        mkdirp(destinationDir, function (error) {
            let sourceStream, destStream;
            if (error) {
                console.error("Problem creating directory " + destinationDir + ": " + error);
                failure();
            }
            else {
                sourceStream = fs.createReadStream(sourceFile);
                destStream = fs.createWriteStream(destinationFile);

                sourceStream
                    .on("error", function (error) {
                        console.error("Problem copying file: " + error.stack);
                        destStream.end();
                        failure();
                    })
                    .on("end", function () {
                        destStream.end();
                        success();
                    })
                    .pipe(destStream);
            }
        });

        // let sourceStream = fs.createReadStream(sourceFile);
        // let destStream = fs.createWriteStream(destinationFile);
        //
        // sourceStream.on("error", function (error) {
        //         console.error("Problem copying file: " + error.stack);
        //         destStream.end();
        //         failure();
        // }).on("end", function () {
        //     destStream.end();
        //     success();
        // }).pipe(destStream);
    }

    function moveUploadedFile(file, uuid, success, failure) {
        let destinationDir = Pending_Dir + "/",
            fileDestination = destinationDir + uuid + "_" + file.name;

        moveFile(destinationDir, file.path, fileDestination, success, failure);
    }

    function storeChunk(file, uuid, index, numChunks, success, failure) {
        let destinationDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
            chunkFilename = getChunkFilename(index, numChunks),
            fileDestination = destinationDir + chunkFilename;

        moveFile(destinationDir, file.path, fileDestination, success, failure);
    }

    function combineChunks(file, uuid, success, failure) {
        let chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
            destinationDir = uploadedFilesPath + uuid + "/",
            fileDestination = destinationDir + file.name;


        fs.readdir(chunksDir, function (err, fileNames) {
            let destFileStream;

            if (err) {
                console.error("Problem listing chunks! " + err);
                failure();
            }
            else {
                fileNames.sort();
                destFileStream = fs.createWriteStream(fileDestination, {flags: "a"});

                appendToStream(destFileStream, chunksDir, fileNames, 0, function () {
                        rimraf(chunksDir, function (rimrafError) {
                            if (rimrafError) {
                                console.log("Problem deleting chunks dir! " + rimrafError);
                            }
                        });
                        success();
                    },
                    failure);
            }
        });
    }

    function appendToStream(destStream, srcDir, srcFilesnames, index, success, failure) {
        if (index < srcFilesnames.length) {
            fs.createReadStream(srcDir + srcFilesnames[index])
                .on("end", function () {
                    appendToStream(destStream, srcDir, srcFilesnames, index + 1, success, failure);
                })
                .on("error", function (error) {
                    console.error("Problem appending chunk! " + error);
                    destStream.end();
                    failure();
                })
                .pipe(destStream, {end: false});
        }
        else {
            destStream.end();
            success();
        }
    }

    function getChunkFilename(index, count) {
        let digits = new String(count).length,
            zeros = new Array(digits + 1).join("0");

        return (zeros + index).slice(-digits);
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
                myStat = "UPDATE UserLogin SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE username = '" + username + "' ";
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
                    text: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        url + token + '\n\n' +
                        'If you did not request this, please ignore this email.\n'
                };

                smtpTrans.sendMail(message, function(error){
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

                    // plaintext body
                    text: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                        'Please user the following code to complete the authentication:\n\n' +
                        url +'\n\n' +
                        'If you did not request this, please ignore this email.\n'
                };

                smtpTrans.sendMail(message, function(error){
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

    function sendSMTPToken(username, subject, text, url, res) {
        async.waterfall([
            function(done) {
                crypto.randomBytes(20, function(err, buf) {
                    token = buf.toString('hex');
                    tokenExpTime();
                    done(err, token, tokenExpire);
                });
            },
            function (token, tokenExpire, done) {
                myStat = "UPDATE UserLogin SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE username = '" + username + "' ";
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
                    text: 'You are receiving this because you (or. someone else) have requested ' + text + '\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        url + token + '\n\n' +
                        'If you did not request this, please ignore this email.\n'
                };

                smtpTrans.sendMail(message, function(error){
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

    function sendToken2(username, subject, text, url, res) {
        async.waterfall([
            function(done) {
                // Message object
                const message = {
                    from: 'FTAA <aaaa.zhao@g.northernacademy.org>', // sender info
                    to: username, // Comma separated list of recipients
                    subject: subject, // Subject of the message

                    // plaintext body
                    text: 'This email is sent to inform all admins that user ' + username + ' has ' + text + '\n\n' +
                        'Please click on the following link, or paste this into your browser to review the new layer:\n\n' +
                        url + '\n\n'
                };

                smtpTrans.sendMail(message, function(error){
                    if(error){
                        console.log(error.message);
                        res.json({"error": true, "message": "An unexpected error occurred !"});
                        // alert('it didnt work :(');
                    } else {
                        res.json({"error": false, "message": "Message sent successfully !"});
                        // alert('An e-mail has been sent to ' + username + ' with further instructions.');
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
                myStat = "UPDATE UserLogin SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE PendingUsername = '" + username + "' ";
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
                    text: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        url + token + '\n\n' +
                        'If you did not request this, please ignore this email.\n'
                };

                smtpTrans.sendMail(message, function(error){
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

    function copyXML(){
        const today = new Date();//get the current date
        let date = today.getFullYear()+ '_' +(today.getMonth()+1)+ '_' + today.getDate();
        let time = today.getHours() + "_" + today.getMinutes()+'_' + today.getSeconds();
        let dataStr = date + "_"+ time;
        let copyDest = copyDestDir + '/' + dataStr+ '.xml'; //define a file name
        fsextra.copy(copySource, copyDest) //copy the file and rename
            .then(//if copy succeed, call pre-download XML function
                console.log('copy successful'),
                predownloadXml ()
            )
    }

    function predownloadXml () {
        const requestOptions = {
            uri: Download_From,
            timeout: download_interval - 20000
        };
        let resXMLRequest;
        console.log('predownloadXML was called');

        request.get(requestOptions)
            .on('error',function(err){ //called when error
                console.log(err.code);
                console.log('predownloadXML error');
                removeFile();
                // process.exit(0)
            })
            .on('response', function (res) {
                resXMLRequest = res;
                if (res.statusCode === 200){
                    res.pipe(fs.createWriteStream(copySource));
                    console.log('download starting');
                } else {
                    console.log("Respose with Error Code: " + res.statusCode);
                    removeFile();
                    // process.exit(0)
                }
            })
            .on('end', function () {
                downloadFalse = false;
                console.log("The End: " + resXMLRequest.statusCode);
                removeFile();
                // process.exit(0)
            })
    }

    function removeFile() {

        console.log('the remove function was called at: ' + copyDestDir);

        fs.readdir(copyDestDir, (err, files) => {//a method to calculate the number of the files in the geoCapacity folder

            // if(files.length > num_backups){
            //
            //     //if there are more than 100 file in the directory
            //     if(!downloadFalse){ //if download succeed, run the code below
            //         fs.unlink(copyDestDir + "/" + files[0], (err) => { //delete the first (the oldest) file in the directory
            //             if (err) {throw err} else {
            //                 downloadFalse = true; //change the value of "downloadFalse" to true
            //             }
            //             console.log('download and remove copy successfully');
            //         })
            //     } else { //if download failed, run the code below
            //         fs.unlink(copyDestDir + "/" + files[files.length-1], (err) => { //then delete the last (the latest) file in the directory
            //             if (err) {throw err}
            //             console.log('download file failed, removed copy successfully')
            //         })
            //     }
            // }else {
            //     //if the file number is less than num_backups, and download failed
            //     if (files.length > 0) {
            //         if (downloadFalse === null) {
            //             fs.unlink(copyDestDir + "/" + files[files.length - 1], (err) => { //then delete the last (the latest) file in the directory
            //                 if (err) throw err;
            //                 console.log('download file failed,number is less than num_backups, removed copy successfully')
            //             })
            //         }
            //     }
            // }
        });
    }
};
