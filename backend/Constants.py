class Constants():
#     covid_case_file = data_root + 'covid_cases.csv'
#     county_demographics_file = data_root + 'merged_county_data.json'
#     congressional_district_file = data_root + 'congressional_district_data.json'
#     tweet_data = data_root + 'tweet_clusters.json'
#     tweet_files ={
#         'may': data_root + 'may_latlong_tweets.csv',
#         'march': data_root + 'march_latlong_tweets.csv'
#     }

    source_data_root = 'source_data/'
    county_border_file = source_data_root + 'county_geojson.json'
    district_border_file = source_data_root + 'district_geojson.json'
 
    county_group_dict = source_data_root + 'county_overlap.json'
    
    jh_cases_url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv'
    jh_deaths_url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv'
    
    output_data_root = 'output_data/'
    tweet_output_file = output_data_root + 'annotated_tweets.csv'
    covid_cases_output_file = output_data_root + 'covid_cases_and_deaths.csv'
    static_county_data_output_file = output_data_root + 'static_county_data.json'
    aggregated_county_border_output_file = output_data_root + 'aggregated_county_borders.json'