import React, {useState, useEffect} from 'react';
import Utils from '../../modules/Utils.js';
import './TimelineView.css';
import TimelineViewD3 from './TimelineViewD3.js';
import TimelineAxisD3 from './TimelineAxisD3';

// import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function TimelineView(props){

    const [timelineData, setTimelineData] = useState({});
    const [timelineComponents, setTimelineComponents] = useState((<div key={0}></div>));
    const [timelineAxis, setTimelineAxis] = useState((<div></div>))
    const [maxRtAgainst, setMaxRtAgainst] = useState(0);
    const [maxRtFor, setMaxRtFor] = useState(0);

    //use this is I want to do a transform on the retweet count?
    const rtTransform = rts => rts;
    const fetchTimelineData = async () => {
        const res = await props.api.getTimelineData(props.timelineWindowLength);
        console.log('timeline data', res);
        setTimelineData(res);
    }

    useEffect(() => {
        fetchTimelineData();
    },[props.timeLineWindowLength])

    useEffect(function drawTimeline(){
        var newTimeAxis = (
            <TimelineAxisD3
                data={timelineData}
                appProps={props}
            ></TimelineAxisD3>
        )
        var newTimelines = [true, false].map(
            function(d,i){
                return (
                    <Row md={12} className={'timelineContainer'} key={i}>
                        <TimelineViewD3
                            data={timelineData}
                            activeOnly={d}
                            selectedFrame={props.selectedFrame}
                            appProps={props}
                            rtTransform={rtTransform}
                        ></TimelineViewD3>
                    </Row>
                )
            }
        )
        
        setTimelineComponents(newTimelines);
        setTimelineAxis(newTimeAxis);
    },
    [timelineData, props.selectedFrame, props.geoidGroupMap, props.brushedCountyGroupNum])

    return (
    <Container className={'vizComponent'} fluid={'true'}>
        <Row md={12} id={'timelineListContainer'}>
            {timelineComponents}
        </Row>
        <Row md={12} id={'timelineAxisContainer'}>{timelineAxis}</Row>

    </Container>
    )
}