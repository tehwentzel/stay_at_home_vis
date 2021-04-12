from Constants import Constants
import Utils
import pandas as pd
import numpy as np
import matplotlib as plt
import json
from sklearn.preprocessing import KBinsDiscretizer, quantile_transform
from sklearn.cluster import AgglomerativeClustering


def load_static_county_data(file=Constants.static_county_data_output_file):
    try:
        with open(file,'r') as f:
            df = json.load(f)
        return df
    except Exception as e:
        print(e)
#         df = processed_county_demographics()
#         df.loc[:,'features'] = df.geometry.apply(lambda x: mapping(x))
#         return pd.DataFrame(df).drop(['geometry'],axis=1).to_dict(orient='index')
    
def load_census_df(file=Constants.static_county_data_output_file):
    df = pd.DataFrame(load_static_county_data()).T
    df.index.name = 'GEOID'
    df = df.drop(['county_fips','features'],axis=1).reset_index()
    df.GEOID = df.GEOID.astype(int)
    return df

def make_geojson(feature_entry):
    gj = {"type": "Feature", "properties": {}, "geometry": feature_entry}
    return gj

def load_county_border_dict(border_json=Constants.static_county_data_output_file):
    #should give {geoid: <geojson item> for each county}
    try:
        with open(border_json,'r') as f:
            border_dict = json.load(f)
        borders = pd.DataFrame(border_dict).T
        borders.index.name = "GEOID"
        return borders.features.apply(make_geojson).to_dict()
    except Exception as e:
        print(e)
        
def load_aggregate_border_dict(border_json=Constants.aggregated_county_border_output_file):
    #should give {geoid: <geojson item> for each group of countys}
    try:
        with open(border_json,'r') as f:
            aggregate_borders = json.load(f)
        return aggregate_borders
    except Exception as e:
        print(e)
        
def get_date_blocks(n_days = 4):
    blocks = []
    curr_day = 1
    while curr_day <= 30:
        max_day = curr_day + n_days
        if max_day > 29:
            max_day = 32
        new_block = np.arange(curr_day, max_day)
        blocks.append(set(new_block))
        curr_day = max_day
    return blocks

def get_date_string(month_int, day_int):
            return str(month_int) + '/' + str(day_int) 
    
