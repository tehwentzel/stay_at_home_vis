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
        #this code is doesn't work in this context but if it's not pre-loaded it should be done in the original script
        # df = processed_county_demographics()
        # df.loc[:,'features'] = df.geometry.apply(lambda x: mapping(x))
        # return pd.DataFrame(df).drop(['geometry'],axis=1).to_dict(orient='index')
    
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
        
class TweetClusterer():
    
    def __init__(self,fields,id_field='case_id', n_clusters=4, quant_bins=30):
        self.fields = fields
        self.bins= quant_bins
        self.id_field=id_field
        self.n_clusters = n_clusters
        self.discretizer = KBinsDiscretizer(quant_bins,encode='ordinal')
        self.clusterer = AgglomerativeClustering(n_clusters,linkage='ward')
        
    def transform(self,x):
        return self.clusterer.fit_predict(x)
    
    def fit_kbins(self,x):
        self.discretizer.fit(x)
        
    def valid_fields(self,field_lists):
        #returns the fields in self.fields that are in a list of lists of columns
        #for figuring out what fields to reguarlize
        to_keep = set(self.fields)
        for field_list in field_lists:
            to_keep = to_keep.intersection(set(field_list))
        return sorted(to_keep)
        
    def transform_df(self,tweet_df, county_df):
        #dataframe should have an id as an index for this to work good with linking in UI
        #will calculate quantiles based on the county
        try:
            #figure out what data is in the demographics so we can regularize it - so we ignore derived stuff
            regularize_fields = self.valid_fields([tweet_df.columns,county_df.columns])
            default_fields = sorted(set(self.fields) - set(regularize_fields))
            cdata = county_df.loc[:,regularize_fields].values
            self.fit_kbins(cdata)
            
            #regularize fields based on county-level quantiles
            tdf = tweet_df.copy() 
            transform_tdata = tdf.loc[:,regularize_fields].values
            tdf.loc[:,regularize_fields] = self.discretizer.transform(transform_tdata)
            
            #but we are clustering the tweets
            tdata = tweet_df.loc[:,self.fields].values
            tindex = tdf.reset_index().loc[:,self.id_field]
            
            tclusters = self.transform(tdata)
            
            #should be 2 columns: cluster and the class id_field (for merging later)
            cluster_series = pd.DataFrame(tclusters,index=tindex,columns=['cluster'])
            cluster_series = cluster_series.reset_index()
