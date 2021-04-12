import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import '../../App.css';
import Utils from '../../modules/Utils.js';

export default function ClusterViewD3({data, appProps}){
    const d3Container = useRef(null);

    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [svg, setSvg] = useState();
    const [tTip, setTTip] = useState();
    const [svgCreated,setSvgCreated] = useState(false);
    const [bordersDrawn, setBordersDrawn] = useState(false);
    const [tweetsDrawn, setTweetsDrawn] = useState(false)

    const [borders, setBorders] = useState()
    const yMargin = 0;
    const xMargin = 10;

    useEffect(function makeSvg(){
        if(data && d3Container.current){
            
            d3.select(d3Container.current).selectAll('svg').remove();

            //this ones different because we need to calculate the height in the parent and pass it as a property
            var w = d3Container.current.clientWidth;
            var h =  d3Container.current.clientHeight;
            var canvas = d3.select(d3Container.current)
                .append('svg')
                .attr('width',w)
                .attr('height',h)
                .attr('background','grey');

            if(d3.select('body').select('.tooltip').empty()){
                d3.select('body').append('div')
                    .attr('class','tooltip')
                    .style('visibility','hidden');
            }
            var tip = d3.select('body').select('.tooltip');

            setWidth(w);
            setHeight(h);
            setSvg(canvas);
            setTTip(tip);
            setSvgCreated(true);
        }
    },[d3Container.current]);

    useEffect(function drawBorders(){
        if (data && svgCreated) {
            //frames, cases_per_capita_discrete (list), for_sah, is_blue (list?), is_vivid, retweet_count (list), group_num, total_tweets
            if(data.demographics === undefined){ return; }
            console.log('map', data.demographics)
            setBordersDrawn(false);
            var projection = d3.geoAlbersUsa()
                .scale(850)
                .translate([width/2,height/2]);

            var path = d3.geoPath().projection(projection);

            var getPath = function(d){
                let geoid = geoidString(d.GEOID);
                var features = data.borders[geoid];
                if(features === undefined){ return; }
                return path(features);
            }

            var getClass = d => 'mapBorder';
            d3.select(d3Container.current).select('svg').selectAll('.mapGroup').remove();

            var borders = d3.select(d3Container.current).select('svg').append('g')
                .attr('class','mapGroup')
                .selectAll('path')
                .data(data.demographics)
                .enter()
                .append('path')
                .attr('class', getClass)
                .attr('d', getPath);

            borders.exit().remove();

            setBordersDrawn(true);
        }
    },[data, svgCreated])

    useEffect(function drawTweets(){
        if (data && bordersDrawn) {
            //frames, cases_per_capita_discrete (list), for_sah, is_blue (list?), is_vivid, retweet_count (list), group_num, total_tweets
            if(data.demographics === undefined || !bordersDrawn){ return; }
            setTweetsDrawn(false);
            var primaryVar = appProps.selectedFrame;
            var valueTransform = d => Math.sign(d)*Math.log(Math.abs(d) + 1);
            var primaryValues = data.demographics.map(x => valueTransform(x[primaryVar]));
            var primaryExtents = Utils.extents(primaryValues);
            var primaryInterpolator = appProps.colorManager.getMapInterpolator(primaryVar, 0);
            var primaryScale = d3.scaleLinear()
                .domain([0, primaryExtents.max])
                .range([0,1])
            var getFill = function(d){
                return primaryInterpolator(primaryScale(valueTransform(d[primaryVar])));
            }
            d3.select(d3Container.current).selectAll('.mapGroup').selectAll('path')
                .attr('fill',getFill);
            setTweetsDrawn(true);
        }
    },[data, bordersDrawn, appProps.selectedFrame, appProps.selectedDemographics])

    useEffect(function brush(){
        if(!tweetsDrawn){return;}
        var getClass = function(c){
            if(appProps.brushedCountyGroupNum < 0){ return 'mapBorder';}
            let groupNum = appProps.geoidGroupMap[parseInt(c.GEOID)];
            if(groupNum !== undefined & parseInt(groupNum) === parseInt(appProps.brushedCountyGroupNum)){
                return 'mapBorder mapBorderActive';
            } else{
                return 'mapBorder';
            }
        }
        d3.select(d3Container.current).selectAll('.mapGroup').selectAll('path')
                .attr('class',getClass);
    },[appProps.brushedCountyGroupNum, tweetsDrawn,appProps.geoidGroupMap])

    return (
        <div
            className="d3-component"
            ref={d3Container}
        ></div>
    );
}

function geoidString(g){
    let gInt = parseInt(g);
    if(gInt < 10000){
        return '0' + gInt;
    } else{
        return '' + gInt;
    }
}