class DataProcessor():
    
    def __init__(self, quant_bins = 5):
        self.quant_bins = quant_bins
        self.sentiment_threshold = .25
        self.demographic_df = load_census_df()
        self.demographic_fields = self.get_demographic_fields(self.demographic_df)
        
        self.tweet_df = pd.read_csv(Constants.tweet_output_file)#,dtype={'GEOID':int})
        covid_df = pd.read_csv(Constants.covid_cases_output_file)#,dtype={'GEOID':int})
        self.covid_df = covid_df.drop('Unnamed: 0', axis=1)
        
        self.augmented_tweet_df = self.augment_tweets()
        
        #currently loads in as a dict {id:<geojson string>,...}
        self.county_borders = load_county_border_dict()
        self.aggregate_borders = load_aggregate_border_dict()
        
        self.frames = self.get_frames()
        self.current_tweet_clusters = None
        
    def get_frames(self):
        frames = ['Authority','Betrayal',
                  'Care','Degradation',
                  'Fairness','Freedom',
                  'Harm','Injustice',
                  'Loyalty','Oppression',
                  'Purity','Subversion'
                 ]
        return frames
    
    def get_demographic_fields(self, demographic_df):
        #extract columns that are census/county numerical data
        d_fields = set(demographic_df.columns)
        extra_fields = set(['GEOID','parent','state_fips','county_name'])
        return list(d_fields - extra_fields)
    
    def discretize(self, series, quant_bins = None):
        if quant_bins is None:
            quant_bins = self.quant_bins
        discretizer = KBinsDiscretizer(quant_bins,encode='ordinal',strategy='uniform')
        discretizer.fit(series.dropna().values.reshape(-1,1))
        return discretizer.transform(series.values.reshape(-1,1))
    
    def add_discretized_column(self,df,colname,quant_bins=None):
        new_colname = colname + '_discrete'
        ndf = df.copy()
        ndf.loc[:,new_colname] = self.discretize(ndf.loc[:,colname],quant_bins)
        return ndf
    
    def discretize_rt_count(self,rt_value):
        #split rt count into 0, > 1 and >10 for plotting
        if rt_value < 1:
            return 0
        elif rt_value < 10:
            return 1
        else:
            return 2
    
    def augment_tweets(self):
        ddf = self.demographic_df.copy() #bin_edges = self.quantize_demographics(self.demographic_df, self.quant_bins) 
        tdf = self.tweet_df.copy()
        cdf = self.covid_df.copy()
        
        ddf_to_drop = list(set(ddf.columns).intersection(set(['county_name','state_fips'])))
        mdf = tdf.merge(ddf.drop(ddf_to_drop,axis=1),on='GEOID',how='left')
        mdf = mdf.merge(cdf,on=['GEOID','day','month','year'],how='left')
        
        mdf = mdf[mdf.GEOID != 0]
        mdf.loc[:,'is_blue'] = (mdf.net_dem_president_votes > 0).astype(int)
        mdf.loc[:,'cases_per_capita'] = (mdf.cases/mdf.cvap)
        to_discretize = ['cases_per_capita']
        for col in to_discretize:
            mdf = self.add_discretized_column(mdf, col, quant_bins = 10)
            
        mdf.loc[:,'rt_discrete'] = mdf.retweet_count.apply(self.discretize_rt_count)
        return mdf
    
    def filter_geolocated(self, df):
        return df[df.GEOID != 0].copy().fillna(-1)
    
    def compute_avg_sentiment(self, ddf):
            weights = (ddf.rt_discrete + 1)**.5
            sentiment = (ddf.sentiment_score * weights).sum()/weights.sum()
            return sentiment
    
    def add_covid_to_counties(self, dem_df):
        cdf = self.covid_df.sort_values(by=['year','month','day'],kind='mergesort')
        ddf = dem_df.copy()
        for geoid, subdf in ddf.groupby("GEOID"):
            sub_cdf = cdf[cdf.GEOID == geoid]
            geo_idx = subdf.index
            ddf.loc[geo_idx,'median_cases'] = sub_cdf.cases.median()
            ddf.loc[geo_idx,'median_deaths'] = sub_cdf.deaths.median()
            ddf.loc[geo_idx,'max_cases'] = sub_cdf.cases.max()
            ddf.loc[geo_idx,'max_deaths'] = sub_cdf.deaths.max()
            
            first = sub_cdf.iloc[0]
            last = sub_cdf.iloc[-1]
            ddf.loc[geo_idx,'cases_change'] = last.cases - first.cases
            ddf.loc[geo_idx,'deaths_change'] = last.deaths - first.deaths
        return ddf
    
    def format_county_data(self):
        #data for the county map
        tdf = self.filter_geolocated(self.augmented_tweet_df.copy())
        ddf = self.demographic_df.copy()
        ddf = self.add_covid_to_counties(ddf)
        
        key = 'GEOID'
        ddf = ddf.set_index(key)
        
        frames = self.get_frames()
        
        data_dict = {}
        for geoid, dem_subdf in ddf.groupby(key):
            tweet_subdf = tdf[tdf[key] == geoid]
            if tweet_subdf.shape[0] == 0:
                entry = {f: 0 for f in frames}
                entry['avg_sentiment'] = 0
            else:
                entry = tweet_subdf.loc[:,frames].sum().to_dict()
                entry['avg_sentiment'] = self.compute_avg_sentiment(tweet_subdf)
                
            entry['total_tweets'] = tweet_subdf.shape[0]
        
            demographics = ddf.loc[geoid]
            copy_fields = self.demographic_fields + ['median_cases','max_cases','cases_change']
            for dem in copy_fields:
                entry[dem] = demographics[dem]
            data_dict[geoid] = entry
        data = pd.DataFrame(data_dict)
        return data
    
    def load_county_dict(self):
        #issue: I'm not aggregating stuff properly????????
        county_df = self.format_county_data().T
