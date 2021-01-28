import * as constants from './Constants';
const querystring = require('querystring');

export default class DataService {

    constructor(args){
        this.axios = require('axios');
        this.api = this.axios.create({
            baseURL: constants.API_URL,
        })
    }

    test(testData){
        if(testData === undefined){
            this.api.get('/').then((res) => {
                console.log(res);
            })
        } 
        else{
            //this.api.post('/test_post')
        }
    }

    async getFrameViewData(){
        var frameData = await this.api.get('/frames');
        console.log('fetching frame data')
        return frameData.data;
    }

    async getValidFrames(){
        var framelistData = await this.api.get('/framelist');
        return framelistData.data;
    }

    async getValidDemographics(){
        var dData = await this.api.get('/demographicslist');
        return dData.data;
    }

    async getTimelineData(frame, month, year=2020){
        let params = {}
        if(frame !== undefined){ params['frame'] = frame; }
        if(month !== undefined){ params['month'] = month; }
        if(year !== undefined){ params['year'] = year; }
        var timelineData = await this.api.get('/timeline', {params: params});
        return timelineData.data
    }

    async getCountyData(month, aggregate=false, year=2020){
        let params = {}
        if(month !== undefined){ params['month'] = month; }
        if(year !== undefined){ params['year'] = year; }
        if(aggregate !== undefined){ params['aggregate'] = aggregate; }
        var countyData = await this.api.get('/countys', {params: params});
        return countyData.data
    }

    async getMapBorders(aggregate=false){
        let params = {'aggregate': aggregate};
        var mapData = await this.api.get('/map', {params: params});
        return mapData.data
    }

    async getClusterData(cluster_fields, nclusters = 4 ){
        let params = {'n_clusters': nclusters, 'cluster_fields': cluster_fields};
        //this makes it so he query become 'cluster_fields' and not 'cluser_fields[]' which is hard to work with
        var paramQuery = querystring.stringify(params);
        var clusterData = await this.api.get('/clusters?'+paramQuery);
        return clusterData.data
    }


}