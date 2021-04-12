import React, {useState, useEffect} from 'react';
import Utils from '../../modules/Utils.js';
import './CountyView.css';

import CountyViewD3 from './CountyViewD3.js';
import * as d3 from 'd3';

// import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function CountyView(props){

    const [countyData, setCountyData] = useState({});
    const [countyVizComponents, setCountyVizComponents] = useState((<h2>Loading...</h2>));

    const fetchCountyData = async () => {
        console.log('waiting on map');
        const res = await props.api.getCountyData(props.selectedDemographics);
        console.log('countydata', res);
        setCountyData(res);
    }

    useEffect(() => {
        fetchCountyData();
    },[]);

    useEffect(function drawCountys(){
        if(countyData.borders !== undefined){
            var newCountyVizComponent = (
                    <CountyViewD3
                        data={countyData}
                        appProps={props}
                    >
                    </CountyViewD3>
            )
            setCountyVizComponents(newCountyVizComponent);
        }
    },[countyData, props.selectedDemographics, props.selectedFrame, props.brushedCountyGroupNum])

    return (
        <Container className={'vizComponent'} fluid={'true'}>
            {countyVizComponents}
        </Container>
        )
}