#         if aggregate:
#             map_json = self.aggregate_borders
#         else:
        map_json = self.county_borders
            
        county_df.index.name = 'GEOID'
        county_dict = county_df.reset_index().to_dict(orient='records')
        return {'demographics': county_dict, 'borders': map_json}
    
    def stratify_retweet_thresholds(self, n_quantiles = 3, retweet_col='retweet_count'):
        tdf = self.tweet_df.copy()
        retweets = tdf[tdf[retweet_col] > 1]
        retweets = retweets[retweet_col]
        quantile_edges =np.quantile(retweets, np.linspace(0,1,n_quantiles), interpolation='nearest')
        quantile_edges = sorted(set([0,1]).union(set(quantile_edges)))
        quantile_edges = [int(q)  for q in quantile_edges]
        return quantile_edges
    
    def format_frameview_df(self):
        #file to get data formated for the moral-frame view.  need to add int sentiment later
        #only geolocated tweets I guess
        tweet_df = self.filter_geolocated(self.augmented_tweet_df)
        #filter by month if needed.  I think I am not planning on doing that tho

        rt_levels = sorted(np.unique(tweet_df.rt_discrete))
        frame_data = {}

        for frame in self.frames:
            frame_df = tweet_df[tweet_df[frame] > 0]
            entry = {'total_tweets': frame_df.shape[0]}
            for_rt_quantiles = []
            against_rt_quantiles = []
            for rt_level in rt_levels:
                subdf = frame_df[frame_df.rt_discrete == rt_level]
                for_sah_q = (subdf.for_sah > 0).sum()
                against_sah_q = (subdf.for_sah <= 0).sum()

                for_rt_quantiles.append(for_sah_q)
                against_rt_quantiles.append(against_sah_q)
    
            entry['vivid'] = frame_df.is_vivid.sum()
            entry['for_sah'] = frame_df.for_sah.sum()
            entry['is_blue'] = frame_df.is_blue.sum()
            entry['for_sah_rt_quantiles'] = for_rt_quantiles
            entry['against_sah_rt_quantiles'] = against_rt_quantiles
            entry['positive_sentiment'] = (frame_df.sentiment_score > self.sentiment_threshold).sum()
            entry['negative_sentiment'] = (frame_df.sentiment_score < -self.sentiment_threshold).sum()
            #these are for future use maybe.  not efficient but it's like 5 values so i don't care
            frame_data[frame] = entry
        return pd.DataFrame(frame_data).T.fillna(-1)
    
    def load_frameview_dict(self):
        #loads in the data for using in the view with overview dat afor each frame
        frame_df = self.format_frameview_df()
        return frame_df.to_dict(orient='index')
    
    def load_tweet_df(self, min_retweets = 0):
        #get data to use for the big timeline and the clusters, at once
        df = self.filter_geolocated(self.augmented_tweet_df)
        
        #drop extra features, but check that they're in the columns because there's no good way to do that in pandas?
        to_drop = ['screen_name','user_id'] + self.demographic_fields
        to_drop.remove('cvap')
        df = df.drop(list(set(df.columns).intersection(set(to_drop))),axis=1)
        #filter stuff to the selected month and frame
        #in case we want only popular tweets
        df = df[df.retweet_count >= min_retweets]
