import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import * as utils from "./utils.js";
import * as constants from "./constants.js";

import "./App.css";

const App = () => {
  const mapContainerRef = useRef(null);

  // Variables used to visualize the motion of drones
  var TICK = 0;
  var MAX_TICK = 800;

  var drone_info_feat;
  var frontarcRoute = [],
    backarcRoute = [];
  var sourcePoints = [],
    endPoints = [],
    currentdrones = [];
  var selected_drone = null;

  // Initialize map
  mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
  const map = new mapboxgl.Map({
    container: "map",
    style: constants.MAPBOX_STYLE_URL,
    center: constants.MAP_CENTER,
    zoom: 6,
  });

  var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

  function flyToDrone(latlng) {
    map.flyTo({
      center: latlng,
      zoom: 6.5,
    });
  }

  function createPopUp(currentFeature) {
    selected_drone = currentFeature;
    movePopup();
  }

  function get_turf_arc_coordinates(currentFeature) {
    var lineDistance = turf.length(currentFeature);
    var arc = [];
    // console.log("LINE D: ", currentFeature,lineDistance, lineDistance / currentFeature.properties.step)
    for (
      var j = 0;
      j < lineDistance;
      j += lineDistance / currentFeature.properties.step
    ) {
      var segment = turf.along(currentFeature, j);
      arc.push(segment.geometry.coordinates);
    }

    return arc;
  }

  function increase_tick_and_animate() {
    map.resize();

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

    // Increment tick to visualize next frame/tick
    TICK++;
    if (TICK < MAX_TICK) {
      // Request next frame
      requestAnimationFrame(increase_tick_and_animate);
    }
  }

  function setDroneArc(drone) {
    var turf_data = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [drone.droneSrc, drone.droneDst],
      },
      properties: {
        step: drone.droneDuration,
      },
    };

    drone.arc = get_turf_arc_coordinates(turf_data);
    drone.totaldistance = utils.get_distance(turf_data);
  }

  function setPosition(drone) {
    var current_idx = TICK - drone.droneStartTime;
    var arc = drone.arc;

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

    var frontarc, backarc;
    frontarc = arc.slice(0, current_idx);
    backarc = arc.slice(current_idx + 1);

    var bearing = turf.bearing(
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

  function initSources() {
    load_img(constants.GREEN_PIN_URL, "green-icon");
    load_img(constants.RED_PIN_URL, "red-icon");

    map.addSource("frontarc", utils.createGeoJSONFeature(frontarcRoute));
    map.addSource("backarc", utils.createGeoJSONFeature(backarcRoute));
    map.addSource("sourcePoints", utils.createGeoJSONFeature(sourcePoints));
    map.addSource("endPoints", utils.createGeoJSONFeature(endPoints));
    map.addSource("currentdrones", utils.createGeoJSONFeature(currentdrones));

    map.addLayer(utils.createLineLayerData("frontarc", "blue", 2));
    map.addLayer(utils.createLineLayerData("backarc", "red", 2));

    map.addLayer(utils.createSymbolLayerData("sourcePoints", "green-icon", 0.1));
    map.addLayer(utils.createSymbolLayerData("endPoints", "red-icon", 0.08));
    map.addLayer(utils.createSymbolLayerData("currentdrones", "airport-15", 1.5));

    map.on("click", "currentdroneslayer", function (e) {
      console.log("I am getting clicked");
      focusPopup("link-" + e.features[0].properties.droneID);
      var activeItem = document.getElementsByClassName("active");
      if (activeItem[0]) {
        activeItem[0].classList.remove("active");
      }
      var listing = document.getElementById(
        "listing-" + e.features[0].properties.droneID
      );
      listing.classList.add("active");
    });

    var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.on("mouseenter", "sourcePointslayer", function (e) {
      // Change the cursor style as a UI indicator.
      map.getCanvas().style.cursor = "pointer";
      var coordinates = e.features[0].geometry.coordinates.slice();
      var lat, lng;
      lat = coordinates[0].toFixed(3);
      lng = coordinates[1].toFixed(3);
      popup
        .setLngLat(coordinates)
        .setHTML(lat + ", " + lng)
        .addTo(map);
    });
    map.on("mouseleave", "sourcePointslayer", function () {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("mouseenter", "endPointslayer", function (e) {
      // Change the cursor style as a UI indicator.
      map.getCanvas().style.cursor = "pointer";
      var coordinates = e.features[0].geometry.coordinates.slice();
      var lat, lng;
      lat = coordinates[0].toFixed(3);
      lng = coordinates[1].toFixed(3);
      popup
        .setLngLat(coordinates)
        .setHTML(lat + ", " + lng)
        .addTo(map);
    });
    map.on("mouseleave", "endPointslayer", function () {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    buildLocationList(drone_info_feat);

    document
      .getElementById("reset-zoom")
      .addEventListener("click", function () {
        // Set the coordinates of the original point back to origin
        map.flyTo({
          center: [-115.2780982990751, 36.15243],
          zoom: 6,
        });
      });
  }

  function getClickedDrone(id) {
    var clickedListing;
    for (var i = 0; i < drone_info_feat.length; i++) {
      if (id === "link-" + drone_info_feat[i].properties.droneID) {
        clickedListing = drone_info_feat[i];
      }
    }
    return clickedListing;
  }

  function focusPopup(id) {
    var clickedListing = getClickedDrone(id);
    flyToDrone(clickedListing.properties.latlng);
    createPopUp(clickedListing);
  }

  const buildLocationList = (data) => {
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
          var activeItem = document.getElementsByClassName("active");
          if (activeItem[0]) {
            activeItem[0].classList.remove("active");
          }
          this.parentNode.classList.add("active");
        });
      }
    });
  };

  function movePopup() {
    if (selected_drone) {
      var popUps = document.getElementsByClassName("mapboxgl-popup");
      /** Check if there is already a popup on the map and if so, remove it */
      if (popUps[0]) popUps[0].remove();

      var popup = new mapboxgl.Popup({
        closeOnClick: true,
      })
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
          var drone = dr.properties;
          setDroneArc(drone);
          setPosition(drone);
        });
        initSources();
        increase_tick_and_animate();
      });
  }

  // Intiated when component mounts
  useEffect(() => {
    // add navigation control
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
