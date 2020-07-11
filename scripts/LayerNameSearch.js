function SearchLayerName(value){
    $.ajax({
        url: "/SearchLayerName",
        dataType:"json",
        success: function (results) {
            for(let i = 0; i < results.length; i++) {
                if (value === results[i].LayerName) {
                    document.getElementById("LayerName1").innerHTML = "The Layer Name has already been used";
                    document.addEventListener("keyup", function (e) {
                        if (event.keyCode === 8) {
                            document.getElementById("LayerName1").innerHTML = "Please enter the layer name. NOTE: Do not include spaces.";
                            }
                        }, false);
                    break;
                } else{
                    document.getElementById("LayerName1").innerHTML = "This Layer Name is available";
                }
            }
               if(value.length === 0){
                   document.getElementById("LayerName1").innerHTML = "Please enter the layer name. NOTE: Do not include spaces.";
            }
        }
    })

    //use if to check
    //false replace the <p> to the Layer Name is duplicated
    //ture --> nothing

}

function SearchThirdLayer(thisvalue){
    $.ajax({
        url: "/SearchThirdLayer",
        dataType:"json",
        success: function (results) {
            for(let i = 0; i < results.length; i++) {
                if (thisvalue === results[i].ThirdLayer) {
                    document.getElementById("LayerName2").innerHTML = "The ThirdLayer Name has already been used";
                    document.addEventListener("keyup", function (e) {
                        if (event.keyCode === 8) {
                            document.getElementById("LayerName2").innerHTML = "Please enter the ThirdLayer name. NOTE: Do not include spaces.";
                        }
                    }, false);
                    break;
                } else{
                    document.getElementById("LayerName2").innerHTML = "This ThirdLayer Name is available";
                }
            }
            if(value.length === 0){
                document.getElementById("LayerName2").innerHTML = "Please enter the ThirdLayer name. NOTE: Do not include spaces.";
            }
        }
    })
}

export {SearchLayerName, SearchThirdLayer}