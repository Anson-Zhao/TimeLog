requirejs([
        './newGlobe',
        '../config/clientConfig'
    ],
    function (newGlobe) {

        "use strict";

        for (let i = 0; i < 10; i++) {


            // console.log(data);
            // for (var l = 0; l < layers.length; l++) {
            //     layers[l].layer.enabled = layers[l].enabled;
            //     newGlobe.addLayer(layers[l].layer);
            // }

            // Generate 10000 random points to display on the HeatMap with varying intensity over the area of the whole world.
            var locations = [];
            for (let j = 0; j < 100; j++) {
                locations.push(
                    new WorldWind.MeasuredLocation(
                        -89 + (179 * Math.random()),
                        -179 + (359 * Math.random()),
                        Math.ceil(100 * Math.random())
                    )
                );
            }

            let heatmapLayer = new WorldWind.HeatMapLayer("heat" + i, locations);
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

            console.log(heatmapLayer);

            newGlobe.addLayer(heatmapLayer)
        }
    });
