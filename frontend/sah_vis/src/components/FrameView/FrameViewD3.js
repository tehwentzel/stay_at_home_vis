import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import '../../App.css';
import Utils from '../../modules/Utils.js';

/* Component template for d3 with react hooks from https://medium.com/@jeffbutsch/using-d3-in-react-with-hooks-4a6c61f1d102*/
export default function FrameViewD3({data, frameName, setSortVariable, maxRTFor, maxRTAgainst, wTransform, appProps}){
    /* The useRef Hook creates a variable that "holds on" to a value across rendering
       passes. In this case it will hold our component's SVG DOM element. It's
       initialized null and React will assign it later (see the return statement) */
    const d3Container = useRef(null);
    //the % of the total space the rwteet p
    const retweetRatio = .66;
    //space between graphs
    const graphMargin = 10;
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

                //hardcoded because I keep having to adjust it everywhere
                //the data should have *_quantiles with bin edges of thes values
                //this should correspond to the function in the data backend that quantizes the retweet count
                const quantileBins = [0,1,10];
            
            
                var height = d3Container.current.clientHeight*.99;
                var width = d3Container.current.clientWidth*.99;

                //
                //code for the squares with ratios of types of tweets
                //

                //width of each chart that shows porportions of types of twets
                var ratioChartWidth = ((1-retweetRatio)*width - graphMargin)/numRatioGraphs;

                d3.select(d3Container.current).selectAll('svg').remove();

                var svg = d3.select(d3Container.current)
                    .append('svg')
                    .attr('class','frameEntryD3')
                    .attr('width',width)
                    .attr('height',height);

                //check if there is a div tooltip already
                if(d3.select('body').select('.tooltip').empty()){
                    d3.select('body').append('div')
                        .attr('class','tooltip');
                }
                var tTip = d3.select('body').select('.tooltip');

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
                        .attr('class', v => v.className)
                        .on('dblclick', (v,i) => {
                            setSortVariable(cName)
                        }).on('mouseover', function(e){
                            let d = d3.select(this).datum()
                            let tipText = d.className + '</br>'
                            + d.tweets + ' tweets (' + d.percentage + ')'
                             + '</br>'
                            tTip.html(tipText)
                        }).on('mousemove', function(e){
                            Utils.moveTTip(tTip,e);
                        }).on('mouseout', function(e){
                            Utils.hideTTip(tTip);
                        });
                    gchart.exit().remove()
                    
                    currX += ratioChartWidth + graphMargin;
                }

                var tweetSentiment = [data.positive_sentiment, data.negative_sentiment];
                var tweetSClasses = ['positiveSentiment','negativeSentiment','neutralSentiment'];
                drawRatio(tweetSentiment, tweetSClasses,'tweetSentiment');

                var tweetQuality = [data.vivid];
                var tweetQClasses = ['vividQuality','genericQuality'];
                drawRatio(tweetQuality, tweetQClasses,'qualityRatio');
                
                
                var tweetVote = [data.is_blue];
                var tweetVClasses = ['blueState','redState'];
                drawRatio(tweetVote, tweetVClasses, 'tweetFrameVote')
                
                ///
                //code for drawing the Retweet chart
                ///
                //width of the chart with retweet ratios
                var rtWidth = retweetRatio*width;
        
                // currX += graphMargin;
                let forSah = data.for_sah_rt_quantiles;//.map(wTransform);
                let againstSah = data.against_sah_rt_quantiles//;.map(wTransform);
                

                var getWidth = function(tweetCount){
                    let tweetWidth = (rtWidth - graphMargin)/(maxRTFor + maxRTAgainst);
                    return wTransform(tweetCount)*tweetWidth
                }

                var rtGraphCenter = currX + rtWidth*(maxRTAgainst/(maxRTFor+maxRTAgainst));

                var drawRTData = function(vals,varName,invert=false){
                    var rectData = [];
                    var currPos = rtGraphCenter+0;
                    let colors = appProps.colorManager
                        .colorsFromQuantileCounts(vals,varName);
                    for(var idx in vals){
                        let i = vals.length-idx-1; //we want to go in reverse order
                        let count = vals[i];
                        let tWidth = getWidth(count);
                        var maxRt = 'inf'
                        if(idx > 0){
                            maxRt = quantileBins[i+1]
                        }
                        var entry = {
                            x:  (invert)? currPos-tWidth: currPos,
                            width: tWidth,
                            color: colors[i],
                            minRt: quantileBins[i],
                            maxRt: maxRt,
                            tweets: count,
                        }
                        currPos = (invert)? (currPos-tWidth):(currPos+tWidth);
                        rectData.push(entry);
                    }
                    var g = svg.append('g')
                        .attr('class',varName + 'RTQuantiles')

                    
                    svg.selectAll('rect').filter('.'+varName+'Rect').remove();
                    var rtCharts = g.selectAll('rect')
                        .data(rectData).enter()
                        .append('rect')
                        .attr('class',varName+'Rect')
                        .attr('height',height)
                        .attr('width',x=>x.width)
                        .attr('fill', x=>x.color)
                        .attr('x',x=>x.x)
                        .on('dblclick', ()=>setSortVariable('totalTweets'))
                        .on('mouseover', function(e){
                            let d = d3.select(this).datum();
                            let upperLimit = '-' + d.maxRt;
                            if(d.maxRt === 'inf'){
                                upperLimit = '+';
                            }
                            let tipText = 'Tweets ' + varName + ' </br>'
                            + d.minRt + upperLimit + ' RTs: ' + d.tweets + '</br>'
                            +'total: ' + data.total_tweets + '</br>' 
                            tTip.html(tipText)
                        }).on('mousemove', function(e){
                            Utils.moveTTip(tTip,e);
                        }).on('mouseout', function(e){
                            Utils.hideTTip(tTip);
                        });
                    rtCharts.exit().remove()
                }

                drawRTData(againstSah, 'againstSah',true);
                drawRTData(forSah,'forSah');

                return ()=>{d3.select(d3Container.current).selectAll('svg').remove();}
                
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
        //this is the data that will be bound to the rectangel
        let entry = {
            'width': valWidth,
            'x': currX,
            'className': classNames[currIdx],
            'tweets': val,
            'percentage': (Math.round(val/totalValues*100)+'%')
        }
        entryData.push(entry)
        currX += valWidth;
        currIdx += 1;
    }


    return entryData
}