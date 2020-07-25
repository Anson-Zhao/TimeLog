requirejs([
        './newGlobe',
        '../config/mainconf'
    ],
    function (newGlobe) {

        "use strict";

        let ni = "USGS_MD_Nickel_HeatMap";
        let ir = "USGS_MD_Iron_HeatMap";
        let al = "USGS_MD_Aluminum_HeatMap";
        let co = "USGS_MD_Copper_HeatMap";
        let le = "USGS_MD_Lead_HeatMap";
        let zi = "USGS_MD_Zinc_HeatMap";
        let pge = "USGS_MD_PGE_HeatMap";
        let go = "USGS_MD_Gold_HeatMap";
        let di = "USGS_MD_Diamond_HeatMap";
        let cl = "USGS_MD_Clay_HeatMap";
        let po = "USGS_MD_Potash_HeatMap";
        let re = "USGS_MD_Rare Earths_HeatMap";
        let si = "USGS_MD_Silver_HeatMap";
        let alu = "USGS_MD_Alunite_HeatMap";
        let and = "USGS_MD_Andalusite_HeatMap";
        let an = "USGS_MD_Antimony_HeatMap";
        let as = "USGS_MD_Asbestos_HeatMap";
        let ba = "USGS_MD_Barite_HeatMap";
        let bar = "USGS_MD_Barium_HeatMap";
        let be = "USGS_MD_Bentonite_HeatMap";
        let bo = "USGS_MD_Boron_HeatMap";
        let ch = "USGS_MD_Chromium_HeatMap";
        let mo = "USGS_MD_Molybdenum_HeatMap";
        let dit = "USGS_MD_Diatomite_HeatMap";
        let dol = "USGS_MD_Dolomite_HeatMap";
        let fe = "USGS_MD_Feldspar_HeatMap";
        let fl = "USGS_MD_Fluorite_HeatMap";
        let ge = "USGS_MD_Gem_HeatMap";
        let gr = "USGS_MD_Graphite_HeatMap";
        let mc = "USGS_MD_Multiple Commodities_HeatMap";

        let arrName = [ni, ir, al, co, lz, pge, go, di, cl, po, re, si, mc];

        for (let i = 0; i < arrName.length; i++) {
            let layerName = "layerName=" + arrName[i];
            $.ajax({
                url: '/mrdsDataP',
                type: 'GET',
                dataType: 'json',
                async: false,
                data: layerName,
                success: function (resp) {
                    if (!resp.error) {
                        let a = layerName.split("=");
                        let b = a[1];
                        let data = [];
                        console.log(resp.commN);
                        for (let i = 0; i < resp.commN.length; i++) {
                            data[i] = new WorldWind.MeasuredLocation(resp.commN[i].latitude, resp.commN[i].longitude, 1);
                            if (i === resp.commN.length - 1) {
                                // console.log(data);
                                let heatmapLayer = new WorldWind.HeatMapLayer(""+ b +"", data);
                                heatmapLayer.scale = [
                                    '#0071ff',
                                    '#65d6ff',
                                    '#74ff7c',
                                    '#fffd55',
                                    '#ffac5b',
                                    '#ff7500',
                                    '#FF3A33'
                                ];

                                heatmapLayer.radius = 6;
                                // heatmapLayer.gradient = [0, 0.3, 0.5, 0.7, 0.9];
                                heatmapLayer.incrementPerIntensity = 0.2;

                                heatmapLayer.enabled = false;

                                newGlobe.addLayer(heatmapLayer)
                            }
                        }
                    }
                }
            })
        }
    });
