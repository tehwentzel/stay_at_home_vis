import './App.css';
import * as constants from './modules/Constants.js';
import DataService from './modules/DataService';
import Utils from './modules/Utils';

function App() {
  var api = new DataService()
  api.test();
  return (
    <div className="App">
    </div>
  );
}

export default App;
