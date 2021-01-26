import pandas as pd
import numpy as np
import json
from shapely.geometry import Polygon, MultiPolygon, Point, mapping, shape
import matplotlib as plt


    
def format_datetime_series(series):
    #formates generic  timestamp to a string mm/dd/yyyy
    return series.apply(pd.to_datetime).dt.strftime('%m/%d/%Y')

def timeframe_data(df, startdate, enddate):
    #takes a dataframe with a "time" column (so tweets) and selects tweets with a date range
    #formates time to a string mm/dd/yyyy
    start = pd.to_datetime(startdate)
    end = pd.to_datetime(enddate)
    df.time = df.time.apply(pd.to_datetime).dt.tz_convert(None) #convert to datetime and remove timezone data
    df = df[(df.time >= start) & (df.time < end)]
    df.time = format_datetime_series(df.time)
    return df

def stringify_fips(fips, nchars = 5):
    #converts a number into a string of lenth nchars by adding leading 0s
    #eg 32.2 -> '00032'
    fips = str(int(fips))
    while len(fips) < nchars:
        fips = '0' + fips
    return fips

def shapely_to_geojson(polygon):
    polygon = json.loads(json.dumps(mapping(polygon)))
    polygon = {"type": "Feature", "properties": {}, "geometry": polygon}
    return polygon

def geojson_to_shapely(feature):
    return shape(feature)

class NumpyEncoder(json.JSONEncoder):
    """ Custom encoder for numpy data types """
    def default(self, obj):
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):

            return int(obj)

        elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
            if obj.isnan():
                return 'null'
            else:
                return float(obj)

        elif isinstance(obj, (np.complex_, np.complex64, np.complex128)):
            return {'real': obj.real, 'imag': obj.imag}

        elif isinstance(obj, (np.ndarray,)):
            return obj.tolist()

        elif isinstance(obj, (np.bool_)):
            return bool(obj)

        elif isinstance(obj, (np.void)): 
            return None

        return json.JSONEncoder.default(self, obj)
    
def load_json(string):
    return json.loads(string.replace("\'", "\""))