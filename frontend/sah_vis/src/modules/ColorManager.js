// import * as constants from './Constants';
// import { quantile, qunatileRank } from 'simple-statistics';
import * as d3 from 'd3';

export default class ColorManager {

    constructor(args){
    }

    getInterpolator(varName){
        //pre-defined color scales to use
        switch(varName){
            case 'sentiment':
                return d3.interpolateCividis;
                break;
            case 'cases':
                return d3.interpolateReds;
                break;
            case 'deaths':
                return d3.interpolateGreys;
                break;
            case 'forSah':
                return d3.interpolateGreens;
                break;
            case 'againstSah':
                return d3.interpolatePurples;
                break;
            default:
                return d3.interpolateGreys;
                break;
        }
    }

    colorsFromQuantileCounts(qCounts, varName){
        var interpolator = this.getInterpolator(varName);
        let minHue = .2;
        let increment = (1 - minHue)/qCounts.length;
        let colorList = [];
        for(var i=minHue; i < 1; i = i + increment){
            let color = interpolator(i+increment);
            colorList.push(color)
        }
        return colorList;
    }
    
}