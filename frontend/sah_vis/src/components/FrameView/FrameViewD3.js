import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import '../../App.css';

/* Component template for d3 with react hooks from https://medium.com/@jeffbutsch/using-d3-in-react-with-hooks-4a6c61f1d102*/
export default function FrameViewD3({data, frameName, appProps}){
    /* The useRef Hook creates a variable that "holds on" to a value across rendering
       passes. In this case it will hold our component's SVG DOM element. It's
       initialized null and React will assign it later (see the return statement) */
    const d3Container = useRef(null);

    //the % of the total space the rwteet p
    const retweetRatio = .4;
    //space between graphs
    const graphMargin = 20;
    //number of graphs that will show the porporions of different types of tweets
    const numRatioGraphs = 3;
    /* The useEffect Hook is for running side effects outside of React,
       for instance inserting elements into the DOM using D3 */
    useEffect(
        function drawEntry(){
            if (data && d3Container.current) {

                //as far as I can tell this will automatically be the parent div size 
                //becuase of the class css
                d3.select(d3Container.current).selectAll('svg').remove()
            
                var height = d3Container.current.clientHeight*.99;
                var width = d3Container.current.clientWidth*.99;

                //width of the chart with retweet ratios
                var rtWidth = retweetRatio*width;
                //width of each chart that shows porportions of types of twets
                var ratioChartWidth = ((1-retweetRatio)*width - graphMargin)/numRatioGraphs;

                d3.select(d3Container.current).selectAll('svg').remove();

                var svg = d3.select(d3Container.current)
                    .append('svg')
                    .attr('class','frameEntryD3')
                    .attr('width',width)
                    .attr('height',height);

                var currX = 0;

                let tt = data['total_tweets'];

                let addRemaining = function(arr){
                    let remaining = tt;
                    for(const val of arr){
                        remaining -= val;
                    }
                    arr.push(remaining);
                    return arr
                }

                var drawRatio = function(values,classes,cName){
                    if(values.length < classes.length){
                        values = addRemaining(values);
                    }
                    console.log('draw',classes, currX)
                    var d = formatRchartData(values,classes, height, currX, currX + ratioChartWidth);
                    svg.selectAll('g').filter('.' + cName).remove()
                    var g = svg.append('g')
                        .attr('class',cName)
                    g.selectAll('rect').remove();
                    var gchart = g.selectAll('rect')
                        .data(d).enter()
                        .append('rect')
                        .attr('x', v => v.x)
                        .attr('width', v => v.width)
                        .attr('height', height)
                        .attr('class', v => v.className);
                    gchart.exit().remove()
                    
                    currX += ratioChartWidth + graphMargin;
                }

                var tweetSentiment = [data.positive_sentiment, data.negative_sentiment];
                var tweetSClasses = ['positiveSentiment','negativeSentiment','neutralSentiment'];
                drawRatio(tweetSentiment, tweetSClasses,'tweetStance');

                var tweetQuality = [data.vivid];
                var tweetQClasses = ['vividQuality','genericQuality'];
                drawRatio(tweetQuality, tweetQClasses,'qualityRatio');
                
                
                var tweetVote = [data.is_blue];
                var tweetVClasses = ['blueState','redState'];
                drawRatio(tweetVote, tweetVClasses, 'tweetFrameVote')
    
            }
        },
        [data, d3Container.current])

    return (
        <div
            className="d3-component"
            ref={d3Container}
        ></div>
    );
}

function formatRchartData(values, classNames, height, startX, stopX){
    let width = stopX - startX;

    let totalValues = 0;
    for(const val of values){
        totalValues += val;
    }

    let entryData = [];
    let currX = startX;
    let currIdx = 0;
    for(const val of values){
        let valWidth = width*val/totalValues;
        let entry = {
            'width': valWidth,
            'x': currX,
            'className': classNames[currIdx]
        }
        entryData.push(entry)
        currX += valWidth;
        currIdx += 1;
    }


    return entryData
}