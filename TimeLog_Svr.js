// set up ======================================================================
// get all the tools we need
const express  = require('express');
const app      = express();
const config = require('./config/serverConfig');

const session  = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const passport = require('passport');
const flash    = require('connect-flash');

// const CORS_host = process.env.HOST || config.CORS_host;
// const CORS_port = process.env.PORT || config.CORS_port;
// const local_URL = config.local_URL;
// const mv = require('mv');
const path    = require('path');
const port = process.env.PORT || config.Server_Port;

const morgan = require('morgan');

require('./routes/passport')(passport); // pass passport for configuration

// set up our express application
app.use(express.static(__dirname));
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use("/css", express.static(__dirname + "/css"));
app.use("/scripts", express.static(__dirname + "/scripts"));
app.use("/config", express.static(__dirname + "/config"));
// app.use("/uploadfolder", express.static(__dirname + "/a"));
app.use("/pic", express.static(__dirname + "/pic"));

app.set('views', path.join(__dirname, './', 'views'));
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');


//routes.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
let options = {
    host: config.session_connection.host,
    port: config.session_connection.port,
    user: config.session_connection.user,
    password: config.session_connection.password,
    database: config.Session_db,
    checkExpirationInterval: 120000,// How frequently expired sessions will be cleared; milliseconds.
    expiration: 1800000,// The maximum age of a valid session; milliseconds.
    createDatabaseTable: true,// Whether or not to create the sessions database table, if one does not already exist.
    connectionLimit: 10,// Number of connections when creating a connection pool
    schema: {
        tableName: 'Sessions',
        columnNames: {
            session_id: 'Session_ID',
            expires: 'Expires',
            data: 'Data'
        }
    }
};

let sessionStore = new MySQLStore(options);

app.use(session({
    secret: 'Uesei9872',
    store: sessionStore,
    resave: false,
    saveUninitialized: false
 })); // session secret

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require('./routes/routes.js')(app, passport); // load our routes and pass in our routes and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);

