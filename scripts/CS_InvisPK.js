/*
* Copyright 2015-2017 WorldWind Contributors
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

requirejs([
    './newGlobe',
    './transparentPK',
    './layerMenuAll'
], function (newGlobe, transparentPK, menuL) {

    "use strict";

    menuL.arrCS_InvisiPK.forEach(function (e) {
        let csPK = new transparentPK(e.Row.Latitude, e.Row.Longitude);
        csPK.placemark.userProperties.layerType = e.Row.LayerType;
        csPK.placemark.userProperties.layerName = e.Row.LayerName;
        csPK.placemark.userProperties.siteDesc = e.Row.Site_Description;
        csPK.placemark.userProperties.picLocation = e.Row.Picture_Location;
        csPK.placemark.userProperties.url = e.Row.Link_to_site_location;
        csPK.placemark.userProperties.copyright = e.Row.Copyright;

        //add placemark onto placemark layer
        e.wLayer.addRenderable(csPK.placemark);

        // add placemark layer onto worldwind layer obj
        e.wLayer.enabled = false;
        e.wLayer.layerType = 'CS_InvisPK';
        newGlobe.addLayer(e.wLayer);

    });
});