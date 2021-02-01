import * as turf from "@turf/turf";


export function createLineData(route_list, name) {
    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: route_list,
      },
      properties: {
        arcID: name + "route",
      },
    };
  }

export function createPointData(coord, drone_id, name) {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord,
      },
      properties: {
        id: name + "_point",
        droneID: drone_id,
      },
    };
  }


export function createDroneData(coord, drone, name) {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord,
      },
      properties: {
        bearing: drone.bearing,
        id: name + "_point",
        droneID: drone.droneID,
      },
    };
}

export function createGeoJSONFeature(features) {
    return {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: features,
      },
    };
}

export function createLineFeature(features) {
    return {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: features,
      },
};
}

export function createLineLayerData(source, line_color, line_width) {
    return {
      id: source + "layer",
      source: source,
      type: "line",
      paint: {
        "line-color": line_color,
        "line-width": 2,
      },
    };
}


export function createSymbolLayerData(source, icon, icon_size) {
    return {
      id: source + "layer",
      source: source,
      type: "symbol",
      layout: {
        "icon-image": icon,
        "icon-size": icon_size,
        "icon-rotate": ["get", "bearing"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      className: "map_pin",
    };
}


export function createPopupDiv(data){
    return "<h3>" + data.properties.droneName + "</h3>" +
            "<b>ID: </b>" +
            data.properties.droneID +
            "<br>" +
            "<b>Status: </b>" +
            data.properties.droneStatus +
            "<br>" +
            "<b>Dist Travelled: </b>" +
            parseInt(
              data.properties.totaldistance *
                data.properties.travelleddistanceratio
            ) +
            " miles<br>" +
            "<b>Total Distance: </b>" +
            parseInt(data.properties.totaldistance) +
            " miles<br>"
}


export function get_distance(data){
    return turf.length(data, { units: "miles" });
}

export function get_turf_arc_coordinates(currentFeature) {
    var lineDistance = turf.length(currentFeature, { units: "miles" });
    var arc = [];
    for (
      var j = 0; j < lineDistance; j += lineDistance / currentFeature.properties.step) {
      var segment = turf.along(currentFeature, j);
      arc.push(segment.geometry.coordinates);
    }
    return arc;
  }