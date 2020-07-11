define([],function () {
    let transparentPK = function (lat, long) {

        // wrap up World Wind Placemark object
        let placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
        placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/YellowFireHydrant.png";

        placemarkAttributes.imageScale = 0.005; //placemark size!

        // if (Array.isArray(color)) {
        //     placemarkAttributes.imageSource = new WorldWind.ImageSource(imagePK(color, 5, 15));
        // } else {
        //     placemarkAttributes.imageSource = new WorldWind.ImageSource(imagePK(color, 0, 10));
        // }

        placemarkAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.3,
            WorldWind.OFFSET_FRACTION, 0.0);

        placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
        placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 1.0);


        let highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        highlightAttributes.imageScale = 0.1;

        let placemarkPosition = new WorldWind.Position(lat, long, 0);

        this.placemark = new WorldWind.Placemark(placemarkPosition, true, placemarkAttributes);
        this.placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        this.placemark.attributes = placemarkAttributes;
        this.placemark.highlightAttributes = highlightAttributes;
    };



    // wrap up placemark image source
    // function imagePK(color, innerR, outerR) {
    //     let canvas = document.createElement("canvas"),
    //         ctx = canvas.getContext('2d');
    //
    //     canvas.width = canvas.height = outerR * 2;
    //
    //     let gradient = ctx.createRadialGradient(outerR, outerR, innerR, outerR, outerR, outerR);
    //
    //     if (Array.isArray(color)) {
    //         gradient.addColorStop(0, color[0]);
    //         gradient.addColorStop(0.5, color[1]);
    //         gradient.addColorStop(1, color[2]);
    //     } else {
    //         gradient.addColorStop(0, color);
    //     }
    //
    //     ctx.beginPath();
    //     ctx.arc(outerR, outerR, outerR, 0, Math.PI * 2, true);
    //
    //     ctx.fillStyle = gradient;
    //     ctx.fill();
    //     // ctx.strokeStyle = "rgb(255, 255, 255)";
    //     // ctx.stroke();
    //
    //     ctx.closePath();
    //
    //     return canvas
    // }

    return transparentPK
});