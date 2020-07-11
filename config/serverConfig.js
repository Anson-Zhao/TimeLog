// config/database.js
let serverConfig = {
    commondb_connection: {
        'multipleStatements': true,
        'connectionLimit' : 100,
        'host': '127.0.0.1',
        'user': 'AppUser',
        'password': 'Special888%',
        'port'    :  3306
    },
    session_connection: {
        'multipleStatements': true,
        'connectionLimit' : 100,
        'host': '127.0.0.1',
        'user': 'AppUser',
        'password': 'Special888%',
        'port'    :  3306
    },

    Session_db: 'CitySmart2',
    Login_db: 'CitySmart2',
    Login_table: 'UserLogin',
    Upload_db: 'CitySmart2',

    Server_Port: 9086,

    // local_URL : "",
    // local_URL : "http://viewer.usgs.aworldbridgelabs.com",

    //upload path to geoserver when approved
    geoServer : 'http://cs.aworldbridgelabs.com:8080/geoserver/',
    // geoServer : 'http://10.11.90.16:8080/geoserver/',

    //sysnchronization between approvedfolder and data folder under geoserver when approved
    // Sync_Dir : '/usr/share/geoserver-2.15.0/data_dir/data/Approved',
    // Sync_Dir : 'syncfolder',

    //download/backup wmsCapabilities file (xml)
    Download_From : 'https://cors.aworldbridgelabs.com:9084/http://cs.aworldbridgelabs.com:8080/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities',
    Download_To:'../config/ows.xml',
    Backup_Dir:'../config/geoCapacity',

    //upload file--pending
    Pending_Dir: 'uploadfolder',
    Reject_Dir: 'rejectfolder',

    //approve file--active
    Approve_Dir: 'approvedfolder',

    //trashfolder file--trashfolder
    Delete_Dir: 'trashfolder',

    num_backups: 24,
    download_interval: 3600000,

};

module.exports = serverConfig;