from flask import Flask, jsonify, request
from DataApi import DataProcessor, TweetClusterer
from flask_cors import CORS
import json
import numpy as np
from Constants import Constants

app = Flask(__name__)
CORS(app)

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
    #should return {Frame: {frame data}, Frame: {...}}
    #frame data
    #tweets_counts -> total_tweets, vivid, is_blue, for sah, positive/negative_sentiment
    #tweets in quantiles -> for/against_sah_rt_qunatiles ([1,2,0,5,...])
    frameview_dict = data.load_frameview_dict()
    return responsify(frameview_dict)

@app.route('/timeline',methods=["GET"])
def get_timeline_data():
    #todo: get parameters frame, min_retweets, month, year
    #should return {"1": [{tweet_details},{tweet_details}], "2"}
    #"1" "2" etc refer to the relative day.  Idk why it's a string I can't make it not that ?
    #tweet data is case_id, frames ("Authority": 1/0 etc), is_vivid, for_sah, retweet_count, text, day, sentiment_score, deaths/cases, is_blue, cases/deaths_per_capita
    frame = request.args.get('frame',None)
    month = request.args.get('month',None)
    year = request.args.get('year',None)
    if month is not None:
        month = int(month)
    if year is not None:
        year = int(year)
    timeline_dict = data.load_timeline_dict(frame=frame,month=month,year=year)
    return responsify(timeline_dict)

@app.route('/countys',methods=['GET'])
def get_county_data():
    #should return aggregate statistics for each county
    #{geoid: dict(key: values, key: value)}
    #items are frames (Authority etc = 0.0 or 1.0), demographic stuff, cases/deaths_change, median_cases_death
    month = request.args.get('month',None)
    year = request.args.get('year',None)
    aggregate = request.args.get('aggregate',False)
    if month is not None:
        month = int(month)
    if year is not None:
        year = int(year)
    county_dict = data.load_county_dict(month=month,year=year,aggregate=aggregate)
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
    #should get a list of fields to use for clustering and the # of clusters
    #return a list of json entrys for each cluster
    #[{total_tweets, <fields passed>, cases/deaths_per_captia_quantiles, for/against_sah_rt_quantiles, is_blue, positive/negative_sentiment (county)}]
    default_clusters = 3
    default_fields = ['net_dem_president_votes']

    c_fields = request.args.getlist('cluster_fields')
    n_clusters = request.args.get('n_clusters',default_clusters)

    print()
    print('request args', c_fields, n_clusters)
    print()
    cluster_dict = data.load_tweetcluster_dict(c_fields,int(n_clusters))
    return responsify(cluster_dict)

@app.route('/framelist')
def get_moral_frames():
    frames = data.get_frames()
    return responsify(frames)

@app.route('/demographicslist')
def get_avaliable_demographics():
    return responsify(data.demographic_fields)