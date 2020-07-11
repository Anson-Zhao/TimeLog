requirejs([
        './newGlobe',
        './customPK',
        './layerMenuAll',
        '../config/clientConfig',
        ], function (newGlobe, customPK, menuL) {

    "use strict";

    // create placemarks base on each commodity
    $.ajax({
        url: '/mrdsData',
        type: 'GET',
        dataType: 'json',
        async: false,
        success: function (resp) {
            if (!resp.error) {

                menuL.arrMR.forEach(function (e) {

                    let rows = resp.data.filter(ele => ele.commod1.includes(e.cName) || ele.commod2.includes(e.cName)  || ele.commod3.includes(e.cName) || ele.dev_stat.includes(e.cName) );
                    let data = [];

                    rows.forEach(function (v, i) {

                        // create customized placemark and wrap it up with its own userProperties.
                        let categoryPK = new customPK(config.MR_COMM_Color[e.cName], v.latitude, v.longitude);
                        categoryPK.placemark.userProperties.site_name = v.site_name;
                        categoryPK.placemark.userProperties.country = v.country;
                        categoryPK.placemark.userProperties.stat = v.stat;
                        categoryPK.placemark.userProperties.mrds_id = v.mrds_id;
                        categoryPK.placemark.userProperties.url = v.url;
                        categoryPK.placemark.userProperties.commodity = v.commodity;
                        categoryPK.placemark.userProperties.dev_stat = v.dev_stat;

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
                            heatmapLayer.layerType = 'USGSMR_HMLayer';
                            newGlobe.addLayer(heatmapLayer);

                            // reset placemarkLayer properties
                            e.wLayer.enabled = false;
                            e.wLayer.layerType = 'USGSMR_PKLayer';
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
