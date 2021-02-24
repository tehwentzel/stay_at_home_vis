import React, {useState, useEffect} from 'react';
import Utils from '../../modules/Utils.js';
import './TimelineView.css';
import TimelineViewD3 from './TimelineViewD3.js';

// import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function TimelineView(props){

    const [timelineData, setTimelineData] = useState({});
    const [timelineComponent, setTimelineComponent] = useState((<div></div>));
    const rtTransform = rts => (rts+1)**.5;
    const fetchTimelineData = async () => {
        const res = await props.api.getTimelineData(props.selectedFrame, props.selectedMonth);
        console.log('timeline data', res)
        setTimelineData(res);
    }

    useEffect(() => {
        fetchTimelineData();
    },[props.selectedFrame, props.selectedMonth])

    useEffect(function drawTimeline(){
        var newTimeline = (
            <TimelineViewD3
                data={timelineData}
                appProps={props}
                rtTransform={rtTransform}
            ></TimelineViewD3>
        )
        setTimelineComponent(newTimeline);
    },
    [timelineData])

    return (
    <Container className={'vizComponent'} fluid={'true'}>
        {timelineComponent}
    </Container>
    )
}