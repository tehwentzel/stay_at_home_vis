import './App.css';

import React, {useState, useEffect} from 'react';
import * as constants from './modules/Constants.js';
import DataService from './modules/DataService';
import ColorManager from './modules/ColorManager';
import useWindowSize from "./modules/useWindowSize";
import Utils from './modules/Utils';

import FrameView from './components/FrameView/FrameView.js';
import TimelineView from './components/TimelineView/TimelineView.js';
import CountyView from './components/CountyView/CountyView.js';
import ClusterView from './components/ClusterView/ClusterView.js';
import DemographicsControlPanel from './components/DemographicsControlPanel.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function App() {
  var api = new DataService();
  var colorManager = new ColorManager();
  api.test();

  //main frame to focus on for details
  const [selectedFrame, setSelectedFrame] = useState('Care') //will change in the future
  //list of GEOIDs for the counties in the county cluster hat is active
  //list of demographic features to use for the county and the map
  const [selectedDemographics, setSelectedDemographics] = useState(['net_dem_president_votes','urm_pct','urm_pct']);
  //amount of days to aggregate in each "step" in the timleine view
  const [timelineWindowLength, setTimelineWindowLength] = useState(1);
  const [geoidGroupMap, setGeoidGroupMap] = useState({});
  const [brushedCountyGroupNum, setBrushedCountyGroupNum] = useState(-1);


  return (
    <div className="App">
      <Container fluid={'true'}>
        <Row md={12}>
          <Col id={'navBar'} lg={12}>
            Header
          </Col>
        </Row>
        <Row id={'topRow'} className={'vizRow'} lg={12}>
          <Col id={'frameviewWindow'} className={'vizComponent'} lg={4}>
            <FrameView
              api={api}
              colorManager={colorManager}
              selectedFrame={selectedFrame}
              setSelectedFrame={setSelectedFrame}
            ></FrameView>
          </Col>
          <Col id={'timelineviewWindow'} className={'vizComponent'} lg={8}>
            <TimelineView
              api={api}
              colorManager={colorManager}
              selectedFrame={selectedFrame}
              timelineWindowLength={timelineWindowLength}
              setTimelineWindowLength={setTimelineWindowLength}
              setBrushedCountyGroupNum={setBrushedCountyGroupNum}
              brushedCountyGroupNum={brushedCountyGroupNum}
              geoidGroupMap={geoidGroupMap}
            ></TimelineView>
          </Col>          
        </Row>
        <Row id={'bottomRow'} className={'vizRow'} lg={12}>
          <Col id={'mapviewWindow'} className={'vizComponent'} lg={6}>
            <CountyView
              api={api}
              geoidGroupMap={geoidGroupMap}
              colorManager={colorManager}
              brushedCountyGroupNum={brushedCountyGroupNum}
              setBrushedCountyGroupNum={setBrushedCountyGroupNum}
              selectedDemographics={selectedDemographics}
              setSelectedDemographics={setSelectedDemographics}
              selectedFrame={selectedFrame}
            ></CountyView>
          </Col>
          <Col id={'clusterviewWindow'} className={'vizComponent'} md={6}>
            <Row id={'demographicsControlPanelWindow'} md={12}>
              <DemographicsControlPanel
                api={api}
                setSelectedDemographics={setSelectedDemographics}
                selectedDemographics={selectedDemographics}
                setBrushedCountyGroupNum={setBrushedCountyGroupNum}
              ></DemographicsControlPanel>
            </Row>
            <Row md={12} id={'clusterVizWindow'}>
              <ClusterView
                api={api}
                colorManager={colorManager}
                brushedCountyGroupNum={brushedCountyGroupNum}
                setBrushedCountyGroupNum={setBrushedCountyGroupNum}
                selectedDemographics={selectedDemographics}
                setSelectedDemographics={setSelectedDemographics}
                selectedFrame={selectedFrame}
                setGeoidGroupMap={setGeoidGroupMap}
              ></ClusterView>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
