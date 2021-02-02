import React, { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'
import * as utils from './utils.js'
import * as constants from './constants.js'

import './App.css'

function App () {
  const mapContainerRef = useRef(null)

  // Variables used to visualize the motion of drones
  let TICK = 0
  let droneInfoFeat
  let frontarcRoute = []
  let backarcRoute = []
  let currentdrones = []
  const sourcePoints = []
  const endPoints = []
  let selectedDrone = null

  // Initialize map
  mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN
  const map = new mapboxgl.Map({
    container: 'map',
    style: constants.MAPBOX_STYLE_URL,
    center: constants.MAP_CENTER,
    zoom: 6
  })

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: true
  })

  function flyToDrone (latlng, zoom) {
    map.flyTo({
      center: latlng,
      zoom: zoom
    })
  }

  function resetZoom () {
    flyToDrone(constants.MAP_CENTER, constants.MAP_ZOOM)
  }

  function createPopUp (currentFeature) {
    selectedDrone = currentFeature
    movePopup()
  }

  function increaseTickAndAnimate () {
    // resizeMapWindow();
    // Reset data for new tick
    frontarcRoute = []
    backarcRoute = []
    currentdrones = []

    // Set position at new tick
    droneInfoFeat.forEach((drone) => {
      setPosition(drone.properties)
    })

    // Update data for travelled route
    map.getSource('frontarc').setData({
      type: 'FeatureCollection',
      features: frontarcRoute
    })
    // Update data for yet to travelled route
    map.getSource('backarc').setData({
      type: 'FeatureCollection',
      features: backarcRoute
    })
    // Update location of all drones
    map.getSource('currentdrones').setData({
      type: 'FeatureCollection',
      features: currentdrones
    })

    // Update Popup Location
    movePopup()

    // Increment tick to visualize next frame/tick
    TICK++
    if (TICK < constants.MAX_TICK) {
      // Request next frame
      requestAnimationFrame(increaseTickAndAnimate)
    }
  }

  function setDroneArc (drone) {
    const turfData = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [drone.droneSrc, drone.droneDst]
      },
      properties: {
        step: drone.droneDuration
      }
    }

    drone.arc = utils.getTurfArcCoordinates(turfData)
    drone.totaldistance = utils.getDistance(turfData)
  }

  function setPosition (drone) {
    let currentIdx = TICK - drone.droneStartTime
    const arc = drone.arc

    if (currentIdx - 1 < 0) {
      drone.droneStatus = 'Scheduled'
      drone.travelleddistanceratio = 0
      currentIdx = 0
    } else if (currentIdx >= drone.droneDuration - 1) {
      drone.droneStatus = 'Reached'
      drone.travelleddistanceratio = 1
      currentIdx = drone.droneDuration - 2
    } else {
      drone.travelleddistanceratio = currentIdx / arc.length
      drone.droneStatus = 'En Route'
    }

    drone.droneCurrentIdx = currentIdx

    drone.latlng = arc[currentIdx]

    const bearing = turf.bearing(
      turf.point(arc[currentIdx]),
      turf.point(arc[currentIdx + 1])
    )
    drone.bearing = bearing

    frontarcRoute.push(utils.createLineData(arc.slice(0, currentIdx), 'front'))
    backarcRoute.push(utils.createLineData(arc.slice(currentIdx + 1), 'back'))

    sourcePoints.push(utils.createPointData(drone.droneSrc, drone.droneID, 'src'))
    endPoints.push(utils.createPointData(drone.droneDst, drone.droneID, 'dst'))

    currentdrones.push(utils.createDroneData(arc[currentIdx], drone, 'drone'))
  }

  function loadImg (url, varName) {
    map.loadImage(
      url,
      (error, image) => {
        if (error) { throw error }
        map.addImage(varName, image)
      }
    )
  }

  function showLatLngPopup (data) {
    map.getCanvas().style.cursor = 'pointer'
    const coordinates = data.features[0].geometry.coordinates.slice()
    const lat = coordinates[0].toFixed(3)
    const lng = coordinates[1].toFixed(3)
    popup.setLngLat(coordinates).setHTML(lat + ', ' + lng).addTo(map)
  }

  function initSources () {
    loadImg(constants.GREEN_PIN_URL, 'green-icon')
    loadImg(constants.RED_PIN_URL, 'red-icon')

    // Add all source on map
    map.addSource('frontarc', utils.createGeoJSONFeature(frontarcRoute))
    map.addSource('backarc', utils.createGeoJSONFeature(backarcRoute))
    map.addSource('sourcePoints', utils.createGeoJSONFeature(sourcePoints))
    map.addSource('endPoints', utils.createGeoJSONFeature(endPoints))
    map.addSource('currentdrones', utils.createGeoJSONFeature(currentdrones))

    // Add layer for showing route.
    map.addLayer(utils.createLineLayerData('frontarc', 'green', 2))
    map.addLayer(utils.createLineLayerData('backarc', 'red', 2))

    // Add layer for showing src, dst an drone.
    map.addLayer(utils.createSymbolLayerData('sourcePoints', 'green-icon', 0.12))
    map.addLayer(utils.createSymbolLayerData('endPoints', 'red-icon', 0.13))
    map.addLayer(utils.createSymbolLayerData('currentdrones', 'airport-15', 2))

    // Show pop-up when any drone is clicked.
    map.on('click', function (e) {
      // e.preventDefault();
      selectedDrone = null
      popup.remove()
    })

    map.on('click', 'currentdroneslayer', function (e) {
      const droneId = e.features[0].properties.droneID
      focusPopup('link-' + droneId)
      utils.removeActiveStatus()
      const listing = document.getElementById('listing-' + droneId)
      listing.classList.add('active')
    })

    // Show LatLng Popup on hover over source/destination
    map.on('mousemove', 'sourcePointslayer', function (e) {
      showLatLngPopup(e)
    })
    map.on('mousemove', 'endPointslayer', function (e) {
      showLatLngPopup(e)
    })
    map.on('mouseleave', 'sourcePointslayer', function () {
      map.getCanvas().style.cursor = ''
      popup.remove()
    })
    map.on('mouseleave', 'endPointslayer', function () {
      map.getCanvas().style.cursor = ''
      popup.remove()
    })

    // Build the sidebar listing all drones
    buildDroneList(droneInfoFeat)

    // Set default focus
    document.getElementById('reset-zoom').addEventListener(
      'click', function () { resetZoom() }
    )
  }

  function getClickedDrone (id) {
    let clickedListing
    for (let i = 0; i < droneInfoFeat.length; i++) {
      if (id === 'link-' + droneInfoFeat[i].properties.droneID) {
        clickedListing = droneInfoFeat[i]
      }
    }
    return clickedListing
  }

  function focusPopup (id) {
    const clickedListing = getClickedDrone(id)
    flyToDrone(clickedListing.properties.latlng, 6.5)
    createPopUp(clickedListing)
  }

  const buildDroneList = (data) => {
    data.forEach(function (store, i) {
      if (store.geometry.type === 'Point') {
        const prop = store.properties

        /* Add a new listing section to the sidebar. */
        const listings = document.getElementById('listings')
        const listing = listings.appendChild(document.createElement('div'))
        /* Assign a unique `id` to the listing. */
        listing.id = 'listing-' + prop.droneID
        // Assign the `item` class to each listing for styling.
        listing.className = 'item'

        const link = listing.appendChild(document.createElement('a'))
        link.href = '#'
        link.className = 'title'
        link.id = 'link-' + prop.droneID
        link.innerHTML = prop.droneName

        /* Add details to the individual listing. */
        const details = listing.appendChild(document.createElement('div'))
        details.innerHTML = 'ID: ' + prop.droneID

        link.addEventListener('click', function (e) {
          focusPopup(this.id)
          utils.removeActiveStatus()
          this.parentNode.classList.add('active')
        })
      }
    })
  }

  function movePopup () {
    if (selectedDrone) {
      const popUps = document.getElementsByClassName('mapboxgl-popup')
      /** Check if there is already a popup on the map and if so, remove it */
      if (popUps[0]) { popUps[0].remove() }

      popup
        .setLngLat(selectedDrone.properties.latlng)
        .setHTML(
          utils.createPopupDiv(selectedDrone)
        )
        .addTo(map)
    }
  }

  function initDrones () {
    fetch(constants.BACKEND_URL)
      .then((res) => res.json())
      .then((data) => {
        droneInfoFeat = data.features
        droneInfoFeat.forEach((drone) => {
          setDroneArc(drone.properties)
          setPosition(drone.properties)
        })
        initSources()
        resizeMapWindow()
        increaseTickAndAnimate()
      })
  }

  function resizeMapWindow () {
    map.resize()
  }

  // Intiated when component mounts
  useEffect(() => {
    map.addControl(new mapboxgl.NavigationControl())
    map.on('load', () => {
      resizeMapWindow()
      initDrones()
    })
  }, [])

  return <div className="map-container" ref={mapContainerRef} />
}

export default App
