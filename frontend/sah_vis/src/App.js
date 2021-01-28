import './App.css';

import React, {useState, useEffect} from 'react';
import * as constants from './modules/Constants.js';
import DataService from './modules/DataService';
import Utils from './modules/Utils';

import FrameView from './components/FrameView/FrameView.js';
import TimelineView from './components/TimelineView/TimelineView.js';
import CountyView from './components/CountyView/CountyView.js';
import ClusterView from './components/ClusterView/ClusterView.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function App() {
  var api = new DataService();
  api.test();

  const [selectedMonth, setSelectedMonth] = useState(3) //month is an integer for now 
  const [selectedFrame, setSelectedFrame] = useState('Authority') //will change in the future
  const [brushedTweets, setBrushedTweets] = useState([])

  return (
    <div className="App">
      <Container fluid>
        <Row md={12}>
          <Col id={'navBar'} lg={12}>
            Header
          </Col>
        </Row>
        <Row fluid id={'topRow'} className={'vizRow'} lg={12}>
          <Col id={'frameviewWindow'} className={'vizComponent'} lg={4}>
            <FrameView
              api={api}
              selectedFrame={selectedFrame}
              setSelectedFrame={setSelectedFrame}
            ></FrameView>
          </Col>
          <Col id={'clusterviewWindow'} className={'vizComponent'} md={8}>
            <ClusterView
              api={api}
            ></ClusterView>
          </Col>
        </Row>
        <Row fluid id={'bottomRow'} className={'vizRow'} lg={12}>
          <Col id={'mapviewWindow'} className={'vizComponent'} lg={5}>
            <CountyView
              api={api}
            ></CountyView>
          </Col>
          <Col id={'timelineviewWindow'} className={'vizComponent'} lg={7}>
            <TimelineView
              api={api}
            ></TimelineView>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
