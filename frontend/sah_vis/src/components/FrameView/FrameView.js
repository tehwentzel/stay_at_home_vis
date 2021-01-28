import React, {useState, useEffect} from 'react';
import { API_URL } from '../../modules/Constants.js';
import Utils from '../../modules/Utils.js';
import './FrameView.css';
import FrameViewD3 from './FrameViewD3.js'

import * as d3 from "d3";

export default function FrameView(props){

    const [frameData, setFrameData] = useState({});

    const fetchFrameData = async () => {
        const res = await props.api.getFrameViewData();
        setFrameData(res);
    }

    useEffect(() => {
        fetchFrameData()
    },[])

    const [frameList, setFrameList] = useState(<div/>)

    useEffect(function drawFrame(){
        let makeFrameEntry = ([fName, fDict]) => {
            //for future use?
            // var isActive = (props.selectedFrame === fName);
            return (
                <div key={fName} className={'frameEntry'}>
                    <FrameViewD3 
                        data={fDict} 
                        frameName={fName} 
                        appProps={props}
                    />
                </div>
            )
        }
        var newFrameList = Object.entries(frameData).map((f,d) => makeFrameEntry(f,d));
        setFrameList(newFrameList)
    },
    [frameData])

    return (
        <div>
            {frameList}
        </div>
    )
}