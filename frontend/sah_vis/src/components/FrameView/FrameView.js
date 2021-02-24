import React, {useState, useEffect} from 'react';
import Utils from '../../modules/Utils.js';
import './FrameView.css';
import FrameViewD3 from './FrameViewD3.js';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function FrameView(props){

    const [frameData, setFrameData] = useState({});
    const [sortVariable, setSortVariable] = useState('totalTweets')

    const fetchFrameData = async () => {
        const res = await props.api.getFrameViewData();
        setFrameData(res);
    }

    useEffect(() => {
        fetchFrameData()
    },[])

    const [frameList, setFrameList] = useState(<div/>)

    useEffect(function drawFrame(){
        if(frameData){
            var wTransform = x=>(x**.5)
            var [maxRTFor,maxRTAgainst] = getMaxRTValue(frameData,wTransform)
            let makeFrameEntry = ([fName, fDict]) => {
                
                //set up the selection button
                var isActive = (props.selectedFrame === fName);
                var buttonVariant = isActive? 'secondary':'outline-secondary';
                var buttonClass = isActive? 'activeButton frameButton':'frameButton';
                var setFrame = (e) => {
                    props.setSelectedFrame(fName);
                }

                return (
                    <Row key={fName} className={'frameEntry'} sm={12}>
                        <Col sm={2}>
                            <Button 
                                variant={buttonVariant}
                                onClick={setFrame}
                                value={fName}
                                className={buttonClass}
                                block
                            >
                                {fName}  
                            </Button>
                        </Col>
                        <Col sm={10}>
                            <FrameViewD3 
                                data={fDict} 
                                frameName={fName} 
                                setSortVariable={setSortVariable}
                                appProps={props}
                                maxRTFor={maxRTFor}
                                maxRTAgainst={maxRTAgainst}
                                wTransform={wTransform}
                            />
                        </Col>
                    </Row>
                )
            }
            var sortedEntries = sortFrames(frameData, sortVariable)
            var newFrameList = sortedEntries.map((f,d) => makeFrameEntry(f,d));
            setFrameList(newFrameList)
        }
    },
    [frameData, sortVariable, props.selectedFrame, props.windowSize])

    return (
        <Container fluid={'true'}>
            <Row sm={12}>
                <Col sm={2}>
                    {'Frame'}
                </Col>
                <Col sm={10}>
                {'Sentiment Quality Voting Against | For SAH by # retweets'}
                </Col>
            </Row>
            {frameList}
        </Container>
    )
}

function sortFrames(fData, sortVar){
    let accessor = getAccessor(sortVar);
    let valArray = []
    for(const [frame,fdata] of Object.entries(fData)){
        let entry = [frame, fdata];
        valArray.push(entry)
    }
    valArray.sort((a,b) => accessor(b[1]) - accessor(a[1]));
    return valArray
}

function getAccessor(sortVar){
    var accessor;
    switch(sortVar){
        case 'totalTweets':
            accessor = x => x.total_tweets
            break;
        case 'tweetSentiment':
            accessor = x => (x.positive_sentiment-x.negative_sentiment)/x.total_tweets;
            break;
        case 'qualityRatio':
            accessor = x => x.vivid/x.total_tweets;
            break;
        case 'tweetFrameVote':
            accessor = x => x.is_blue/x.total_tweets;
            break;
        default:
            accessor = x => x.total_tweets;
    }
    return accessor
}

function getMaxRTValue(fData,transform){
    var maxFor = 0;
    var maxAgainst = 0;
    for(const [frame, d] of Object.entries(fData)){
        let forSah = d.for_sah_rt_quantiles.map(transform);
        let againstSah = d.against_sah_rt_quantiles.map(transform);
        let totalFor = Utils.sum(forSah);
        let totalAgainst = Utils.sum(againstSah);

        if(totalFor > maxFor){
            maxFor = totalFor;
        }
        if(totalAgainst > maxAgainst){
            maxAgainst = totalAgainst
        }
    }
    return [maxFor, maxAgainst]
}