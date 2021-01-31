from flask import Flask, jsonify
from flask_cors import CORS

import conf

app = Flask(__name__)
CORS(app)


def make_mapboxdata(drone_list):
    point_data = {
        'type': 'FeatureCollection',
        'features': []
    }

    for drone in drone_list:

        point_feat = {
            'type': 'Feature',
            "properties": {
                "droneID": drone.get("droneID"),
                "droneName": drone.get("droneName"),
                "droneSrc": drone.get("droneSrc"),
                "droneDst": drone.get("droneDst"),
                "droneStartTime": drone.get("droneStartTime"),
                "droneDuration": drone.get("droneDuration"),
                "droneCurrentIdx": 0
            },
            'geometry': {
                'type': 'Point',
                'coordinates': None
            }
        }

        point_data["features"].append(point_feat)

    return point_data


# def make_mapboxdatasingle(drone_list, i):
#     route_data = {
#         'type': 'FeatureCollection',
#         'features': []
#     }

#     point_data = {
#         'type': 'FeatureCollection',
#         'features': []
#     }

#     point_feat = {
#         'type': 'Feature',
#         "properties": {
#             "name": drone.get("droneName"),
#             "droneID": drone.get("droneID"),
#                 "status":  drone.get("droneStatus"),
#         },
#         'geometry': {
#             'type': 'Point',
#             'coordinates': drone["locations"]["current"]
#         }
#     }

#     route_data["features"].append(route_feat)
#     point_data["features"].append(point_feat)

#     response = {
#         "route": route_data["features"][i],
#         "point": point_data["features"][i]
#     }

#     return response


# @app.route('/single/')
# def single():
#     drone = make_mapboxdatasingle(conf.DUMMY_DRONE_INFO, 0)
#     return jsonify(drone)


@app.route('/')
def home():
    drone_list = make_mapboxdata(conf.DUMMY_DRONE_INFO)
    return jsonify(drone_list)


if __name__ == "__main__":
    app.run()