#             self.current_clusters = cluster_series
            return cluster_series
        except Exception as e:
            print('error in transform_df', e)
            
    def add_clusters(self,augmented_tweet_df,county_df):
        cluster_df = self.transform_df(augmented_tweet_df, county_df)
        index = augmented_tweet_df.index.name
        df = augmented_tweet_df.reset_index().merge(cluster_df,on=self.id_field)
        if index is not None:
            df = df.set_index(index)
        return df

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
    
    def augment_tweets(self):
        ddf = self.demographic_df.copy() #bin_edges = self.quantize_demographics(self.demographic_df, self.quant_bins) 
        tdf = self.tweet_df.copy()
        cdf = self.covid_df.copy()
        
        ddf_to_drop = list(set(ddf.columns).intersection(set(['county_name','state_fips'])))
        mdf = tdf.merge(ddf.drop(ddf_to_drop,axis=1),on='GEOID',how='left')
        mdf = mdf.merge(cdf,on=['GEOID','day','month','year'],how='left')
        
        mdf.loc[:,'is_blue'] = (mdf.net_dem_president_votes > 0).astype(int)
        mdf.loc[:,'cases_per_capita'] = (mdf.cases/mdf.cvap)
        mdf.loc[:,'deaths_per_capita'] = (mdf.deaths/mdf.cvap)
        return mdf[mdf.GEOID != 0]

    def stratify_retweet_thresholds(self, n_quantiles=5, retweet_col='retweet_count'):
        tdf = self.tweet_df.copy()
        retweets = tdf[tdf[retweet_col] > 1]
        retweets = retweets[retweet_col]
        quantile_edges =np.quantile(retweets,[0,.2,.4,.6,.8,.9],interpolation='nearest')
        quantile_edges = sorted(set([0,1]).union(set(quantile_edges)))
        quantile_edges = [int(q)  for q in quantile_edges]
        return quantile_edges

    def filter_geolocated(self, df):
        return df[df.GEOID != 0].copy().fillna(-1)
    
    def format_frameview_df(self, month=None,year=None):
        #file to get data formated for the moral-frame view.  need to add int sentiment later
        #only geolocated tweets I guess
        tweet_df = self.filter_geolocated(self.augmented_tweet_df)
        #filter by month if needed.  I think I am not planning on doing that tho
        if month is not None:
            tweet_df = tweet_df[(tweet_df.month == int(month))]
        if year is not None:
            tweet_df = tweet_df[(tweet_df.year == int(year))]

        quantile_thresholds = self.stratify_retweet_thresholds(self.tweet_df.copy())
        frame_data = {}

        for frame in self.frames:
            frame_df = tweet_df[tweet_df[frame] > 0]
            entry = {'total_tweets': frame_df.shape[0]}
            for_rt_quantiles = []
            against_rt_quantiles = []
            for idx, q in enumerate(quantile_thresholds):

                tweets_in_quantile = frame_df[frame_df.retweet_count >= q]
                if idx + 1 < len(quantile_thresholds):
                    maxval = quantile_thresholds[idx+1]
                    tweets_in_quantile = tweets_in_quantile[tweets_in_quantile.retweet_count < maxval]

                for_sah_q = (tweets_in_quantile.for_sah > 0).sum()
                against_sah_q = (tweets_in_quantile.for_sah <= 0).sum()

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
            entry['quantile_bins'] = quantile_thresholds
            entry['high_retweets'] = (frame_df.retweet_count > 100).sum()
            frame_data[frame] = entry
        return pd.DataFrame(frame_data).T.fillna(-1)
    
    def load_frameview_dict(self,month=None,year=None):
        #loads in the data for using in the view with overview dat afor each frame
        frame_df = self.format_frameview_df(month,year)
        return frame_df.to_dict(orient='index')
    
    def load_timeline_dict(self,frame=None,min_retweets = 0, month=None,year=None):
        #get data to use for the big timeline.  Should be similar to the default format for tweets?
        #should be like: {day: [tweets in day as a json object], day2: [...]}
        df = self.filter_geolocated(self.augmented_tweet_df)
        
        #drop extra features, but check that they're in the columns because there's no good way to do that in pandas?
        to_drop = ['screen_name','user_id'] + self.demographic_fields
        df = df.drop(list(set(df.columns).intersection(set(to_drop))),axis=1)
        print(to_drop, df.columns)
        #filter stuff to the selected month and frame
        if frame is not None:
            df = df[df[frame] == 1]
        if month is not None:
            df = df[df.month == month]
        if year is not None:
            df = df[df.year == year]
        #in case we want only popular tweets
        df = df[df.retweet_count >= min_retweets].drop(['month','year'],axis=1)
        tweet_dict = {day:d.to_dict(orient='records') for day,d in df.groupby('day')}
        return tweet_dict
    
    def aggregate_county_demographics(self,ddf):
        #should return a dataframe with aggreagted demographics and the parent congressional district
        #will only keep the demographic fields for now
        d_fields = self.demographic_fields
        ddf.loc[:,d_fields] = ddf.loc[:,d_fields].astype(float)
        sum_fields = ['cvap','net_dem_gov_votes','net_dem_president_votes','repgov']
        median_fields = ['ruralurban_cc']
        wmean_fields = sorted(set(d_fields) - set(sum_fields) - set(median_fields))
        district_data = {}
        for district, sub_df in ddf.groupby('parent'):
            entry = {}
            medians = sub_df.loc[:,median_fields].median().to_dict()
            sums = sub_df.loc[:,sum_fields].sum().to_dict()
            wmeans = {}
            total_pop = sub_df.cvap.sum()
            for wmf in wmean_fields:
                values = sub_df[wmf]*sub_df.cvap
                entry[wmf] = values.sum()/total_pop
            for val_dict in [medians, sums, wmeans]:
                for k,v in val_dict.items():
                    entry[k] = v
            district_data[district] = entry
        district_df = pd.DataFrame(district_data).T
        district_df.index.name = 'parent'
        return district_df.reset_index()
        
    def format_county_data(self, month=None,year=None,aggregate = False):
        #data for the county map
        tdf = self.filter_geolocated(self.augmented_tweet_df.copy())
        if month is not None:
            tdf = tdf[tdf.month == month]
        if year is not None:
            tdf = tdf[tdf.year == year]
            
        ddf = self.demographic_df.copy()
        #aggregates county census data by the containing congressional ditrict.
        if aggregate:
            ddf = self.aggregate_county_demographics(ddf)
        key = 'GEOID' if aggregate is False else 'parent'
        ddf = ddf.set_index(key)
#         ddf.index = ddf.index.astype(int)
        
        frames = self.get_frames()
        
        data_dict = {}
        for geoid, df in tdf.groupby(key):
