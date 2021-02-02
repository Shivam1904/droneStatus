# Drone Status App
This repository contains a demo web application displaying current status of delivery-drones. 
![](DroneStatus.gif)

### Tech
* [Backend] - Flask (Python)
* [Frontend] - React + MapboxGL JS

### How to run?

First, we need to setup and start our backend server. I am currently using python version Python 3.8.4 but this should work on any python3 version.

Move to backend folder
```sh
$ cd backend
```
Install virtualenv for creating isolated python environments and activate virtual env.
```sh
$ python3 -m pip install virtualenv
$ virtualenv venv
$ source venv/bin/activate
```
Install python dependencies and start flask server
```sh
(venv) $ pip install -r requirements.txt
(venv) $ flask run
```
This will start our backend server at http://127.0.0.1:5000/ (default).

Now we need to setup and start our frontend server. For that, 

Move to the frontend folder.
```sh
$ cd frontend/
```
Install npm dependencies and start react server
```sh
$ npm install
$ npm start
```
This will start our frontend server at http://127.0.0.1:3000/ (default).