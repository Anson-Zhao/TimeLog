define([],function () {
    let customPK = function (color, lat, long) {

         // wrap up World Wind Placemark object
        let placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
        placemarkAttributes.imageScale = 0.5; //placemark size!

        if (Array.isArray(color)) {
            placemarkAttributes.imageSource = new WorldWind.ImageSource(imagePK(color, 5, 15));
        } else {
            placemarkAttributes.imageSource = new WorldWind.ImageSource(imagePK(color, 0, 12));
        }

        let highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        highlightAttributes.imageScale = 2;

        let placemarkPosition = new WorldWind.Position(lat, long, 0);

        this.placemark = new WorldWind.Placemark(placemarkPosition, false, placemarkAttributes);
        this.placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        this.placemark.attributes = placemarkAttributes;
        this.placemark.highlightAttributes = highlightAttributes;
    };

    // wrap up placemark image source
    function imagePK(color, innerR, outerR) {
        let canvas = document.createElement("canvas"),
            ctx = canvas.getContext('2d');

        canvas.width = canvas.height = outerR * 2;

        let gradient = ctx.createRadialGradient(outerR, outerR, innerR, outerR, outerR, outerR);

        if (Array.isArray(color)) {
            gradient.addColorStop(0, color[0]);
            gradient.addColorStop(0.5, color[1]);
            gradient.addColorStop(1, color[2]);
        } else {
            gradient.addColorStop(0, color);
        }

        ctx.beginPath();
        ctx.arc(outerR, outerR, outerR, 0, Math.PI * 2, true);

        ctx.fillStyle = gradient;
        ctx.fill();
        // ctx.strokeStyle = "rgb(255, 255, 255)";
        // ctx.stroke();

        ctx.closePath();

        return canvas
    }

    return customPK
});