#             geoid=int(geoid)
            entry = df.loc[:,frames].sum().to_dict()
            entry['total_tweets'] = df.shape[0]
            #average sentiment weighted be popularity of the tweet
            retweet_weights = (df.retweet_count+2).apply(np.log)
            entry['weighted_sentiment'] = ((retweet_weights*df.sentiment_score).sum())/(retweet_weights.sum())
        
            entry['median_deaths'] = df.loc[:,'deaths'].median()
            entry['median_cases'] = df.loc[:,'cases'].median()
            
            calc_change = lambda key: df.loc[:,key].max() - df.loc[:,key].min()
            entry['cases_change'] = calc_change('cases')
            entry['deaths_change'] = calc_change('deaths')
            demographics = ddf.loc[geoid]
            for dem in self.demographic_fields:
                entry[dem] = demographics[dem]
            data_dict[geoid] = entry
        data = pd.DataFrame(data_dict)
        return data
    
    def load_county_dict(self, month=None,year=None,aggregate=False):
        #issue: I'm not aggregating stuff properly????????
        county_df = self.format_county_data(month,year,aggregate).T
        if aggregate:
            map_json = self.aggregate_borders
        else:
            map_json = self.county_borders
        return county_df.to_dict(orient='index')
    
    def tweets_in_cluster(self,tweet_id):
        #given a tweet id (currently case_id), gives the list of ids with the same cluster
        #for linking in the UI
        cc = self.current_tweet_clusters
        if cc is None:
            return []
        active_cluster = cc.loc[tweet_id].cluster
        active_tweets = cc[cc.cluster == active_cluster]
        return active_tweets.index.to_list()
    
    def get_tweet_clusters(self,cluster_fields,n_clusters,identifier='case_id'):
        clusterer = TweetClusterer(cluster_fields, identifier, n_clusters)
        
        tdf = self.filter_geolocated(self.augmented_tweet_df)
        tdf = tdf.drop(self.get_frames(),axis=1)
        tdf = clusterer.add_clusters(tdf,self.demographic_df)
        self.current_tweet_clusters = tdf.loc[:,[identifier,'cluster']].set_index(identifier)
        if 'index' in tdf.columns:
            return tdf.drop('index',axis=1)
        return tdf

    def bin_tweet_features(self,tweet_df,to_discretize,n_bins=10):
        #stuff to skip because it's ordinal
        x_discrete = tweet_df.loc[:,to_discretize].values
        x_discrete = KBinsDiscretizer(n_bins,encode='ordinal',strategy='quantile').fit_transform(x_discrete)
        tdf = tweet_df.copy()
        tdf.loc[:,to_discretize] = x_discrete.astype('int')
        return tdf
    
    def bin_demographics(self,tweet_df,to_discretize,n_bins=10):
        tdf = tweet_df.copy()
        demographics = [x for x in to_discretize if x in self.demographic_fields]
        discretizer = KBinsDiscretizer(n_bins,encode='ordinal')
        x_fit = self.demographic_df.loc[:,demographics].values
        discretizer.fit(x_fit)
        tdf.loc[:,demographics] = discretizer.transform(tdf.loc[:,demographics].values)
        return tdf,demographics
    
    def decile_count(self,values,n_bins):
        decile_counts = []
        for decile in range(n_bins):
            in_decile = (values.astype(int) == int(decile)).sum()
            decile_counts.append(in_decile)
        return decile_counts
            
    def tweet_cluster_df(self,cluster_fields,n_clusters,n_bins=5):
        #should already filter geolocated here
        tcluster_df = self.get_tweet_clusters(cluster_fields,n_clusters)
        to_discretize = ['deaths_per_capita','cases_per_capita','retweet_count']
        tcluster_df = self.bin_tweet_features(tcluster_df,to_discretize,n_bins)
        
        tcluster_df,binned_fields = self.bin_demographics(tcluster_df,cluster_fields,n_bins)
        
        cluster_dict = {}
        for cluster, subdf in tcluster_df.groupby('cluster'):
            cluster_size = subdf.shape[0]
            entry = {'total_tweets': cluster_size}
            
            for field in binned_fields + ['cases_per_capita','deaths_per_capita']:
                values = subdf.loc[:,field]
                entry[field + '_quantiles'] = self.decile_count(values,n_bins)
                
            for_sah_rt = subdf[subdf.for_sah == 1].loc[:,'retweet_count']
            against_sah_rt = subdf[subdf.for_sah < 1].loc[:,'retweet_count']
            entry['for_sah_rt_quantiles'] = self.decile_count(for_sah_rt,n_bins)
            entry['against_sah_rt_quantiles'] = self.decile_count(against_sah_rt,n_bins)
            
            entry['is_blue'] = subdf.is_blue.sum()
            entry['positive_sentiment'] = (subdf.sentiment_score > self.sentiment_threshold).sum()
            entry['negative_sentiment'] = (subdf.sentiment_score < -self.sentiment_threshold).sum()
            #for use in clustering
            entry['GEOIDs'] = list(np.unique(subdf.GEOID))
            entry['parents'] = list(np.unique(subdf.parent))
            cluster_dict[cluster] = entry
        return pd.DataFrame(cluster_dict).T
    
    def load_tweetcluster_dict(self,cluster_fields,n_clusters,n_bins=5):
        cluster_df = self.tweet_cluster_df(cluster_fields,n_clusters,n_bins)
        return cluster_df.to_dict(orient='records')