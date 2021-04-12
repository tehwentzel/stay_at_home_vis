import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import '../../App.css';
import Utils from '../../modules/Utils.js';
import legend from 'd3-svg-legend';

export default function TimelineViewD3({data, rtTransform, activeOnly, selectedFrame, appProps}){
    const d3Container = useRef(null);

    const [height, setHeight] = useState(0);
    const [width, setWidth] = useState(0);
    const [svg, setSvg] = useState();
    const [tTip, setTTip] = useState();
    const [svgCreated,setSvgCreated] = useState(false);
    const [timelineDrawn, setTimelineDrawn] = useState(false)

    const yMargin = 10;
    const xMargin = 10;

    useEffect(function makeSvg(){
        if(data && d3Container.current){
            
            d3.select(d3Container.current).selectAll('svg').remove();

            var h = d3Container.current.clientHeight*.99;
            var w = d3Container.current.clientWidth*.99;

            var canvas = d3.select(d3Container.current)
                .append('svg')
                .attr('class','frameEntryD3')
                .attr('width',w)
                .attr('height',h);

            if(d3.select('body').select('.tooltip').empty()){
                d3.select('body').append('div')
                    .attr('class','tooltip')
                    .style('visibility','hidden');
            }
            var tip = d3.select('body').select('.tooltip');

            setHeight(h);
            setWidth(w);
            setSvg(canvas);
            setTTip(tip);
            setSvgCreated(true);
        }
    },[d3Container.current]);

    useEffect(function drawTimeline(){
        if (data && svgCreated) {
            const tData = data['data'];
            if(tData === undefined){
                return
            }
            const maxCpcDiscrete = data['max_cases_per_capita_discrete'];
            const maxCpc = data['max_cases_per_capita'];
            const barWidth = width/tData.length;

            var filterTweets;
            if(activeOnly){
                filterTweets = x => (parseInt(x[selectedFrame]) === 1);
            } else{
                filterTweets = x => (parseInt(x[selectedFrame]) !== 1);
            }

            const [maxRtDiscreteFor, maxRtDiscreteAgainst] = getRtExtents(data, filterTweets);

            var xAxisCenter = (height - 2*yMargin)*maxRtDiscreteFor/(maxRtDiscreteFor + maxRtDiscreteAgainst);

            var casesInterpolator = appProps.colorManager.getInterpolator('cases');
            var caseScale = d3.scalePow(.5)
                .domain([0, maxCpcDiscrete])
                .range([0, 1])
            var getTweetColor = x => casesInterpolator(caseScale(x.cases_per_capita_discrete));

            var getXPos = x => (x.pos)*barWidth;
            var getMaxBarHeight = x => (x + 1)*(height - 3*yMargin)/(maxRtDiscreteFor + maxRtDiscreteAgainst);
            var getBarHeight = x => Math.min(getMaxBarHeight(x), .2*height);
            //all the data
            var formattedTweets = [];

            //track the heights so I can fix the final height of the thing
            for(const block of tData){
                var xPos = getXPos(block);
                var currYFor = xAxisCenter - yMargin/4;
                var currYAgainst = xAxisCenter + yMargin/4;
                let validTweets = block.tweets.filter(filterTweets);
                validTweets.sort((b,a) => (a.retweet_count - b.retweet_count));
                if(validTweets.length === undefined || validTweets.length === 0){
                    continue
                }
                for(const tweet of validTweets){
                    var color = getTweetColor(tweet);
                    var tHeight = getBarHeight(tweet.rt_discrete);
                    var tweetY;
                    if(parseInt(tweet.for_sah) === 1){
                        tweetY = currYFor-tHeight;
                        currYFor -= tHeight;

                    } else{
                        tweetY = currYAgainst;
                        currYAgainst += tHeight;
                    }
                    let entry = {
                        fill: color,
                        x: xPos,
                        y: tweetY,
                        height: tHeight,
                        width: barWidth,
                        text: tweet.text,
                        cases: tweet.cases,
                        pop: tweet.cvap,
                        geoid: tweet['GEOID'],
                        rtCount: tweet.retweet_count,
                        isVivid: tweet.is_vivid,
                    };
                    formattedTweets.push(entry);
                }
                
            }
            svg.selectAll('g').filter('.timelineGroup').remove()

            //shift the rects up a little bit so it hits the top of the svg
            var tweetRectGroup = svg.append('g')
                .attr('class', 'timelineGroup');

            var tweetRects = tweetRectGroup.selectAll('rect')
                .filter('.tweetRect')
                .data(formattedTweets).enter()
                .append('rect')
                .attr('class','tweetRect')
                .attr('x', x=>x.x)
                .attr('y', x=>x.y)
                .attr('height',x=>x.height)
                .attr('width', x=>x.width)
                .attr('fill',x=>x.fill)
                .on('mouseover', function(e){
                    let d = d3.select(this).datum();
                    let tipText = d.text
                    tTip.html(tipText)
                }).on('mousemove', function(e){
                    Utils.moveTTip(tTip,e);
                }).on('mouseout', function(e){
                    Utils.hideTTip(tTip);
                });

            tweetRects.exit().remove();
            setTimelineDrawn(true);

            var legendScale = d3.scalePow(.5)
                .domain([.01*maxCpcDiscrete, maxCpcDiscrete])
                .range([casesInterpolator(.01*maxCpcDiscrete), casesInterpolator(1)])

            
            var setLegend = g => g.shapeWidth(barWidth)
                .shapePadding(10)
                .cells(3)
                .orient('horizontal')
                .labelWrap(barWidth)
                .titleWidth(5*barWidth);

            var cLgnd = legend.legendColor()
                .scale(legendScale)
                .shape('rect')
                .shapeHeight(getBarHeight(1))
                .labelOffset(10)
                .title('Tweet Origin Cases/Person');

            setLegend(cLgnd);

            var heightScale = d3.scaleLinear()
                .domain([0,2])
                .range([getBarHeight(0),getBarHeight(2)]);

            var shapeLgnd = legend.legendSize()
                .scale(heightScale)
                .shape('line')
                .title("Tweet Retweets")
                .labelOffset(15)
                .labels(['0','1-9','10+']);
            setLegend(shapeLgnd);

            svg.selectAll('.legend').remove();

            //default put the legend in the top right
            var legendOffset = 6*barWidth;
            var xColorLegendPos = .9*width - legendOffset;
            var xShapeLegendPos = .9*width - 2*legendOffset;
            var yLegendPos = yMargin + 10;
            if(maxRtDiscreteAgainst > maxRtDiscreteFor){//move the legend if it's mosty against since the top row will be more crowed
                xColorLegendPos = 30 + legendOffset;
                xShapeLegendPos = 30;
                yLegendPos = height - 10 - 2*getBarHeight(2);
            }

            var legendGroup = svg.append('g')
                .attr('class','legend');

            legendGroup.append('g')
                .attr('class','colorLegend')
                .attr('transform', 'translate(' + xColorLegendPos + ',' + yLegendPos + ')')
                .call(cLgnd);

            legendGroup.append('g')
                .attr('class','shapeLegned')
                .attr('transform', 'translate(' + xShapeLegendPos + ',' + yLegendPos + ')')
                .call(shapeLgnd);
            
            
        }
    },[data, svgCreated, selectedFrame])

    useEffect(()=>{
        if (data && timelineDrawn) {
            var getClass = function(tweet){
                if(appProps.brushedCountyGroupNum < 0){ return 'tweetRect tweetRectActive';}
                let groupNum = appProps.geoidGroupMap[parseInt(tweet.geoid)];
                if(groupNum !== undefined & parseInt(groupNum) === parseInt(appProps.brushedCountyGroupNum)){
                    return 'tweetRect tweetRectActive';
                } else{
                    return 'tweetRect';
                }
            }
        
            var tRects = svg.selectAll('.tweetRect')
                .attr('class', d=>getClass(d))
                .on('dblclick', function(e){
                    let d = d3.select(this).datum();
                    let groupNum = appProps.geoidGroupMap[parseInt(d.geoid)];
                    if(groupNum !== undefined & groupNum !== parseInt(appProps.brushedCountyGroupNum)){
                        appProps.setBrushedCountyGroupNum(groupNum);
                    }
                });

        }
    },[selectedFrame, timelineDrawn, appProps.brushedCountyGroupNum, appProps.geoidGroupMap])

    return (
        <div
            className="d3-component"
            ref={d3Container}
        ></div>
    );
}

function getRtExtents(d, filterFunc){
    var maxFor = 0;
    var maxAgainst = 0;
    for(const block of d.data){
        let tweets = block.tweets.filter(filterFunc);
        let currFor = 0;
        let currAgainst = 0;
        for(const tweet of tweets){
            if(tweet.for_sah === 1){
                currFor += tweet.rt_discrete + 1;
            } else{
                currAgainst += tweet.rt_discrete + 1;
            }
        }
        maxFor = Math.max(maxFor, currFor);
        maxAgainst = Math.max(maxAgainst, currAgainst);
    }
    return [maxFor, maxAgainst]
}