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

    async getTimelineData(nDays){
        if(nDays === undefined){ nDays = 1; }
        var timelineData = await this.api.get('/timeline', {params: {'nDays': nDays}});
        return timelineData.data
    }

    async getCountyData(){
        var countyData = await this.api.get('/countys');
        return countyData.data
    }

    async getMapBorders(aggregate=false){
        //I made it so it now sends it with the county data so this is obselete but maybe useful later?
        let params = {'aggregate': aggregate};
        var mapData = await this.api.get('/map', {params: params});
        return mapData.data
    }

    async getClusterData(clusterFields){
        let params = {'clusterFields': clusterFields};
        //this makes it so he query become 'cluster_fields' and not 'cluser_fields[]' which is hard to work with
        var paramQuery = querystring.stringify(params);
        var clusterData = await this.api.get('/clusters?'+paramQuery);
        return clusterData.data
    }


}