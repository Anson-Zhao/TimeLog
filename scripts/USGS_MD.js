requirejs([
        './newGlobe',
        './customPK',
        './layerMenuAll',
        '../config/clientConfig',
], function (newGlobe, customPK, menuL) {

    "use strict";

    // create placemarks base on each commodity
    $.ajax({
        url: '/placemarkt',
        type: 'GET',
        dataType: 'json',
        async: false,
        success: function (resp) {
            if (!resp.error) {

                menuL.arrMD.forEach(function (e) {
                    let rows = resp.data.filter(ele => ele.commodity.includes(e.cName)|| ele.dep_type.includes(e.cName));
                    let data = [];
                    rows.forEach(function (v, i) {

                        // create customized placemark and wrap it up with its own userProperties.
                        let categoryPK = new customPK(config.MD_COMM_Color[e.cName], v.latitude, v.longitude);
                        categoryPK.placemark.userProperties.dep_name = v.dep_name;
                        categoryPK.placemark.userProperties.country = v.country;
                        categoryPK.placemark.userProperties.state = v.state;
                        categoryPK.placemark.userProperties.dep_type = v.dep_type;
                        categoryPK.placemark.userProperties.commodity = v.commodity;

                        // add this placemark onto placemarkLayer object
                        e.wLayer.addRenderable(categoryPK.placemark);

                        data.push(new WorldWind.MeasuredLocation(v.latitude, v.longitude, 1));

                        if (i === rows.length - 1) {

                            // wrap up heatmap layer, and then put onto worldwind layers
                            let heatmapLayer = new WorldWind.HeatMapLayer(e.hlName, data);
                            heatmapLayer.scale = config.heatmapSetting.scale;

                            heatmapLayer.radius = config.heatmapSetting.radius;
                            // heatmapLayer.gradient = [0, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95];
                            heatmapLayer.incrementPerIntensity = config.heatmapSetting.incrementPerIntensity;

                            heatmapLayer.enabled = false;
                            heatmapLayer.layerType = 'USGSMD_HMLayer';
                            newGlobe.addLayer(heatmapLayer);

                            // add customized placemarkLayer onto worldwind layers
                            e.wLayer.enabled = false;
                            e.wLayer.layerType = 'USGSMD_PKLayer';
                            newGlobe.addLayer(e.wLayer);

                        }
                    })
                })
            } else {
                alert(resp.error)
            }
        }
    })
});
