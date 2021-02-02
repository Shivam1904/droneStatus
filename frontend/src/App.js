import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import * as utils from "./utils.js";
import * as constants from "./constants.js";

import "./App.css";

const App = () => {
  const mapContainerRef = useRef(null);

  // Variables used to visualize the motion of drones
  let TICK = 0;
  let MAX_TICK = 9600;

  let drone_info_feat;
  let frontarcRoute = [],
    backarcRoute = [];
  let sourcePoints = [],
    endPoints = [],
    currentdrones = [];
  let selected_drone = null;

  // Initialize map
  mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
  const map = new mapboxgl.Map({
    container: "map",
    style: constants.MAPBOX_STYLE_URL,
    center: constants.MAP_CENTER,
    zoom: 6,
  });

  let popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: true,
    });

  function flyToDrone(latlng, zoom) {
    map.flyTo({
      center: latlng,
      zoom: zoom,
    });
  }

  function resetZoom(){
    flyToDrone(constants.MAP_CENTER, constants.MAP_ZOOM)
  }

  function createPopUp(currentFeature) {
    selected_drone = currentFeature;
    movePopup();
  }

  

  function increase_tick_and_animate() {
    // map.resize();

    // Reset data for new tick
    frontarcRoute = [];
    backarcRoute = [];
    currentdrones = [];

    // Set position at new tick
    drone_info_feat.forEach((drone) => {
      setPosition(drone.properties);
    });

    // Update data for travelled route
    map.getSource("frontarc").setData({
      type: "FeatureCollection",
      features: frontarcRoute,
    });
    // Update data for yet to travelled route
    map.getSource("backarc").setData({
      type: "FeatureCollection",
      features: backarcRoute,
    });
    // Update location of all drones
    map.getSource("currentdrones").setData({
      type: "FeatureCollection",
      features: currentdrones,
    });

    // Update Popup Location
    movePopup();

    // Increment tick to visualize next frame/tick
    TICK++;
    if (TICK < MAX_TICK) {
      // Request next frame
      requestAnimationFrame(increase_tick_and_animate);
    }
  }

  function setDroneArc(drone) {
    let turf_data = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [drone.droneSrc, drone.droneDst],
      },
      properties: {
        step: drone.droneDuration,
      },
    };

    drone.arc = utils.get_turf_arc_coordinates(turf_data);
    drone.totaldistance = utils.get_distance(turf_data);
  }

  function setPosition(drone) {
    let current_idx = TICK - drone.droneStartTime;
    let arc = drone.arc;

    if (current_idx - 1 < 0) {
      drone.droneStatus = "Scheduled";
      drone.travelleddistanceratio = 0;
      current_idx = 0;
    } else if (current_idx >= drone.droneDuration - 1) {
      drone.droneStatus = "Reached";
      drone.travelleddistanceratio = 1;
      current_idx = drone.droneDuration - 2;
    } else {
      drone.travelleddistanceratio = current_idx / arc.length;
      drone.droneStatus = "En Route";
    }

    drone.droneCurrentIdx = current_idx;

    drone.latlng = arc[current_idx];

    let frontarc, backarc;
    frontarc = arc.slice(0, current_idx);
    backarc = arc.slice(current_idx + 1);

    let bearing = turf.bearing(
      turf.point(arc[current_idx]),
      turf.point(arc[current_idx + 1])
    );
    drone.bearing = bearing;

    frontarcRoute.push(utils.createLineData(frontarc, "front"));
    backarcRoute.push(utils.createLineData(backarc, "back"));

    sourcePoints.push(utils.createPointData(drone.droneSrc, drone.droneID, "src"));
    endPoints.push(utils.createPointData(drone.droneDst, drone.droneID, "dst"));

    currentdrones.push(utils.createDroneData(arc[current_idx], drone, "drone"));
  }

  function load_img(url, var_name){
    map.loadImage(
      url,
      (error, image) => {
        if (error) throw error;
        map.addImage(var_name, image);
      }
    );
  }

  function showLatLngPopup(data){
    map.getCanvas().style.cursor = "pointer";
    let coordinates = data.features[0].geometry.coordinates.slice();
    let lat = coordinates[0].toFixed(3);
    let lng = coordinates[1].toFixed(3);
    popup.setLngLat(coordinates).setHTML(lat + ", " + lng).addTo(map);
  }

  function initSources() {
    load_img(constants.GREEN_PIN_URL, "green-icon");
    load_img(constants.RED_PIN_URL, "red-icon");

    // Add all source on map
    map.addSource("frontarc", utils.createGeoJSONFeature(frontarcRoute));
    map.addSource("backarc", utils.createGeoJSONFeature(backarcRoute));
    map.addSource("sourcePoints", utils.createGeoJSONFeature(sourcePoints));
    map.addSource("endPoints", utils.createGeoJSONFeature(endPoints));
    map.addSource("currentdrones", utils.createGeoJSONFeature(currentdrones));

    // Add layer for showing route.
    map.addLayer(utils.createLineLayerData("frontarc", "green", 2));
    map.addLayer(utils.createLineLayerData("backarc", "red", 2));

    // Add layer for showing src, dst an drone.
    map.addLayer(utils.createSymbolLayerData("sourcePoints", "green-icon", 0.12));
    map.addLayer(utils.createSymbolLayerData("endPoints", "red-icon", 0.13));
    map.addLayer(utils.createSymbolLayerData("currentdrones", "airport-15", 2));

    // Show pop-up when any drone is clicked.
    map.on('click', function(e) {
      // e.preventDefault();
      selected_drone = null;
      popup.remove();
      
    });
    
    map.on("click", "currentdroneslayer", function (e) {
      let drone_id = e.features[0].properties.droneID;
      focusPopup("link-" + drone_id);
      utils.remove_active_status();
      let listing = document.getElementById("listing-" + drone_id);
      listing.classList.add("active");
    });

    
    // Show LatLng Popup on hover over source/destination
    map.on("mousemove", "sourcePointslayer", function (e) {
      showLatLngPopup(e)
    });
    map.on("mousemove", "endPointslayer", function (e) {
      showLatLngPopup(e)
    });
    map.on("mouseleave", "sourcePointslayer", function () {
      map.getCanvas().style.cursor = ""; 
      popup.remove();
    });
    map.on("mouseleave", "endPointslayer", function () {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    

    // Build the sidebar listing all drones
    buildDroneList(drone_info_feat);

    // Set default focus
    document.getElementById("reset-zoom").addEventListener(
        "click", function () {resetZoom();}
    );

}

  function getClickedDrone(id) {
    let clickedListing;
    for (let i = 0; i < drone_info_feat.length; i++) {
      if (id === "link-" + drone_info_feat[i].properties.droneID) {
        clickedListing = drone_info_feat[i];
      }
    }
    return clickedListing;
  }

  function focusPopup(id) {
    let clickedListing = getClickedDrone(id);
    flyToDrone(clickedListing.properties.latlng, 6.5);
    createPopUp(clickedListing);
  }

  const buildDroneList = (data) => {
    data.forEach(function (store, i) {
      console.log(store.geometry.type);
      if (store.geometry.type == "Point") {
        let prop = store.properties;

        /* Add a new listing section to the sidebar. */
        let listings = document.getElementById("listings");
        let listing = listings.appendChild(document.createElement("div"));
        /* Assign a unique `id` to the listing. */
        listing.id = "listing-" + prop.droneID;
        // Assign the `item` class to each listing for styling.
        listing.className = "item";

        let link = listing.appendChild(document.createElement("a"));
        link.href = "#";
        link.className = "title";
        link.id = "link-" + prop.droneID;
        link.innerHTML = prop.droneName;

        /* Add details to the individual listing. */
        let details = listing.appendChild(document.createElement("div"));
        details.innerHTML = prop.droneID;

        link.addEventListener("click", function (e) {
          focusPopup(this.id);
          utils.remove_active_status();
          this.parentNode.classList.add("active");
        });
      }
    });
  };


  function movePopup() {
    if (selected_drone) {
      let popUps = document.getElementsByClassName("mapboxgl-popup");
      /** Check if there is already a popup on the map and if so, remove it */
      if (popUps[0]) popUps[0].remove();

      popup
        .setLngLat(selected_drone.properties.latlng)
        .setHTML(
          utils.createPopupDiv(selected_drone)
        )
        .addTo(map);
    }
  }


  function initDrones() {
    fetch(constants.BACKEND_URL)
      .then((res) => res.json())
      .then((data) => {
        drone_info_feat = data.features;
        drone_info_feat.forEach((dr) => {
          let drone = dr.properties;
          setDroneArc(drone);
          setPosition(drone);
        });
        initSources();
        map.resize();
        increase_tick_and_animate();
      });
  }

  function resizeMapWindow() {
    map.resize();
  }

  // Intiated when component mounts
  useEffect(() => {
    // add navigation control
    const temp = document.getElementById("map").offsetWidth;
    console.log(temp, temp[0]);

    window.addEventListener('resize', resizeMapWindow);

    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(
      new mapboxgl.FullscreenControl({
        container: document.querySelector("body"),
      })
    );
    map.on("load", () => {
      map.resize();
      initDrones();
    });

  }, []);

  return <div className="map-container" ref={mapContainerRef} />;
};

export default App;
