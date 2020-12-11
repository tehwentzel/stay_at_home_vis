import React from 'react';
import './App.css';
import { Route } from 'react-router-dom';



function App() {
  console.log('App start', this)

  return (
    <div className='App container'>
      <div id='controlBar' className='grid-item'>

      </div>
      <div id='topLeft' className='grid-item'>

      </div>
      <div id='topRight' className='grid-item'>

      </div>
      <div id='bottomLeft' className='grid-item'>

      </div>
      <div id='bottomRight' className='grid-item'>

      </div>
    </div>
  );
}

export default App;