#         tweet_dict = {day:d.to_dict(orient='records') for day,d in df.groupby('day')}
        return df
    
    def split_along_median(self, df, strat):
    #look at the county stuff?  won't work good for cases tho
        if 'cases' in strat or 'deaths' in strat:
            strat_df = df.groupby('GEOID').max()
        else:
            strat_df = df.groupby('GEOID').first()
        median = strat_df[strat].median()
        upper_split = df[df[strat] > median]
        lower_split = df[df[strat] <= median]
        return [lower_split, upper_split]

    def split_demographics(self, df, strat_list):
        #stratifys along the median for each demographic variable.  can do it twice
        #will add in group_num, in order of low-low, low-high, high-low, high-high, etc
        splits = [df.copy()]
        for strat in strat_list:
            new_splits = []
            for entry in splits:
                new_split = self.split_along_median(entry, strat)
                new_splits.extend(new_split)
            splits = new_splits
        for i, split in enumerate(splits):
            nsplit = self.format_cluster_df(split, strat_list)
            nsplit.loc[:,'group_num'] = i
            splits[i] = nsplit
        split_df = pd.concat(splits)
        return split_df

    def format_cluster_df(self, sdf, strat_list):
        to_keep = ['cases_per_capita_discrete','retweet_count','rt_discrete','for_sah','is_vivid','is_blue','sentiment_score']
        to_keep = to_keep + self.frames + ['GEOID']
        to_keep = list(set(to_keep + strat_list))
        new_sdf = sdf.loc[:,to_keep]
        return new_sdf

    def load_cluster_dict(self, strat_list):
        sdf = self.split_demographics(self.augmented_tweet_df, strat_list)
        to_calibrate = strat_list + ['cases_per_capita_discrete','retweet_count']
        maxes = {s: float(sdf.loc[:,s].max()) for s in to_calibrate}
        mins = {s: float(sdf.loc[:,s].min()) for s in to_calibrate}
        #data for showing each cluster
        entrys = []
        #map of the group of each geoid so I can send it up to use for brushing and linking
        geoid_group_dict = {}
        for group, subdf in sdf.groupby('group_num'):
            entry = {}
            entry['group_num'] = int(group)
            entry['total_tweets'] = int(subdf.shape[0])
            for bool_val in ['for_sah','is_vivid','is_blue'] + self.frames:
                entry[bool_val] = int((subdf[bool_val] == 1).sum())
            entry['positive_sentiment'] = (subdf.sentiment_score > self.sentiment_threshold).sum()
            entry['negative_sentiment'] = (subdf.sentiment_score < -self.sentiment_threshold).sum()
            for geoid in np.unique(subdf.loc[:,'GEOID'].values):
                geoid_group_dict[int(geoid)] = int(group)
            for var in to_calibrate:
                entry[var] = sorted(subdf.loc[:,var].astype(float).tolist())
            entrys.append(entry)
        c_dict = {'data': entrys, 'geoid_group_dict': geoid_group_dict}
        for var in to_calibrate:
            c_dict[var] = {'max': maxes[var], 'min': mins[var]}
        return c_dict
    
    def load_timeline_dict(self, n_days = 3):
    #tweets for the timline
    #data format: [{position, avg_sentiment, start_date, end_date, total_rt_for, total_rt_against, tweets_list}]
    #tweets list format: [{tweet values},...]
    #general format: {max_rt_discrete_for, max_rt_discrete_against, data}
    #n_days is an approximate count of the days in a "position", rounds the values for the end of months so there is no month crossover
    #total_rt_for/against are the discretize rt counts (0, 1-10, 10+)

        frames = self.get_frames()

        tdf = self.load_tweet_df()

        sunique = lambda f: sorted(np.unique(tdf[f]))
        months = sunique('month')

        date_blocks = get_date_blocks(n_days)
        tweet_lists = []
        curr_block = 0
        max_rt_for = 0
        max_rt_against = 0
        max_cases_per_capita_discrete = 0;
        for month in months:
            mdf = tdf[tdf.month == month]
            for db in date_blocks:
                ddf = mdf[mdf.day.isin(db)]
                if ddf.shape[0] == 0:
                    continue
        #         block_tweets = ddf.drop(['sentiment_score'],axis=1).to_dict(orient='records')
                avg_sentiment = self.compute_avg_sentiment(ddf)
                entry = {'pos': curr_block, 'avg_sentiment': avg_sentiment}
                entry['start_date'] = get_date_string(month, min(db))
                entry['end_date'] = get_date_string(month, max(db))
                
                def get_rt(y):
                    return ddf[ddf.for_sah == y].rt_discrete.apply(lambda x: x+1).sum()

                entry['total_rt_for'] = get_rt(1)
                entry['total_rt_against'] = get_rt(0)
                max_rt_for = max(entry['total_rt_for'], max_rt_for)
                max_rt_against = max(entry['total_rt_against'], max_rt_against)
                max_cases_per_capita_discrete = ddf.cases_per_capita_discrete.max()
                max_cases_per_capita = ddf.cases_per_capita.max()

                entry['tweets'] = ddf.drop(['sentiment_score'],axis=1).to_dict(orient='records')
                curr_block += 1
                tweet_lists.append(entry)
        #add the max for/against for callibration purposes
        return {'data': tweet_lists, 'max_rt_discrete_for': max_rt_for, 'max_rt_discrete_against': max_rt_against, 'max_cases_per_capita_discrete': max_cases_per_capita_discrete, 'max_cases_per_capita': max_cases_per_capita}

