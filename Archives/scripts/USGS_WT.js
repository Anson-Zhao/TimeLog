requirejs([
    './newGlobe',
    './customPK',
    './layerMenuAll',
    '../config/clientConfig'
], function (newGlobe, customPK, menuL) {

    "use strict";

    let data = [];

    // create placemarks base on each category
    $.ajax({
        url: '/usgsWT',
        type: 'GET',
        dataType: 'json',
        async: false,
        success: function (resp) {
            // console.log(resp.data);
            if (!resp.error) {
                resp.data.forEach(function (v, i) {
                    menuL.arrWT.forEach(function (e) {

                        // create customized placemark and wrap it up with its own userProperties.
                        let categoryPK = new customPK(v[e.cName+'_Color'], v.ylat, v.xlong);
                        categoryPK.placemark.userProperties.p_name = v.p_name;
                        categoryPK.placemark.userProperties.t_state = v.t_state;
                        categoryPK.placemark.userProperties.p_year = (v.p_year === -9999) ? 'N/A' : v.p_year;
                        categoryPK.placemark.userProperties.p_tnum = v.p_tnum;
                        categoryPK.placemark.userProperties.p_cap = (v.p_cap === -9999) ? 'N/A' : v.p_cap;
                        categoryPK.placemark.userProperties.p_avgcap = (v.p_avgcap === -9999) ? 'N/A' : v.p_avgcap;
                        categoryPK.placemark.userProperties.t_ttlh = (v.t_ttlh === -9999) ? 'N/A' : v.t_ttlh;
                        categoryPK.placemark.userProperties.p_year_color = v.Year_Color;
                        categoryPK.placemark.userProperties.p_avgcap_color = v.Capacity_Color;
                        categoryPK.placemark.userProperties.t_ttlh_color = v.Height_Color;

                        // add this placemark onto placemarkLayer object
                        e.wLayer.addRenderable(categoryPK.placemark);

                    });

                    // prepare heatmap layer data
                    data.push(new WorldWind.MeasuredLocation(v.ylat, v.xlong, 1000));

                    if (i === resp.data.length - 1) {
                        // add customized placemarkLayer onto worldwind layers
                        menuL.arrWT.forEach(function (el) {
                            el.wLayer.enabled = false;
                            el.wLayer.layerType = 'USGSWT_PKLayer';
                            newGlobe.addLayer(el.wLayer);

                        });

                        // wrap up heatmap layer, and then put onto worldwind layers
                        let heatmapLayer = new WorldWind.HeatMapLayer("USGS_WT_HeatMap", data);
                        heatmapLayer.scale = config.heatmapSetting.scale;

                        heatmapLayer.radius = config.heatmapSetting.radius;
                        // heatmapLayer.gradient = [0, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95];
                        heatmapLayer.incrementPerIntensity = config.heatmapSetting.incrementPerIntensity;

                        heatmapLayer.enabled = false;
                        heatmapLayer.layerType = 'USGS_WT_HeatMap';
                        newGlobe.addLayer(heatmapLayer)
                    }

                })
            } else {
                alert(resp.error)
            }
        }
    })

});
