import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import '../../App.css';
import Utils from '../../modules/Utils.js';
import { range } from 'd3';

export default function TimelineViewD3({data, rtTransform, appProps}){
    const d3Container = useRef(null);

    const [height, setHeight] = useState(0);
    const [width, setWidth] = useState(0);
    const [svg, setSvg] = useState();
    const [tTip, setTTip] = useState();
    const [svgCreated,setSvgCreated] = useState(false);

    const sentimentHeightRatio = .1;
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

            let days = Utils.arrange(1,31,31);//array 1 to 31
            var sentimentHeight = sentimentHeightRatio*height;
            
            var [maxFor, maxAgainst, allCases] = getCalibrationValues(data, rtTransform);
            
            if(allCases.length <= 0){
                return
            }
            var getTweetColor = appProps.colorManager.makeQuantileColorScale(allCases, 'cases');
            
            var getTweetHeight = function(rt_count){
                return (height-sentimentHeight)*rtTransform(rt_count)/(maxFor+maxAgainst);
            }

            var barWidth = (width - 2*xMargin)/(days.length);
            var getTweetX = function(day){
                return day*barWidth;
            }

            var getSentimentColor = d3.scaleLinear()
                .domain([-1,0,1])
                .range(['black','gray','yellow']);

            var formattedAllTweets = [];
            var sentimentData = [];
            for(const [day, tweetList] of Object.entries(data)){
                var startPos = (height-sentimentHeight)*(maxFor + 1)/(maxFor + maxAgainst + 2);
                var currYFor = startPos - sentimentHeight/2;
                var currYAgainst = startPos + sentimentHeight/2;

                //sort the tweets so the popular ones are on bottom;
                tweetList.sort((b,a) => (a.retweet_count - b.retweet_count));
                var dayX = getTweetX(day);

                var todaySentiment = 0;
                var totalRT = 0;

                for(const tweet of tweetList){
                    var tHeight = getTweetHeight(tweet.retweet_count);
                    var color = getTweetColor(tweet.cases_per_capita);
                    var tweetY;
                    if(parseInt(tweet.for_sah) === 1){
                        tweetY = currYFor-tHeight;
                        currYFor -= tHeight;
                    } else{
                        tweetY = currYAgainst;
                        currYAgainst += tHeight;
                    }
                    var entry = {
                        x: dayX,
                        height: tHeight,
                        width: barWidth,
                        y: tweetY,
                        fill: color,
                        text: tweet.text
                    }
                
                    formattedAllTweets.push(entry);

                    todaySentiment += tweet.sentiment_score*(tweet.retweet_count + 1);
                    totalRT += (tweet.retweet_count + 1);
                }

                var meanSentiment = (totalRT === 0)? todaySentiment:todaySentiment/totalRT;
                var sRectHeight = sentimentHeight*.9;
                var sentimentEntry = {
                    x: dayX,
                    width: barWidth,
                    height: sRectHeight,
                    y: startPos - sRectHeight/2,
                    fill: getSentimentColor(meanSentiment)
                }
                sentimentData.push(sentimentEntry);

            }
            svg.selectAll('rect').filter('.tweetRect').remove()
            var tweetRects = svg.selectAll('rect').filter('.tweetRect')
                .data(formattedAllTweets).enter()
                .append('rect')
                .attr('class','tweetRect')
                .attr('x', x=>x.x)
                .attr('y', x=>x.y)
                .attr('height',x=>x.height)
                .attr('width', x=>x.width)
                .attr('fill',x=>x.fill)
                .on('mouseover', function(e){
                    let d = d3.select(this).datum()
                    let tipText = d.text
                    tTip.html(tipText)
                }).on('mousemove', function(e){
                    Utils.moveTTip(tTip,e);
                }).on('mouseout', function(e){
                    Utils.hideTTip(tTip);
                });

            tweetRects.exit().remove();

            svg.selectAll('rect').filter('.sentimentRect').remove()
            var sentiments = svg.selectAll('rect').filter('.sentimentRect')
                .data(sentimentData).enter()
                .append('rect')
                .attr('class', 'sentimentRect')
                .attr('x', x=>x.x)
                .attr('y', x=>x.y)
                .attr('height',x=>x.height)
                .attr('width', x=>x.width)
                .attr('fill',x=>x.fill);
            sentiments.exit().remove();

            console.log(tweetRects)

        }
    },[data, svgCreated])

    return (
        <div
            className="d3-component"
            ref={d3Container}
        ></div>
    );
}

function getCalibrationValues(tData, rtTransform){
    //gets the max values of tweets and retweet and cases for use in making all the scales
    var maxFor = 0;
    var maxAgainst = 0;
    var cases = new Array();
    for(const [day, tweets] of Object.entries(tData)){
        let forRT = 0;
        let againstRT = 0;
        for(var tweet of tweets){
            let yVal = rtTransform(tweet.retweet_count)

            if(tweet.for_sah === 1){
                forRT += yVal
            } else{
                againstRT += yVal
            }
            cases.push(tweet.cases_per_capita)
        }
        maxFor = Math.max(forRT, maxFor);
        maxAgainst = Math.max(againstRT, maxAgainst);
    }
    return [maxFor, maxAgainst, cases]
}