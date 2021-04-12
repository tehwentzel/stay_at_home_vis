from flask import Flask, jsonify, request
from DataApi import DataProcessor
from flask_cors import CORS
import json
import numpy as np
from Constants import Constants

app = Flask(__name__)
CORS(app)
print('code yay')

data = DataProcessor()

def np_converter(obj):
    #converts stuff to vanilla python  for json since it gives an error with np.int64 and arrays
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.float) or isinstance(obj, float):
        #this doesnt work?
        return round(float(obj),3)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, datetime.datetime):
        return obj.__str__()

def responsify(dictionary):
    djson = json.dumps(dictionary,default=np_converter)
    resp = app.response_class(
        response=djson,
        mimetype='application/json',
        status=200
    )
    return resp

@app.route('/')
def test():
    return 'test succesful'

@app.route('/frames',methods=['GET'])
def get_frameview_data():
    frameview_dict = data.load_frameview_dict()
    return responsify(frameview_dict)

@app.route('/timeline',methods=["GET"])
def get_timeline_data():
    n_days = request.args.get('nDays',None)
    if n_days is not None:
        n_days = int(n_days)
    else:
        n_days = 3
    timeline_dict = data.load_timeline_dict(n_days=n_days)
    return responsify(timeline_dict)

@app.route('/countys',methods=['GET'])
def get_county_data():
    #should return aggregate statistics for each county
    #{ dict(key: values, key: value)}
    #items are frames (Authority etc = 0.0 or 1.0), demographic stuff, cases/deaths_change, median_cases_death
    county_dict = data.load_county_dict()
    return responsify(county_dict)

@app.route('/map',methods=['GET'])
def get_map_borders():
    #should return a file of he format {geoid: {type: Feature, properties: {}, 'geometry': <geojson entry>},...}
    #aggregate will give combined stuff with a 4 digit id, normal will have 5 digit
    aggregate = request.args.get('aggregate',False)
    if aggregate:
        borders = data.aggregate_borders
    else:
        borders = data.county_borders
    return responsify(borders)

@app.route('/clusters',methods=['GET'])
def get_cluster_data():
    default_fields = ['net_dem_president_votes','urm_pct','urm_pct']
    c_fields = request.args.getlist('clusterFields')
    if len(c_fields) <= 0:
        c_fields = default_fields
    cluster_dict = data.load_cluster_dict(c_fields)
    return responsify(cluster_dict)

@app.route('/framelist')
def get_moral_frames():
    frames = data.get_frames()
    return responsify(frames)

@app.route('/demographicslist')
def get_avaliable_demographics():
    return responsify(data.demographic_fields)