let country, state;

$(document).ready(function() {
    let countryList = document.getElementById("myListCountry");
    $.ajax({
        url: "CountryList",
        dataType: 'json',
        success: function (results) {

            countryList.add(new Option("All Layer", "All Layer"));

            for (let i = 0; i < results.length; i++) {
                countryList.add(new Option(results[i].CountryName, results[i].CountryName));
            }
        }
    });
});

function filterColomn(rows, key) {
    return rows.map(function(row) { return row[key]; })
}

function getObjects(obj, key, val) {
    let objects = [];
    for (let i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else
        //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
        if (i == key && obj[i] == val || i == key && val == '') { //
            objects.push(obj);
        } else if (obj[i] == val && key == '') {
            //only add if the object is not already in the array
            if (objects.lastIndexOf(obj) == -1) {
                objects.push(obj);
            }
        }
    }
    return objects;
}

function ChangeCountryList(countrylevel) {

    $('.Menu').hide();

    let stateList = document.getElementById("myListState");
    while (stateList.options.length) {
        stateList.remove(0);
    }

    if(countrylevel === "All Layer") {

        $('.Menu').show();
        // $('.State').show();
        $("#myListState").html("<option>All Layer</option>");
        document.getElementById("myListState").disabled = true;
        document.getElementById("myListState").style.backgroundColor = "lightgray";
        $("#myListCity").html("<option>All Layer</option>");
        document.getElementById("myListCity").disabled = true;
        document.getElementById("myListCity").style.backgroundColor = "lightgray";

    } else if(countrylevel !== "SAS"){

        $("#myListState").html("<option>-Select A State List-</option>");
        document.getElementById("myListState").disabled = false;
        document.getElementById("myListState").style.backgroundColor = "white";

        country = "countrylevel="+ countrylevel;

        $.ajax({
            url: "StateList",
            method: 'GET',
            dataType: 'json',
            data: country,
            success: function (results) {
                stateList.add(new Option("All Layer", "All Layer"));
                for(let j = 0; j < results.length; j++){
                    stateList.add(new Option(results[j].StateName, results[j].StateName));
                }
            }
        })
    }
}

function ChangeStateList(statelevel) {

    let cityList = document.getElementById("myListCity");
    while (cityList.options.length) {
        cityList.remove(0);
    }

    $('.Menu').hide();

    if(statelevel === "All Layer"){

        $("myListCity").html("<option>All Layer</option>");
        document.getElementById("myListCity").disabled = true;
        document.getElementById("myListCity").style.backgroundColor = "lightgray";

        $.ajax({
            url: "CountryClassName",
            method: 'GET',
            dataType: 'json',
            data:country,
            success: function (results) {
                myFunction(results);
            }
        })

    } else if(statelevel!== "SAS"){

        $("myListCity").html("<option> -Select A City List- </option>");
        document.getElementById("myListCity").disabled = false;
        document.getElementById("myListCity").style.backgroundColor = "white";

        state = "statelevel="+ statelevel;

        $.ajax({
            url: "CityList",
            method: 'GET',
            dataType: 'json',
            data:state,
            success: function (results) {
                cityList.add(new Option("-Select a City List-", "Select a City"));
                cityList.add(new Option("All Cities", "All Cities",));

                for(var j = 0; j < results.length; j++){
                    var option = new Option(results[j].CityName, results[j].CityName);
                    cityList.add(option);
                    // console.log (results[j].CityName);
                }
            }
        })
    }
}

function ChangeCityList(citylevel){

    $('.Menu').hide();

    if (citylevel !== "SAS") {

        let city = "citylevel="+ citylevel + '&'+ state;
        $.ajax({
            url: "ClassName",
            method: 'GET',
            dataType: 'json',
            data:city,
            success: function (results) {
                myFunction(results);
            }
        })
    }
}

function myFunction(returnCity) {
    for( let i = 0; i <returnCity.length ; i++){
        let obj1 = returnCity[i].FirstLayer;
        let obj2 = returnCity[i].SecondLayer;
        let obj3 = returnCity[i].ThirdLayer;
        let className1 = "." + obj1;
        let className2 = "." + obj2;
        let className3 = "." + obj3;

        $(className1).show();
        $(className2).show();
        $(className3).show();

    }
}



