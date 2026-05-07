import React from 'react'
import zzzIcon from '../assets/ZZZ_icon/9.ico'
import genshinIcon from '../assets/GenShin_icon/9.ico'

export default function GameSelector({ currentGame, onGameChange }) {
  return (
    <div className="game-selector">
      <button
        className={`game-btn ${currentGame === 'zzz' ? 'active' : ''}`}
        onClick={() => onGameChange('zzz')}
        aria-label="绝区零"
      >
        <img src={zzzIcon} alt="绝区零" />
      </button>
      <button
        className={`game-btn ${currentGame === 'genshin' ? 'active' : ''}`}
        onClick={() => onGameChange('genshin')}
        aria-label="原神"
      >
        <img src={genshinIcon} alt="原神" />
      </button>
    </div>
  )
}
