import React, {
    useRef,
    useEffect
} from "react";
import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf'

import "./App.css";
// import blueicon from './bluepin.png';
// import redicon from './redpin.png';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;


const App = () => {
    const mapContainerRef = useRef(null);

    const dronesUrl = "http://localhost:5000/";

    var TICK = 0;
    var drone_info, drone_info_feat;
    var frontarcRoute = [],
        backarcRoute = [];
    var sourcePoints = [],
        endPoints = [],
        currentdrones = [];
    var selected_drone = null;


    // Initialize map  
    const map = new mapboxgl.Map({
        container: 'map',
        // See style options here: https://docs.mapbox.com/api/maps/#styles
        style: "mapbox://styles/mapbox/streets-v11",
        center: [-85.283796, 36],
        zoom: 3.5
    });

    function flyToStore(currentFeature) {
        map.flyTo({
            center: currentFeature.properties.latlng,
            zoom: 3.5
        });
    }

    function createPopUp(currentFeature) {
        selected_drone = currentFeature;
        movePopup();
    }

    function get_arc_coordinates(currentFeature) {
        var lineDistance = turf.length(currentFeature);
        var arc = [];
        // console.log("LINE D: ", currentFeature,lineDistance, lineDistance / currentFeature.properties.step)
        for (var j = 0; j < lineDistance; j += lineDistance / currentFeature.properties.step) {
            var segment = turf.along(currentFeature, j);
            arc.push(segment.geometry.coordinates);
        }

        return arc
    }

    function animate() {
        frontarcRoute = [];
        backarcRoute = [];
        currentdrones = [];

        drone_info_feat.forEach((dr) => {
            var drone = dr.properties;
            setPosition(drone);
        });

        map.getSource('frontarc').setData({
            "type": "FeatureCollection",
            "features": frontarcRoute
        });
        map.getSource('backarc').setData({
            "type": "FeatureCollection",
            "features": backarcRoute
        });
        map.getSource('currentdrones').setData({
            "type": "FeatureCollection",
            "features": currentdrones
        });

        TICK++;
        if (TICK < 500) {
            requestAnimationFrame(animate);
        }

    }

    function setDroneArc(drone) {
        var turf_data = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [drone.droneSrc, drone.droneDst]
            },
            "properties": {
                "step": drone.droneDuration
            }
        };

        var lineDistance = turf.length(turf_data, {units: 'miles'});
        var arc = get_arc_coordinates(turf_data);
        drone.arc = arc;
        drone.totaldistance = lineDistance

    }

    function createLineData(route_list, name){
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": route_list
            },
            "properties": {
                "arcID": name + "route"
            }
        };
    }

    function createPointData(coord, drone_id, name){
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coord
            },
            "properties": {
                "id": name + "_point",
                "droneID": drone_id
            }
        };
    }

    function createDroneData(coord, drone, name){
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coord
            },
            "properties": {
                "bearing": drone.bearing,
                "id": name + "_point",
                "droneID": drone.droneID
            }
        };
    }

    function createGeoJSONFeature(features){
        return {
            'type': 'geojson',
            'data': {
                "type": "FeatureCollection",
                "features": features
            }
        }
    }

    function createLineFeature(features){
        return {
            'type': 'geojson',
            'data': {
                "type": "FeatureCollection",
                "features": features
            }
        }
    }

    function createLineLayerData(name, source, line_color, line_width){
        return {
            'id': name+"layer",
            'source': source,
            'type': 'line',
            'paint': {
                'line-color': line_color,
                'line-width': line_width
            }
        }
    }

    function createLineLayerData(source, line_color, line_width){
        return {
            'id': source+"layer",
            'source': source,
            'type': 'line',
            'paint': {
                'line-color': line_color,
                'line-width': 2
            }
        }
    }

    function createSymbolLayerData(source, icon, icon_size){
        return {
            'id': source+'layer',
            'source': source,
            'type': 'symbol',
            'layout': {
                'icon-image': icon,
                'icon-size': icon_size,
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            },
            'className': 'map_pin'
        }
    }

    function setPosition(drone) {
        var current_idx = TICK - drone.droneStartTime;

        if (current_idx-1 < 0) {
            drone.droneStatus = "Scheduled";
            current_idx = 0;
        }
        else if (current_idx >= drone.droneDuration - 1) {
            drone.droneStatus = "Reached";
            current_idx = drone.droneDuration - 2;
        }
        else {
            drone.droneStatus = "En Route";
        }

        drone.droneCurrentIdx = current_idx;
        
        var arc = drone.arc;
        drone.latlng = arc[current_idx];
        
        var frontarc, backarc;
        frontarc = arc.slice(0, current_idx);
        backarc = arc.slice(current_idx + 1);

        var bearing = turf.bearing(
            turf.point(arc[current_idx]),
            turf.point(arc[current_idx + 1])
        );
        drone.bearing = bearing;

        drone.travelleddistanceratio = current_idx / arc.length;

        frontarcRoute.push(createLineData(frontarc, "front"));
        backarcRoute.push(createLineData(backarc, "back"));

        sourcePoints.push(createPointData(drone.droneSrc, drone.droneID, "src"));
        endPoints.push(createPointData(drone.droneDst, drone.droneID, "dst"));
        
        currentdrones.push(createDroneData(arc[current_idx], drone, "drone"));

    }

    function initSources() {
        map.loadImage('https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Map_pin_icon_green.svg/200px-Map_pin_icon_green.svg.png', (error, image) => {
            if (error) throw error;
            map.addImage('green-icon', image);
        });
        map.loadImage("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Map_pin_icon.svg/200px-Map_pin_icon.svg.png", (error, image) => {
            if (error) throw error;
            map.addImage('red-icon', image);
        });
        // let img = new Image(20,20);
        // img.onload = ()=>map.addImage('bp', img);
        // img.src = redicon

        map.addSource("frontarc", createGeoJSONFeature(frontarcRoute));
        map.addSource("backarc", createGeoJSONFeature(backarcRoute));
        map.addSource("sourcePoints", createGeoJSONFeature(sourcePoints));
        map.addSource("endPoints", createGeoJSONFeature(endPoints));
        map.addSource("currentdrones", createGeoJSONFeature(currentdrones));

        map.addLayer(createLineLayerData("frontarc", "blue", 2));
        map.addLayer(createLineLayerData("backarc", "red", 2));

        map.addLayer(createSymbolLayerData("sourcePoints", 'green-icon', 0.1));
        map.addLayer(createSymbolLayerData("endPoints", 'red-icon', 0.08));
        map.addLayer(createSymbolLayerData("currentdrones", 'airport-15', 1.5));

        map.on('click', 'currentdroneslayer', function (e) {
            focusPopup("link-"+e.features[0].properties.droneID);
            var activeItem = document.getElementsByClassName('active');
            if (activeItem[0]) {
              activeItem[0].classList.remove('active');
            }
            var listing = document.getElementById('listing-' + e.features[0].properties.droneID);
            listing.classList.add('active');
        });
        buildLocationList(drone_info_feat);

    }

    function getClickedDrone(id) {
        var clickedListing;
        for (var i = 0; i < drone_info_feat.length; i++) {
            if (id === "link-" + drone_info_feat[i].properties.droneID) {
                clickedListing = drone_info_feat[i];
            }
        }
        return clickedListing
    }

    function focusPopup(id) {
        var clickedListing = getClickedDrone(id);
        flyToStore(clickedListing);
        createPopUp(clickedListing);
    }

    const buildLocationList = (data) => {
        data.forEach(function(store, i) {
            console.log(store.geometry.type)
            if (store.geometry.type == "Point") {
                let prop = store.properties;

                /* Add a new listing section to the sidebar. */
                let listings = document.getElementById('listings');
                let listing = listings.appendChild(document.createElement('div'));
                /* Assign a unique `id` to the listing. */
                listing.id = "listing-" + prop.droneID;
                // Assign the `item` class to each listing for styling. 
                listing.className = 'item';

                let link = listing.appendChild(document.createElement('a'));
                link.href = '#';
                link.className = 'title';
                link.id = "link-" + prop.droneID;
                link.innerHTML = prop.droneName;

                /* Add details to the individual listing. */
                let details = listing.appendChild(document.createElement('div'));
                details.innerHTML = prop.droneID;

                link.addEventListener('click', function(e) {
                    focusPopup(this.id);
                    var activeItem = document.getElementsByClassName('active');
                    if (activeItem[0]) {
                      activeItem[0].classList.remove('active');
                    }
                    this.parentNode.classList.add('active');
                });


            }
        });
    }

    function movePopup() {
        if (selected_drone) {

            var popUps = document.getElementsByClassName('mapboxgl-popup');
            /** Check if there is already a popup on the map and if so, remove it */
            if (popUps[0]) popUps[0].remove();

            var popup = new mapboxgl.Popup({
                    closeOnClick: false
                })
                .setLngLat(selected_drone.properties.latlng)
                .setHTML(
                    '<h3>' + selected_drone.properties.droneName + '</h3>' +
                    // '<span id=\'popUpclose\' onclick=\'this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode); return false;\'>x</span>'+
                    '<b>ID: </b>' + selected_drone.properties.droneID + '<br>' +
                    '<b>Status: </b>' + selected_drone.properties.droneStatus + '<br>' +
                    '<b>Dist Travelled: </b>' + parseInt(selected_drone.properties.totaldistance * selected_drone.properties.travelleddistanceratio) + ' miles<br>' +
                    '<b>Total Distance: </b>' + parseInt(selected_drone.properties.totaldistance) + ' miles<br>'
                )
                .addTo(map);
        }

    }


    function initDrones() {
        fetch(dronesUrl).then(res => res.json()).then(data => {
            drone_info = data;
            drone_info_feat = drone_info.features;

            drone_info_feat.forEach((dr) => {
                var drone = dr.properties;
                setDroneArc(drone);
                setPosition(drone);
            });
            initSources();

            animate();

        });
    }



    // when component mounts
    useEffect(() => {
        // add navigation control (zoom buttons)
        map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
        map.on("load", () => {
            initDrones();
        });
    }, []);

    return ( <
        div className = "map-container"
        ref = {
            mapContainerRef
        }
        />
    )
};

export default App;