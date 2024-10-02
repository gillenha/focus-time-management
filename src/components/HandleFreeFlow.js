import React from 'react';
import './HandleFreeFlow.css';

function HandleFreeFlow({ onToggle, isFreeflowActive }) {
  return (
    <div className="navbar">
      <button className="freeflow-button" onClick={onToggle}>
        {isFreeflowActive ? "End Freeflow" : "Begin Freeflow"}
      </button>
    </div>
  );
}

export default HandleFreeFlow;
