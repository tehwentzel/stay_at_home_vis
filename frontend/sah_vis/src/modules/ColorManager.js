// import * as constants from './Constants';
import { quantile, qunatileRank } from 'simple-statistics';
import Utils from './Utils.js';
import * as d3 from 'd3';

export default class ColorManager {

    constructor(args){
    }

    getInterpolator(varName, varPosition=-1){
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
            case 'retweets':
                return d3.interpolatePuBuGn;
                break;
            case 'demographics':
                return d3.interpolateGreys;
                break;
            case 'net_dem_president_votes':
                return d3.interpolateRdBu;
            default:
                return this.getMapInterpolator(varName, varPosition);
                break;
        }
    }

    getMapInterpolator(varName, varPosition){
        //pre-defined color scales to use
        if(varName.includes('cases')){
            return d3.interpolateReds;
        };
        if(varName.includes('deaths')){
            return d3.interpolateRdPu;
        };
        if(varPosition === 0){
            return d3.interpolateYlOrBr;
        } 
        if(varPosition === 1){
            return d3.interpolateBuGn;
        }
        console.log('you are passing to getMapInterpolator wrong?', varName, varPosition);
        return d3.interpolateGreys;
    }

    getCategoricalClass(varName, value){
        if(varName === 'sentiment_score' || varName === 'sentiment'){
            if(value === 0){
                return 'neutralSentiment';
            } else{
                return (value > 0)? 'positiveSentiment':'negativeSentiment';
            }
        } 
        if(varName === 'is_blue'){
            return (value > 0)? 'blueState':'redState';
        }
        if(varName === 'for_sah'){
            return (value > 0)? 'forSah':'againstSah';
        }
        if(varName === 'is_vivid'){
            return (value > 0)? 'vividQuality':'genericQuality';
        }
        let defaultClass = (value > 0)? 'defaultCategoricalPositive':'defaultCategoricalNegative';
        return defaultClass;
    }

    makeQuantiles(values){
        var valueRanges = Utils.arrange(.5,1,Math.round(values.length/3)+1);
        console.log('values',values, valueRanges);
        var qs = quantile(values.filter( d => d > 0), valueRanges);
        var scale = d3.scaleLinear()
            .domain(qs)
            .range(valueRanges);
        return scale
    }

    colorScaleFromExtents(extents, varName, dempos = 0){
        var interpolator = this.getInterpolator(varName, dempos);
        if(extents.min < 0){
            var scale = d3.scaleSymlog()
                .domain([extents.min, 0, extents.max])
                .range([0,.5, 1]);
        } else{
            var scale = d3.scaleSymlog()
                .domain([extents.min, extents.max])
                .range([0.1,1]);
        }

        var getColor = (d) => {return interpolator(scale(d))};
        return getColor.bind(this)
    }

    makeQuantileColorScale(values, varName){
        var qScale = this.makeQuantiles(values);
        var interpolator = this.getInterpolator(varName);

        var getColor = (v) => interpolator(qScale(v));
        return getColor
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