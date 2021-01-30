import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf'

import "./App.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;


const App = () => {
  const mapContainerRef = useRef(null);
  const flightsUrl = "http://localhost:5000/";
  var drone_data;
  var route;
  var point;
  var markersList=[];

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
      center: currentFeature.geometry.coordinates,
      zoom: 5
    });
  }

  function createPopUp(currentFeature) {
    var popUps = document.getElementsByClassName('mapboxgl-popup');
    /** Check if there is already a popup on the map and if so, remove it */
    if (popUps[0]) popUps[0].remove();

    var popup = new mapboxgl.Popup({ closeOnClick: false })
      .setLngLat(currentFeature.geometry.coordinates)
      .setHTML('<h3>' + currentFeature.properties.name + '</h3><p>  <b>ID: </b>' + currentFeature.properties.droneID + '</p>')
      .addTo(map);   
    }


  function create_marker(currentFeature){
    var coordinates = currentFeature.geometry.coordinates
    var el = document.createElement('div');
    el.className = 'marker';
    // make a marker for each feature and add to the map
    var marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .addTo(map);

    marker.getElement().addEventListener('click', function(e) {
          focusPopup("link-" + currentFeature.properties.droneID);
        });

    return marker;
  
  }

  function get_arc_coordinates(currentFeature){
    var lineDistance = turf.length(currentFeature);
    var arc = [];
    var steps = 200;

    for (var j = 0; j < lineDistance; j += lineDistance / steps) {
      var segment = turf.along(currentFeature, j);
      arc.push(segment.geometry.coordinates);
    }

    return arc
  }

  function afterLoadData() {
          route.features.forEach((marker)=> {
            var arc = get_arc_coordinates(marker);
            marker.geometry.coordinates = arc;
            }
          );

          point.features.forEach((marker)=> {
            create_marker(marker);
            }
          );

          buildLocationList(point);

          map.addSource('route', {
            'type': 'geojson',
            'data': route
          });
                      
          map.addLayer({
            'id': 'route',
            'source': 'route',
            'type': 'line',
            'paint': {
              'line-width': 2,
              'line-color': ['get', 'color']
            }
          }); 
  }

  function getDroneById(id){
    var clickedListing;
    for (var i = 0; i < point.features.length; i++) {
      if (id === "link-" + point.features[i].properties.droneID) {
        clickedListing = point.features[i];
      }
    }
    return clickedListing
  }

  function focusPopup(id){
    var clickedListing = getDroneById(id);
    flyToStore(clickedListing);
    createPopUp(clickedListing);
  }



  const buildLocationList = (data) => {
      data.features.forEach(function(store, i){
        console.log(store.geometry.type)
        if (store.geometry.type == "Point") {
          let prop = store.properties;
          /* Add a new listing section to the sidebar. */
          let listings = document.getElementById('listings');
          let listing = listings.appendChild(document.createElement('div'));
          /* Assign a unique `id` to the listing. */
          listing.id = "listing-" + prop.droneID;
          /* Assign the `item` class to each listing for styling. */
          listing.className = 'item';

          let link = listing.appendChild(document.createElement('a'));
        link.href = '#';
        link.className = 'title';
        link.id = "link-" + prop.droneID;
        link.innerHTML = prop.name;

        /* Add details to the individual listing. */
        let details = listing.appendChild(document.createElement('div'));
        details.innerHTML = prop.droneID;


        /* This will let you use the .remove() function later on */
        if (!('remove' in Element.prototype)) {
          Element.prototype.remove = function() {
            if (this.parentNode) {
              this.parentNode.removeChild(this);
            }
          };
        }

        link.addEventListener('click', function(e){
          focusPopup(this.id);
        });
        
      }
      });
    }

  // when component mounts
  useEffect(() => {
    // add navigation control (zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.on("load", () => {

    fetch(flightsUrl).then(res => res.json()).then(data => {
          route = data["route"];
          point = data["point"];
          console.log("ROute: ", route)
          afterLoadData();

          });
        }); 
    }, []); 

  return (
    <div className="map-container" ref={mapContainerRef} />
  )
};

export default App;