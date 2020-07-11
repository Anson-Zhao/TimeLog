//get the data from database with certain conditions

$(document).ready(function() {

    //Main Menu creating starts here
    let parentMenu = document.getElementById("accordion");
    let firstLayers =[];
    let secondLayers =[];

    //get data from database table using routes(ajax)
    $.ajax({
        type: "GET",
        url: "autoMenu",
        dataType: "json",
        success: function (res) {
            // draw the first layer
            for ( let element of res) {
                let secondIndex = element.FirstLayer + '--' + element.SecondLayer;

                if (!firstLayers.includes(element.FirstLayer)) {
                    createFirstLayer(element.FirstLayer);
                }

                if (!secondLayers.includes(secondIndex)) {
                    createSecondLayer(element.FirstLayer, element.SecondLayer);
                }

                setTimeout(function() {
                    createThirdLayer(element)
                }, 20);
            }
        }
    });

    function createFirstLayer(firstL) {
        let panelDefault1 = document.createElement("div");
        panelDefault1.className = "Menu panel panel-info " + firstL;

        let panelHeading1 = document.createElement("div");
        panelHeading1.className = "panel-heading";

        let panelTitle1 = document.createElement("h4");
        panelTitle1.className = "panel-title";

        let collapsed1 = document.createElement("a");
        collapsed1.className = "collapsed";
        collapsed1.setAttribute("data-toggle", "collapse");
        collapsed1.setAttribute("data-parent", "#accordion");
        collapsed1.href = "#" + firstL;

        let firstLayerName = document.createTextNode(firstL + "  ");
        firstLayerName.className = "menuwords";

        let collapseOne = document.createElement("div");
        collapseOne.className = "panel-collapse collapse";
        collapseOne.id = firstL;

        let panelBody1 = document.createElement("div");
        panelBody1.className = "panel-body";

        let panelGroup1 = document.createElement("div");
        panelGroup1.className = "panel-group " + firstL;
        panelGroup1.id = "nested-" + firstL;

        collapsed1.appendChild(firstLayerName);
        panelTitle1.appendChild(collapsed1);
        panelHeading1.appendChild(panelTitle1);
        panelDefault1.appendChild(panelHeading1);
        panelDefault1.appendChild(collapseOne);
        parentMenu.appendChild(panelDefault1);

        panelBody1.appendChild(panelGroup1);
        collapseOne.appendChild(panelBody1);

        firstLayers.push(firstL);
    }

    function createSecondLayer(firstL, secondL) {

        let panelDefault2 = document.createElement("div");
        panelDefault2.id = secondL;
        panelDefault2.className = "Menu panel panel-info " + secondL + " " + firstL + "-" + secondL;

        let panelHeading2 = document.createElement("div");
        panelHeading2.className = "panel-heading " + firstL + "-" + secondL;

        let panelTitle2 = document.createElement("h4");
        panelTitle2.className = "panel-title " + firstL + "-" + secondL;

        let collapsed2 = document.createElement("a");
        collapsed2.className = "collapsed";
        collapsed2.setAttribute("data-toggle", "collapse");
        collapsed2.setAttribute("data-parent", "#nested");
        collapsed2.href = "#" + firstL + "-" + secondL;

        let secondLayerName = document.createTextNode(secondL + "  ");
        secondLayerName.className = "menuwords";

        let nested1c1 = document.createElement("div");
        nested1c1.id = firstL + "-" + secondL;
        nested1c1.className = "panel-collapse collapse";

        let panelBody3 = document.createElement("div");
        panelBody3.className = "panel-body " + secondL;
        panelBody3.id = firstL + "--" + secondL;

        collapsed2.appendChild(secondLayerName);
        panelTitle2.appendChild(collapsed2);
        panelHeading2.appendChild(panelTitle2);
        panelDefault2.appendChild(panelHeading2);
        panelDefault2.appendChild(nested1c1);

        nested1c1.appendChild(panelBody3);

        secondLayers.push(panelBody3.id);

        // document.getElementsByClassName("panel-group " + firstL)[0].appendChild(panelDefault2);
        document.getElementById("nested-" + firstL).appendChild(panelDefault2);
    }

    function createThirdLayer(element) {

        let thirdReplace = element.ThirdLayer.replace(/\s+/g, '');
        let countryNameStr = element.CountryName.replace(/\s+/g, '');
        let stateNameStr = element.StateName.replace(/\s+/g, '');
        let cityNameStr = element.CityName.replace(/\s+/g, '');

        if (thirdReplace !== element.ThirdLayer) {
            console.log(thirdReplace);
            console.log(element.ThirdLayer);
        }

        let checkboxDiv = document.createElement("div");
        checkboxDiv.className = "Menu " + thirdReplace + " " + countryNameStr + " " + stateNameStr + " " + cityNameStr;
        let checkboxH5 = document.createElement("h5");

        let checkboxA = document.createElement("a");
        let checkAboxAt = document.createTextNode(element.ThirdLayer + "   ");

        let checkboxLabel = document.createElement("label");
        checkboxLabel.className = "switch right";

        let checkboxInput = document.createElement("input");
        checkboxInput.type = "checkbox";
        checkboxInput.className = element.LayerType + " input";
        checkboxInput.setAttribute("value", element.LayerName);

        let checkboxSpan = document.createElement("span");
        checkboxSpan.className = "slider round";

        checkboxA.appendChild(checkAboxAt);
        checkboxH5.appendChild(checkboxA);
        checkboxLabel.appendChild(checkboxInput);
        checkboxLabel.appendChild(checkboxSpan);
        checkboxH5.appendChild(checkboxLabel);
        checkboxDiv.appendChild(checkboxH5);

        // document.getElementsByClassName("panel-body " + element.SecondLayer)[0].appendChild(checkboxDiv);
        document.getElementById(element.FirstLayer + "--" + element.SecondLayer).appendChild(checkboxDiv);
    }

});

