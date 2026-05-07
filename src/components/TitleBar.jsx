import React from 'react'

const iconPath = '../build/icon.png'

export default function TitleBar() {
  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <img className="title-bar-icon" src={iconPath} alt="" draggable={false} />
        <span className="title-bar-title">米游：抽卡统计</span>
      </div>
      <div className="title-bar-buttons">
        <button className="title-bar-btn" onClick={() => window.electronAPI.windowMinimize()}>
          ─
        </button>
        <button className="title-bar-btn" onClick={() => window.electronAPI.windowMaximize()}>
          □
        </button>
        <button className="title-bar-btn close" onClick={() => window.electronAPI.windowClose()}>
          ✕
        </button>
      </div>
    </div>
  )
}
