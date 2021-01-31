import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf'

import "./App.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;


const App = () => {
  const mapContainerRef = useRef(null);
  const dronesUrl = "http://localhost:5000/";
  const dronesSingleUrl = "http://localhost:5000/single/";

  var TICK = 0;
  var drone_info, drone_info_feat;
  var frontarcRoute = [], backarcRoute = [];
  var sourcePoints = [], endPoints = [], currentdrones = [];




  var drone_data;
  var selected_drone = null;
  // var route;
  
  // var point;
  var listMarkers=[];
  // var counter = 0;
  var initialListLen = 2;
  var steps = 500;

  // Initialize map  
  const map = new mapboxgl.Map({
    container:'map',
    // See style options here: https://docs.mapbox.com/api/maps/#styles
    style: "mapbox://styles/mapbox/streets-v11",
    center: [-85.283796, 36],
    zoom: 3.5
  });

  function flyToStore(currentFeature) {
    map.flyTo({
      center: currentFeature.properties.latlng,
      zoom: 4
    });
  }

  function createPopUp(currentFeature) {
     selected_drone = currentFeature;
     movePopup();
    }


  // function create_marker(currentPoint){
  //   console.log("creating marker at ",currentPoint);
  //   var coordinates = currentPoint.geometry.coordinates
  //   var el = document.createElement('div');
  //   el.className = 'marker';
  //   // make a marker for each feature and add to the map
  //   var marker = new mapboxgl.Marker(el)
  //     .setLngLat(coordinates)
  //     .addTo(map);

  //   marker.getElement().addEventListener('click', function(e) {
  //         focusPopup("link-" + currentPoint.properties.droneID);
  //       });

  //   return marker;
  
  // }

  function get_arc_coordinates(currentFeature){
    var lineDistance = turf.length(currentFeature);
    var arc = [];
    // console.log("LINE D: ", currentFeature,lineDistance, lineDistance / currentFeature.properties.step)
    for (var j = 0; j < lineDistance; j += lineDistance / currentFeature.properties.step) {
      var segment = turf.along(currentFeature, j);
      arc.push(segment.geometry.coordinates);
    }

    return arc
  }
  function animate(){
    frontarcRoute = [];
    backarcRoute = [];
    currentdrones = [];

    drone_info_feat.forEach((dr)=> {
      var drone = dr.properties;

      // console.log("I am aw ", drone, turf_data)

      var arc = drone.arc;

      var current_idx = TICK - drone.droneStartTime;

      if (current_idx-1 < 0) {
        current_idx = 1;
      }
      if (current_idx >= drone.droneDuration-1) {
        current_idx = drone.droneDuration - 2;
      }
      drone.droneCurrentIdx = current_idx;
      drone.latlng = arc[current_idx];

      var frontarc, backarc;
      frontarc = arc.slice(0, current_idx);
      backarc = arc.slice(current_idx+1);

      var bearing = turf.bearing(
        turf.point(arc[current_idx-1]),
        turf.point(arc[current_idx+1])
      );
      drone.bearing = bearing;

      // console.log("B", bearing)
      console.log("Slice", arc.length, frontarc.length, backarc.length)
      console.log("Sliceval", arc.length, frontarc, backarc)
      frontarcRoute.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": frontarc
        },
        "properties": {
          "arcID": "frontroute"
        }
      }
      );
      

      backarcRoute.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": backarc
        },
        "properties": {
          "arcID": "backroute"
        }
      }
      );

      // console.log("current_idx", arc[current_idx])
      currentdrones.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": arc[current_idx]
        },
        "properties": {
          "bearing": drone.bearing,
          "id": "drone_loc",
          "droneID": drone.droneID
        }
      }
      );

      }
    );
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
      }
    );

    TICK++;
    if(TICK<500){
      requestAnimationFrame(animate);
    }

      console.log("TICKTICKTICK", TICK);


  }

  function afterLoadData() {
    drone_info_feat.forEach((dr)=> {
      var drone = dr.properties;

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

      // console.log("I am aw ", drone, turf_data)

      var arc = get_arc_coordinates(turf_data);

      var current_idx = TICK - drone.droneStartTime;
      if (current_idx < 0) {
        current_idx = 0;
      }
      if (current_idx >= drone.droneDuration-1) {
        current_idx = drone.droneDuration - 1;
      }
      drone.droneCurrentIdx = current_idx;
      drone.latlng = arc[current_idx];
      drone.arc = arc;
      var frontarc, backarc;
      frontarc = arc.slice(0, current_idx);
      backarc = arc.slice(current_idx+1);

      var bearing = turf.bearing(
        turf.point(arc[current_idx]),
        turf.point(arc[current_idx+1])
      );
      drone.bearing = bearing;

      console.log("B", bearing)
      // console.log("Slice", arc, frontarc, backarc)
      frontarcRoute.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": frontarc
        },
        "properties": {
          "arcID": "frontroute"
        }
      }
      );
      

      backarcRoute.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": backarc
        },
        "properties": {
          "arcID": "backroute"
        }
      }
      );


      sourcePoints.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": drone.droneSrc
        },
        "properties": {
          "id": "src_point",
          "droneID": drone.droneID
        }
      }
      );


      endPoints.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": drone.droneDst
        },
        "properties": {
          "id": "dst_point",
          "droneID": drone.droneID
        }
      }
      );

      console.log("current_idx", arc[current_idx])
      currentdrones.push(
      { 
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": arc[current_idx]
        },
        "properties": {
          "bearing": drone.bearing,
          "id": "drone_loc",
          "droneID": drone.droneID
        }
      }
      );

      }
    );
    
    console.log({
          "type": "FeatureCollection",
          "features": frontarcRoute
      })
    map.addSource("frontarc", {
      'type': 'geojson',
      'lineMetrics': true,
      'data': {
          "type": "FeatureCollection",
          "features": frontarcRoute
      }
    });

    map.addSource("backarc", {
      'type': 'geojson',
      'lineMetrics': true,
      'data': {
          "type": "FeatureCollection",
          "features": backarcRoute
      }
    });

    map.addSource("sourcePoints", {
      'type': 'geojson',
      'data': {
          "type": "FeatureCollection",
          "features": sourcePoints
      }
    });

    map.addSource("endPoints", {
      'type': 'geojson',
      'data': {
          "type": "FeatureCollection",
          "features": endPoints
      }
    });

    map.addSource("currentdrones", {
      'type': 'geojson',
      'data': {
          "type": "FeatureCollection",
          "features": currentdrones
      }
    });


    map.addLayer({
      'id': "frontarclayer",
      'source': "frontarc",
      'type': 'line',
      'paint': {
        'line-color': 'red',
        'line-width': 2
      }
    });

    map.addLayer({
      'id': "backarclayer",
      'source': "backarc",
      'type': 'line',
      'paint': {
        'line-color': 'green',
        'line-width': 2
      }
    });


    map.addLayer({
      'id': 'srcpointlayer',
      'source': 'sourcePoints',
      'type': 'symbol',
      'layout': {
      'icon-image': 'marker-11',
        'icon-size': 2,
        'icon-rotate': ['get', 'bearing'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    map.addLayer({
      'id': 'dstpointlayer',
      'source': 'endPoints',
      'type': 'symbol',
      'layout': {
      'icon-image': 'marker-15',
        'icon-size': 3,
        'icon-rotate': ['get', 'bearing'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    map.addLayer({
      'id': 'currentdroneslayer',
      'source': 'currentdrones',
      'type': 'symbol',
      'layout': {
      'icon-image': 'airport-15',
        'icon-size': 2,
        'icon-rotate': ['get', 'bearing'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    buildLocationList(drone_info_feat);


    // map.addSource('point', {
    //   'type': 'geojson',
    //   'data': point
    // });

    // map.on('click', 'point', function (e) {
    //   focusPopup("link-" + e.features[0].properties.droneID);
    // });
  }

  function getClickedDrone(id){
    var clickedListing;
    for (var i = 0; i < drone_info_feat.length; i++) {
      if (id === "link-" + drone_info_feat[i].properties.droneID) {
        clickedListing = drone_info_feat[i];
      }
    }
    return clickedListing
  }

  function focusPopup(id){
    var clickedListing = getClickedDrone(id);
    flyToStore(clickedListing);
    createPopUp(clickedListing);
  }

  const buildLocationList = (data) => {
      data.forEach(function(store, i){
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

          link.addEventListener('click', function(e){
            focusPopup(this.id);
          });
        
      }
      });
    }

  // function moveToLocation(drone, coordinates){
  //   drone.setLngLat(coordinates);
  // }

  function movePopup(){
      if(selected_drone){
        var popUps = document.getElementsByClassName('mapboxgl-popup');
        /** Check if there is already a popup on the map and if so, remove it */
        if (popUps[0]) popUps[0].remove();

        var popup = new mapboxgl.Popup({ closeOnClick: false })
          .setLngLat(selected_drone.properties.latlng)
          .setHTML('<h3>' + selected_drone.properties.droneName + '</h3><p>  <b>ID: </b>' + selected_drone.properties.droneID + '</p>')
          .addTo(map);  
      }

  }

  // function animate(_id, counter) {
  //   console.log(_id,"ididididididid");
  //   var start = route.features[_id].geometry.coordinates[
  //     counter >= steps ? counter - 1 : counter
  //   ];
  //   var end = route.features[_id].geometry.coordinates[
  //     counter >= steps ? counter : counter + 1
  //   ];
  //   if (!start || !end) return;
     
  //   // Update point geometry to a new position based on counter denoting
  //   // the index to access the arc
  //   point.features[_id].geometry.coordinates =
  //   route.features[_id].geometry.coordinates[counter];

     
  //   // Calculate the bearing to ensure the icon is rotated to match the route arc
  //   // The bearing is calculated between the current point and the next point, except
  //   // at the end of the arc, which uses the previous point and the current point
  //   point.features[_id].properties.bearing = turf.bearing(
  //     turf.point(start),
  //     turf.point(end)
  //   );
  //   console.log("AAA: ", 'routelayer'+(_id+1))
  //   map.setPaintProperty(
  //     'routelayer'+(_id+1), 
  //     'line-gradient', 
  //     [
  //       'interpolate',
  //       ['linear'],
  //       ['line-progress'],
  //       0,
  //       'blue',
  //       point.features[_id].geometry.counter/steps-0.01,
  //       'blue',
  //       point.features[_id].geometry.counter/steps,
  //       'green',
  //       point.features[_id].geometry.counter/steps+0.01,
  //       'red',
  //       1,
  //       'red'
  //     ]);

  //     // console.log("Shivam:", 'route-' + marker.properties.droneID)
  //     var r_id = 'route' + (_id+1);
  //     var t_id = 'routelayer' + (_id+1);
      

  //     map.removeLayer(t_id);
  //     map.addLayer({
  //       'id': t_id,
  //       'source': r_id,
  //       'type': 'line',
  //       'paint': {
  //         'line-color': 'red',
  //         'line-width': 2,
  //         'line-gradient':
  //           [
  //             'interpolate',
  //             ['linear'],
  //             ['line-progress'],
  //             0,
  //             'blue',
  //             point.features[_id].geometry.counter/steps-0.01,
  //             'blue',
  //             point.features[_id].geometry.counter/steps,
  //             'green',
  //             point.features[_id].geometry.counter/steps+0.01,
  //             'red',
  //             1,
  //             'red'
  //           ]
  //     }
  //   });  




     
  //   // Update the source with this new data
  //   map.getSource('point').setData(point);

  //   movePopup();
     
  //   // Request the next frame of animation as long as the end has not been reached
  //   if (counter < steps) {
  //     requestAnimationFrame(function(){animate(_id, counter);});
  //   }
     
  //   counter = counter + 1;

  //   point.features[_id].geometry.counter = counter;

  //   }
   
   function initDrones(){

    fetch(dronesUrl).then(res => res.json()).then(data => {
          drone_info = data;
          console.log("data", data)
          drone_info_feat = drone_info.features;
          afterLoadData();
          animate();

          // animate( 0, 0);
          // // animate(1);
          // // animate(2);
          // animate(3, 0);
        }); 
   }

   
   // function nextDrone(){

   //  fetch(dronesSingleUrl).then(res => res.json()).then(data => {
   //        var routeNew = data["route"];
   //        var pointNew = data["point"];

   //        // afterLoadData();
   //        // animate(counter);
   //        console.log("NEW ROUTE", routeNew);
   //        console.log("NEW POINT", pointNew);
   //        console.log("edisting POINT", point);
   //        console.log("edisting route", route);

   //      }); 
   //  }


  // when component mounts
  useEffect(() => {
    // add navigation control (zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.on("load", () => {
      initDrones();
    });
    }, []); 

  return (
    <div className="map-container" ref={mapContainerRef} />
  )
};

export default App;