import * as constants from './Constants';

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

}