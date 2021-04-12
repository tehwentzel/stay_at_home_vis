import React, {useState, useEffect} from 'react';
import Utils from '../modules/Utils.js';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';

export default function DemographicsControlPanel(props){

    const [demographics, setDemographics] = useState(['urm_pct','cvap']);

    const [dropDowns, setDropDowns] = useState(['','','']);

    function handleSelectVar(event, varName, varPos){
        if(props.selectedDemographics === undefined){ return }
        var newDemList = [...props.selectedDemographics];
        if(props.selectedDemographics.length < varPos){
            newDemList.push(varName);
            props.setSelectedDemographics(newDemList);
            props.setBrushedCountyGroupNum(-1);
        } 
        else{
            if(varName === 'None'){
                newDemList.splice(varPos,1);
            }
            else{
                var oldDemographic = props.selectedDemographics[varPos];
                if(oldDemographic !== varName){
                    newDemList[varPos] = varName;
                }
            }
            props.setSelectedDemographics(newDemList);
            props.setBrushedCountyGroupNum(-1);
        }
        
    }

    const fetchDemographics = async () => {
        const res = await props.api.getValidDemographics();
        console.log('demographics', res);
        setDemographics(res);
    }

    useEffect(() => {
        fetchDemographics();
    },[])

    useEffect(() =>{
        if(demographics === undefined || demographics.length < 1){ return; }
        console.log('buttons!', demographics)
        var varList = ['Primary', 'Secondary','Tertiary']
        var dropDowns = varList.map((string,idx) =>{
            var optionsList = [...demographics];
            optionsList.unshift('None');
            var options = optionsList.map((d) => {
                return (
                    <Dropdown.Item value={d} eventKey={d} onClick={(e) => handleSelectVar(e,d,idx)}>{Utils.getVarDisplayName(d)}</Dropdown.Item> 
                )
            });
            console.log(options);
            var buttonText = string + ' Demographic';
            if(props.selectedDemographics.length >= idx){
                buttonText = Utils.getVarDisplayName(props.selectedDemographics[idx])
            }
            return (
                <Col md={3} className={'controlPanelCol noGutter'}>
                    <DropdownButton className={'controlDropdownButton'} title={buttonText}>
                        {options}
                    </DropdownButton>
                </Col>
            )
        })
        setDropDowns(dropDowns)
    },[demographics, props.selectedDemographics])

    return (
    <Row className={'controlPanel noGutter'} md={12}>
        <Col md={3} className={'noGutter'}><p className={'titleText noGutter'}>Select Demographics:</p></Col>
        {dropDowns}
    </Row>
    )
}
