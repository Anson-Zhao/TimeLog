// config/database.js
let clientConfig = {

    //download/backup wmsCapabilities file (xml)
    serviceAddress1:'../config/ows.xml',
    serviceAddress2: 'https://cors.aworldbridgelabs.com:9084/http://cs.aworldbridgelabs.com:8080/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities',

    // uswtdb eye distance for placemark layer menu display (km)
    eyeDistance_PL: 1500,

    // uswtdb eye distance for display heatmap until eyeDistance_Heatmap less than 4500 (km)
    eyeDistance_Heatmap: 4500,

    // uswtdb initial eye distance (m)
    eyeDistance_initial: 5000000,

    Color_Year: {red: 2010, orange: 2005, yellow: 2000, green: 1990, blue: 1980},

    Color_Capacity: {red: 3, orange: 2.5, yellow: 2, green: 1.5, blue: 0},

    Color_Height: {red: 160, orange: 120, yellow: 80, green: 40, blue: 5},

    // 'color_red': 2010, //the value would determine what year(s) greater or equal to this number would be red
    // 'color_orange': 2005, //the value would determine what year(s) greater or equal to this number would be orange
    // 'color_yellow': 2000, //the value would determine what year(s) greater or equal to this number would be yellow
    // 'color_green': 1990, //the value would determine what year(s) greater or equal to this number would be green
    // 'color_blue': 1980 //the value would determine what year(s) greater or equal to this number would be blue

    MR_COMM_Color: {
        Antimony: "#48C9B0",
        Asbestos: "#1F618D",
        Chromium: "#D5F5E3",
        Copper: "#E67E22",
        Gold: "#F7DC6F",
        Iron: "#CB4335",
        Lead: "#117864",
        Manganese: "#AED6F1",
        Molybdenum: "#FAD7A0",
        Nickel: "#F1948A",
        Silver: "#48C9B0",
        Tungsten: "#922B21",
        Uranium: "#9B59B6",
        Zinc: "#BA4A00",
        Other: "#A6ACAF",
        Producer: "#A93226",
        Occurrence: "#82E0AA",
        Prospect: "#28B463",
        Unknown: "#A6ACAF",
        PastProducer : "#D98880",
        undefined: "#ffffff"
    },



    MD_COMM_Color: {
        Hydrothermal: "#2E4053",
        Sedimentary: "#58D68D  ",
        Igneous: "#A93226",
        Metamorphic: "#CD6155",
        Surficial: "#2980B9  ",
        Gemstone :"rgba(255, 255, 255, 1)",
        Unclassified: "#A6ACAF",
        Nickel : "#626567",
        Iron:"#CB4335",
        Aluminum:"#A6ACAF",
        Copper:"#E67E22",
        Lead:"#117864",
        PGE:"#1F618D",
        Gold:"#F7DC6F",
        Diamond:"#FAD7A0",
        Clay:"#AED6F1",
        Potash:"#D5F5E3",
        undefined:"rgba(255, 255, 255, 1)",
        Silver:"#48C9B0",
        Zinc:"#99A3A4",
    },

    USGS_WT_Year: {
        Min: '1980',
        Max: '2017',
    },

    USGS_WT_Capacity: {
        Min: '>0MW',
        Max: '<4MW'
    },

    USGS_WT_Height: {
        Min: '5m',
        Max: '185m'
    },

    heatmapSetting:{
        scale: [
            // '#0071ff',
            '#65d6ff',
            '#74ff7c',
            '#fffd55',
            '#ffac5b',
            // '#ff7500',
            '#FF3A33'
        ],
        radius: 4.3,
        incrementPerIntensity: 0.2
    }

};

window.config = clientConfig;
